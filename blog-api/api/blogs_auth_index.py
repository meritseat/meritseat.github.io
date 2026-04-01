"""
api/index.py — MeritSeat Blog API (Vercel Python / Flask)

Routes:
  GET  /api/auth/github      → redirect to GitHub OAuth
  GET  /api/auth/callback    → exchange code for token, redirect back to site
  POST /api/submit-blog      → create branch + PR on GitHub
"""
import base64
import json
import os
import re
import secrets
import urllib.parse
from datetime import date, datetime

import requests as http
from flask import Flask, jsonify, redirect, request

# ── App ───────────────────────────────────────────────────────────────────────

app = Flask(__name__)

# ── Config ────────────────────────────────────────────────────────────────────

SITE_URL    = os.environ.get("SITE_URL", "https://meritseat.in")
OWNER       = os.environ.get("GITHUB_REPO_OWNER", "")
REPO        = os.environ.get("GITHUB_REPO_NAME", "")
REVIEWER    = os.environ.get("REVIEWER_GITHUB_USERNAME", "")
API_BASE    = os.environ.get("API_BASE_URL", "")
BASE_BRANCH = "main"
GH_API      = "https://api.github.com"
GH_TOKEN_URL = "https://github.com/login/oauth/access_token"

CAT_CONFIG = {
    "college": {
        "emoji": "🏫", "label": "College Blogs",
        "accent": "#2196f3", "accent_bg": "rgba(33,150,243,0.12)",
        "text_color": "#2196f3", "badge_class": "badge-blue",
    },
    "study": {
        "emoji": "📖", "label": "Study Blogs",
        "accent": "#4caf50", "accent_bg": "rgba(76,175,80,0.12)",
        "text_color": "#4caf50", "badge_class": "badge-green",
    },
    "career": {
        "emoji": "💼", "label": "Career Blogs",
        "accent": "#9c27b0", "accent_bg": "rgba(156,39,176,0.12)",
        "text_color": "#b366d4", "badge_class": "badge-purple",
    },
}

# ── CORS (applied to every response) ─────────────────────────────────────────

@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"]  = SITE_URL
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

# ─────────────────────────────────────────────────────────────────────────────
# Route 1: GitHub OAuth — redirect browser to GitHub's authorization page
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/auth/github")
def auth_github():
    state  = request.args.get("state", secrets.token_hex(16))
    params = urllib.parse.urlencode({
        "client_id":    os.environ.get("GITHUB_CLIENT_ID", ""),
        "redirect_uri": f"{API_BASE}/api/auth/callback",
        "scope":        "public_repo",
        "state":        state,
    })
    return redirect(f"https://github.com/login/oauth/authorize?{params}")

# ─────────────────────────────────────────────────────────────────────────────
# Route 2: OAuth callback — exchange code for token, redirect back to writer
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/auth/callback")
def auth_callback():
    code  = request.args.get("code",  "")
    state = request.args.get("state", "")
    error = request.args.get("error", "")

    if error or not code:
        return redirect(f"{SITE_URL}/blog/write/?auth_error={error or 'no_code'}")

    try:
        # Exchange code → access token
        token_res = http.post(
            GH_TOKEN_URL,
            json={
                "client_id":     os.environ.get("GITHUB_CLIENT_ID", ""),
                "client_secret": os.environ.get("GITHUB_CLIENT_SECRET", ""),
                "code":          code,
            },
            headers={"Accept": "application/json"},
            timeout=10,
        )
        token_data = token_res.json()

        if "error" in token_data:
            return redirect(
                f"{SITE_URL}/blog/write/?auth_error={token_data['error']}"
            )

        token = token_data.get("access_token", "")

        # Fetch authenticated user profile
        user_res = http.get(
            f"{GH_API}/user",
            headers=_gh_headers(token),
            timeout=10,
        )
        user = user_res.json()

        params = urllib.parse.urlencode({
            "token":    token,
            "gh_user":  user.get("login", ""),
            "gh_name":  user.get("name") or user.get("login", ""),
            "gh_email": user.get("email") or "",
            "state":    state,
        })
        return redirect(f"{SITE_URL}/blog/write/?{params}")

    except Exception as exc:
        print(f"OAuth callback error: {exc}")
        return redirect(f"{SITE_URL}/blog/write/?auth_error=server_error")

