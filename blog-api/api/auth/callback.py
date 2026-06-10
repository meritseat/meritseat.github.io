"""
api/auth/callback.py
Vercel Python serverless function — exchanges GitHub OAuth code for an access
token, fetches the authenticated user, then redirects back to the blog writer.
"""
import os
import urllib.parse
from http.server import BaseHTTPRequestHandler

import requests

SITE_URL    = os.environ.get("SITE_URL", "https://meritseat.in")
GH_TOKEN    = "https://github.com/login/oauth/access_token"
GH_API      = "https://api.github.com"


class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        code  = params.get("code",  [""])[0]
        state = params.get("state", [""])[0]
        error = params.get("error", [""])[0]

        if error or not code:
            return self._redirect(
                f"{SITE_URL}/blog/write/?auth_error={error or 'no_code'}"
            )

        try:
            # ── 1. Exchange code → token ──────────────────────────────────
            token_res = requests.post(
                GH_TOKEN,
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
                return self._redirect(
                    f"{SITE_URL}/blog/write/?auth_error={token_data['error']}"
                )

            token = token_data.get("access_token", "")

            # ── 2. Fetch authenticated GitHub user ────────────────────────
            user_res = requests.get(
                f"{GH_API}/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept":        "application/vnd.github+json",
                },
                timeout=10,
            )
            user = user_res.json()

            # ── 3. Redirect back to writer page ───────────────────────────
            redirect_params = urllib.parse.urlencode({
                "token":    token,
                "gh_user":  user.get("login", ""),
                "gh_name":  user.get("name") or user.get("login", ""),
                "gh_email": user.get("email") or "",
                "state":    state,
            })
            self._redirect(f"{SITE_URL}/blog/write/?{redirect_params}")

        except Exception as exc:
            print(f"OAuth callback error: {exc}")
            self._redirect(f"{SITE_URL}/blog/write/?auth_error=server_error")

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _redirect(self, url: str):
        self.send_response(302)
        self.send_header("Location", url)
        self.end_headers()

    def log_message(self, fmt, *args):
        pass