# ─────────────────────────────────────────────────────────────────────────────
# Route 3: Submit blog — full GitHub automation
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/submit-blog", methods=["POST", "OPTIONS"])
def submit_blog():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    data = request.get_json(force=True, silent=True) or {}

    token    = data.get("token", "").strip()
    category = data.get("category", "").strip()
    title    = data.get("title", "").strip()
    slug     = data.get("slug", "").strip()
    author   = data.get("author", "").strip()
    email    = data.get("email", "").strip()
    meta     = data.get("metaDescription", "").strip()
    lead     = data.get("leadText", "").strip()
    sections = data.get("sections", [])
    images   = data.get("images", [])
    reading  = int(data.get("readingTime", 5))

    if not all([token, category, title, slug]):
        return jsonify({"error": "Missing required fields: token, category, title, slug"}), 400

    if category not in CAT_CONFIG:
        return jsonify({"error": f"Invalid category: {category}"}), 400

    try:
        ts     = int(datetime.now().timestamp())
        branch = f"blog/{category}/{slug}-{ts}"

        # 1. Get HEAD SHA of main branch
        ref = _gh_get(f"/repos/{OWNER}/{REPO}/git/ref/heads/{BASE_BRANCH}", token)
        if "object" not in ref:
            raise RuntimeError(f"Cannot read '{BASE_BRANCH}' branch: {ref}")
        base_sha = ref["object"]["sha"]

        # 2. Create new branch
        _gh_post(f"/repos/{OWNER}/{REPO}/git/refs", token, {
            "ref": f"refs/heads/{branch}",
            "sha": base_sha,
        })

        # 3. Commit blog post HTML
        post_path = f"blog/{category}/{slug}/index.html"
        post_html = _generate_html(
            category, title, slug, author, meta, lead,
            sections, reading, images,
        )
        _commit_text(post_path, post_html,
                     f"[Blog] Add post: {title}", branch, token)

        # 4. Commit images
        for img in images:
            name = img.get("name", "")
            b64  = img.get("base64", "")
            if name and b64:
                safe = re.sub(r"[^a-zA-Z0-9._-]", "_", name)
                _commit_b64(
                    f"blog/images/{slug}/{safe}", b64,
                    f"[Blog] Add image: {name}", branch, token,
                )

        # 5. Update sitemap.xml
        _update_sitemap(category, slug, branch, token)

        # 6. Prepend post card to category listing
        _update_listing(category, slug, title, author, meta, reading, branch, token)

        # 7. Create Pull Request
        today = f"{date.today().day} {date.today().strftime('%B %Y')}"
        pr = _gh_post(f"/repos/{OWNER}/{REPO}/pulls", token, {
            "title": f"[Blog] {title}",
            "body":  _pr_body(category, title, author, email, slug, today),
            "head":  branch,
            "base":  BASE_BRANCH,
        })
        if "number" not in pr:
            raise RuntimeError(f"PR creation failed: {pr}")

        # 8. Request reviewer
        if REVIEWER:
            _gh_post(
                f"/repos/{OWNER}/{REPO}/pulls/{pr['number']}/requested_reviewers",
                token, {"reviewers": [REVIEWER]},
            )

        return jsonify({
            "success":  True,
            "prUrl":    pr.get("html_url", ""),
            "prNumber": pr["number"],
            "branch":   branch,
        }), 200

    except Exception as exc:
        print(f"Blog submission error: {exc}")
        return jsonify({"error": str(exc) or "Submission failed"}), 500

# ── GitHub API helpers ────────────────────────────────────────────────────────

def _gh_headers(token: str) -> dict:
    return {
        "Authorization":        f"Bearer {token}",
        "Accept":               "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

def _gh_get(path: str, token: str, **kwargs) -> dict:
    r = http.get(f"{GH_API}{path}", headers=_gh_headers(token), timeout=15, **kwargs)
    return r.json()

def _gh_post(path: str, token: str, body: dict) -> dict:
    r = http.post(f"{GH_API}{path}", headers=_gh_headers(token), json=body, timeout=15)
    return r.json()

def _gh_put(path: str, token: str, body: dict) -> dict:
    r = http.put(f"{GH_API}{path}", headers=_gh_headers(token), json=body, timeout=15)
    return r.json()

def _get_file(path: str, branch: str, token: str):
    safe = urllib.parse.quote(path, safe="")
    r = http.get(
        f"{GH_API}/repos/{OWNER}/{REPO}/contents/{safe}?ref={branch}",
        headers=_gh_headers(token), timeout=15,
    )
    return r.json() if r.status_code == 200 else None

def _commit_text(path: str, text: str, msg: str, branch: str, token: str):
    existing = _get_file(path, branch, token)
    encoded  = base64.b64encode(text.encode("utf-8")).decode("ascii")
    body     = {"message": msg, "content": encoded, "branch": branch}
    if existing and "sha" in existing:
        body["sha"] = existing["sha"]
    safe = urllib.parse.quote(path, safe="")
    _gh_put(f"/repos/{OWNER}/{REPO}/contents/{safe}", token, body)

def _commit_b64(path: str, b64: str, msg: str, branch: str, token: str):
    existing = _get_file(path, branch, token)
    body     = {"message": msg, "content": b64, "branch": branch}
    if existing and "sha" in existing:
        body["sha"] = existing["sha"]
    safe = urllib.parse.quote(path, safe="")
    _gh_put(f"/repos/{OWNER}/{REPO}/contents/{safe}", token, body)

def _update_sitemap(category: str, slug: str, branch: str, token: str):
    f = _get_file("sitemap.xml", branch, token)
    if not f:
        return
    current   = base64.b64decode(f["content"].replace("\n", "")).decode("utf-8")
    today     = date.today().strftime("%Y-%m-%d")
    new_entry = (
        f"\n<url>\n"
        f"  <loc>{SITE_URL}/blog/{category}/{slug}/</loc>\n"
        f"  <lastmod>{today}T00:00:00+00:00</lastmod>\n"
        f"  <priority>0.60</priority>\n"
        f"</url>"
    )
    updated = current.replace("</urlset>", f"{new_entry}\n</urlset>")
    encoded = base64.b64encode(updated.encode("utf-8")).decode("ascii")
    _gh_put(f"/repos/{OWNER}/{REPO}/contents/sitemap.xml", token, {
        "message": f"[Blog] Update sitemap for /blog/{category}/{slug}/",
        "content": encoded, "branch": branch, "sha": f["sha"],
    })

def _update_listing(category: str, slug: str, title: str, author: str,
                    excerpt: str, reading: int, branch: str, token: str):
    path = f"blog/{category}/index.html"
    f    = _get_file(path, branch, token)
    if not f:
        return
    current = base64.b64decode(f["content"].replace("\n", "")).decode("utf-8")
    cat     = CAT_CONFIG[category]
    today   = f"{date.today().day} {date.today().strftime('%B %Y')}"
    clean   = _esc(excerpt or "")[:200]
    card    = (
        f'\n    <div class="post-card">\n'
        f'      <span class="badge {cat["badge_class"]}">{cat["emoji"]} {category.capitalize()} Blogs</span>\n'
        f'      <h3><a href="/blog/{category}/{slug}/">{_esc(title)}</a></h3>\n'
        f'      <div class="post-meta">\n'
        f'        <span>📅 {today}</span>\n'
        f'        <span>✍️ {_esc(author)}</span>\n'
        f'        <span>⏱️ {reading} min read</span>\n'
        f'      </div>\n'
        f'      <p class="post-excerpt">{clean}</p>\n'
        f'      <a class="read-more-btn" href="/blog/{category}/{slug}/">'
        f'<i data-lucide="arrow-right" style="width:14px;height:14px;"></i> Read More</a>\n'
        f'    </div>\n'
    )
    marker  = "<!-- ADD MORE POST CARDS ABOVE THIS LINE -->"
    updated = current.replace(marker, f"{card}\n    {marker}")
    encoded = base64.b64encode(updated.encode("utf-8")).decode("ascii")
    safe    = urllib.parse.quote(path, safe="")
    _gh_put(f"/repos/{OWNER}/{REPO}/contents/{safe}", token, {
        "message": f"[Blog] Add listing card: {title}",
        "content": encoded, "branch": branch, "sha": f["sha"],
    })

# ── HTML generator ────────────────────────────────────────────────────────────

def _generate_html(category, title, slug, author, meta,
                   lead, sections, reading, images):
    cat   = CAT_CONFIG.get(category, CAT_CONFIG["college"])
    today = f"{date.today().day} {date.today().strftime('%B %Y')}"

    sections_html = ""
    for s in sections:
        h  = (s.get("heading") or "").strip()
        b  = (s.get("body")    or "").strip()
        hl = (s.get("highlight") or "").strip()
        if h or b:
            paras    = "\n".join(
                f"<p>{_esc(p.strip())}</p>" for p in b.split("\n\n") if p.strip()
            )
            hl_block = (
                f'<div class="blog-highlight">'
                f"<strong>💡 Key Insight:</strong> {_esc(hl)}</div>"
            ) if hl else ""
            sections_html += f"<h2>{_esc(h)}</h2>\n{paras}\n{hl_block}\n"

    imgs_html = ""
    for img in images:
        name = img.get("name", "")
        if name:
            safe = re.sub(r"[^a-zA-Z0-9._-]", "_", name)
            imgs_html += (
                f'<img src="/blog/images/{slug}/{_esc(safe)}" '
                f'alt="{_esc(name)}" '
                f'style="max-width:100%;border-radius:8px;margin:0.8rem 0 1.2rem;">\n'
            )

    # Note: {{ }} inside f-strings produce literal { } in the output
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <link rel="canonical" href="{SITE_URL}/blog/{category}/{slug}/" />
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-VH4LF10RKB"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{dataLayer.push(arguments);}}
    gtag('js', new Date());
    gtag('config', 'G-VH4LF10RKB');
  </script>
  <meta charset="UTF-8">
  <title>{_esc(title)} | {cat['label']} | MeritSeat.in</title>
  <meta name="description" content="{_esc(meta)}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@latest"></script>
  <link rel="icon" href="/fevicon.ico" type="image/x-icon">
  <link rel="apple-touch-icon" type="image/png" sizes="180x180" href="/favicon-180x180.png">
  <link rel="stylesheet" href="/style.css">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6236248589959486" crossorigin="anonymous"></script>
  <style>
    :root {{
      --accent:      {cat['accent']};
      --accent-bg:   {cat['accent_bg']};
      --accent-text: {cat['text_color']};
    }}
    .breadcrumb {{ font-size:.85rem; color:#aaa; margin-bottom:1.5rem; }}
    .breadcrumb a {{ color:var(--accent-text); }}
    .breadcrumb span {{ margin:0 6px; }}
    .post-badge {{
      display:inline-block; padding:4px 12px; border-radius:20px;
      font-size:.78rem; font-weight:600; margin-bottom:1rem;
      background:var(--accent-bg); color:var(--accent-text); border:1px solid var(--accent);
    }}
    .post-title {{
      font-size:1.8rem; font-weight:600; color:#fff;
      line-height:1.3; margin:0 0 1rem; text-align:left;
    }}
    .post-meta {{
      display:flex; flex-wrap:wrap; gap:1rem; font-size:.85rem; color:#888;
      margin-bottom:1.5rem; padding-bottom:1rem; border-bottom:1px solid #333;
    }}
    .lead-text {{
      font-size:1.05rem; color:#ccc; line-height:1.8; margin-bottom:1.5rem;
      font-style:italic; border-left:3px solid var(--accent); padding-left:1rem;
    }}
    .post-body h2 {{
      font-size:1.3rem; color:#fff; margin:2rem 0 .8rem;
      padding-bottom:.4rem; border-bottom:1px solid #333; text-align:left;
    }}
    .post-body p {{ color:#ccc; line-height:1.8; margin-bottom:1rem; }}
    .blog-highlight {{
      background:var(--accent-bg); border:1px solid var(--accent);
      border-radius:10px; padding:1rem 1.2rem; margin:1.2rem 0; color:#e0e0e0;
    }}
    .blog-highlight strong {{ color:var(--accent-text); }}
    .post-footer {{
      margin-top:2.5rem; padding-top:1.5rem; border-top:1px solid #333;
      display:flex; justify-content:space-between; align-items:center;
      flex-wrap:wrap; gap:1rem;
    }}
    .back-btn {{
      display:inline-flex; align-items:center; gap:6px;
      padding:8px 18px; background:var(--accent-bg); color:var(--accent-text);
      border:1px solid var(--accent); border-radius:8px; font-size:.85rem;
      font-weight:600; text-decoration:none; transition:all .25s ease;
      width:auto; margin-top:0;
    }}
    .back-btn:hover {{ background:var(--accent); color:#fff; transform:none; }}
    @media(max-width:768px) {{
      .post-title {{ font-size:1.3rem; }}
      .lead-text  {{ font-size:.95rem; }}
    }}
  </style>
</head>
<body class="dark">
  <nav class="navbar">
    <div class="nav-left">
      <img src="/resources/meritseat-logo.png" height="50" width="50"
           alt="Merit Seat Logo" class="nav-logo">
      <span class="site-title">Merit Seat</span>
    </div>
    <div class="burger" id="burger">&#9776;</div>
    <div class="nav-links" id="nav-links">
      <a href="/">Home</a>
      <a href="/tnea-seat-prediction/cutoff-search">Cutoff-Predictor</a>
      <a href="/tnea-seat-prediction/rank-search">Rank-Predictor</a>
      <a href="/blog">Blog</a>
      <a href="/about">About</a>
    </div>
  </nav>

  <div class="container">
    <div class="breadcrumb">
      <a href="/">Home</a><span>›</span>
      <a href="/blog/">Blog</a><span>›</span>
      <a href="/blog/{category}/">{cat['label']}</a><span>›</span>
      {_esc(title)}
    </div>
    <span class="post-badge">{cat['emoji']} {cat['label']}</span>
    <h1 class="post-title">{_esc(title)}</h1>
    <div class="post-meta">
      <span>📅 {today}</span>
      <span>✍️ {_esc(author)}</span>
      <span>⏱️ {reading} min read</span>
    </div>
    <div class="post-body">
      <p class="lead-text">{_esc(lead)}</p>
      {imgs_html}
      {sections_html}
      <h2>Conclusion</h2>
      <p>
        Thank you for reading. Explore the
        <a href="/blog/" style="color:var(--accent-text)">MeritSeat Blog</a>
        or use our
        <a href="/" style="color:var(--accent-text)">seat predictor tools</a>.
      </p>
    </div>
    <div class="post-footer">
      <a class="back-btn" href="/blog/{category}/">
        <i data-lucide="arrow-left" style="width:14px;height:14px;"></i>
        Back to {cat['label']}
      </a>
      <a class="back-btn" href="/blog/">
        <i data-lucide="layout-grid" style="width:14px;height:14px;"></i>
        All Categories
      </a>
    </div>
  </div>

  <ins class="adsbygoogle" style="display:block"
    data-ad-format="fluid" data-ad-layout-key="-er-29-16-82+yx"
    data-ad-client="ca-pub-6236248589959486" data-ad-slot="2150554952"></ins>
  <script>(adsbygoogle = window.adsbygoogle || []).push({{}});</script>

  <script>
    lucide.createIcons();
    document.addEventListener("DOMContentLoaded", function () {{
      const burger   = document.getElementById("burger");
      const navLinks = document.getElementById("nav-links");
      if (burger && navLinks) {{
        burger.addEventListener("click", () => {{ navLinks.classList.toggle("show"); }});
        document.addEventListener("click", function (e) {{
          if (navLinks.classList.contains("show") &&
              !navLinks.contains(e.target) && !burger.contains(e.target)) {{
            navLinks.classList.remove("show");
          }}
        }});
      }}
    }});
  </script>
</body>
</html>"""

# ── Utilities ─────────────────────────────────────────────────────────────────

def _esc(s: str) -> str:
    return (
        str(s or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )

def _pr_body(category, title, author, email, slug, today) -> str:
    return (
        "## 📝 New Blog Submission\n\n"
        "| Field | Value |\n|---|---|\n"
        f"| **Category** | {category} |\n"
        f"| **Author** | {author} |\n"
        f"| **Email** | {email} |\n"
        f"| **Post URL** | /blog/{category}/{slug}/ |\n"
        f"| **Submitted** | {today} |\n\n"
        "*Submitted via MeritSeat Blog Writer*\n\n"
        "### Review Checklist\n"
        "- [ ] Content is accurate and helpful\n"
        "- [ ] No major spelling or grammar errors\n"
        "- [ ] Appropriate for Tamil Nadu engineering students\n"
        "- [ ] Images are appropriate (if any)\n"
    )
