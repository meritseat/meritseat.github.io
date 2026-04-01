# MeritSeat.in — Project Documentation for AI Assistants

## Project Overview

**MeritSeat.in** is a static, GitHub Pages-hosted website that helps Tamil Nadu engineering students predict college admission possibilities based on their TNEA (Tamil Nadu Engineering Admissions) cutoff marks or ranks. The core philosophy is: *merit — not money — should decide who gets the seat.*

- **Live URL**: https://meritseat.in
- **GitHub Repo**: `meritseat/meritseat.github.io`
- **Hosting**: GitHub Pages (static files only — no server, no build step, no framework)
- **Custom Domain**: Configured via `CNAME` → `meritseat.in`
- **Founder**: Dhileephan Ravindran

---

## Tech Stack

| Layer | Technology |
|---|---|
| Structure | Vanilla HTML5 |
| Styling | Vanilla CSS (`style.css`) |
| Logic | Vanilla JavaScript (`script.js`) |
| CSV Parsing | [PapaParse](https://www.papaparse.com/) (loaded via CDN in tool pages) |
| Icons | [Lucide](https://lucide.dev/) (via `unpkg` CDN) |
| Fonts | Google Fonts — `Inter` (400, 600) |
| Analytics | Google Analytics 4 (`G-VH4LF10RKB`) |
| Ads | Google AdSense (`ca-pub-6236248589959486`) |

> **No build tools, No npm, No framework.** Everything is plain HTML/CSS/JS. When adding new features, maintain this static-site approach.

---

## Directory Structure

```
meritseat.github.io/
│
├── index.html                   # Homepage — welcome + tool links + notification bar
├── style.css                    # Global stylesheet (shared across all pages)
├── script.js                    # Core JS — CSV loading, search/filter logic
├── CNAME                        # Custom domain: meritseat.in
├── sitemap.xml                  # SEO sitemap
├── ads.txt                      # Google AdSense verification
├── fevicon.ico                  # Favicon (ICO)
├── favicon-180x180.png          # Apple touch icon
├── googlee452096526361f93.html  # Google Search Console verification
│
├── about/
│   └── index.html               # About page — mission, founder, vision
│
├── tnea-seat-prediction/
│   ├── cutoff-search/
│   │   └── index.html           # Cutoff-based seat predictor page
│   └── rank-search/
│       └── index.html           # Rank-based seat predictor page
│
├── cutoff-calculator/
│   └── index.html               # TNEA cutoff mark calculator tool
│
├── resources/
│   ├── meritseat-logo.png       # Main logo (used in nav + header)
│   ├── anna-univ-symbol.png     # Anna University logo (used on tool cards)
│   ├── calculator.png           # Calculator icon (used on calculator card)
│   └── ...                      # Other brand assets
│
└── data/
    ├── 2020_tnea_cutoff_data.csv  # Historical cutoff data by year
    ├── 2021_tnea_cutoff_data.csv
    ├── 2022_tnea_cutoff_data.csv
    ├── 2023_tnea_cutoff_data.csv
    ├── 2024_tnea_cutoff_data.csv  # Active dataset for predictions
    ├── 2020_tnea_rank_data.csv    # Historical rank data by year
    ├── ...
    ├── 2024_tnea_rank_data.csv    # Active dataset for rank predictions
    ├── college_list_w_district.csv # College code → name + district mapping
    ├── branch_list.csv             # Branch code → branch name mapping
    ├── district_list.csv           # List of all districts
    ├── college_code_list.csv       # College codes list
    ├── data_cleanser.py            # Python script to clean raw CSV data
    └── cleansed/                   # Cleaned CSVs used at runtime
        ├── 2024_tnea_cutoff_data.csv
        └── 2024_tnea_rank_data.csv
```

---

## Design System

### Colors (Dark Theme — default)

| Token | Value | Usage |
|---|---|---|
| Background | `#121212` | `<body>` |
| Surface | `#1f1f1f` | `.container`, notification bar |
| Navbar BG | `#1e1e1e` | `.navbar`, `header` |
| Border | `#333` / `#555` | Dividers, inputs |
| Table cell | `#232323` | `th`, `td` |
| Primary text | `#e0e0e0` / `#ffffff` | Body / headings |
| Accent Blue | `#2196f3` | Links hover, focus glow, blockquote border |
| Accent Orange | `rgba(240, 147, 71, 0.984)` | Buttons (CTA) |
| Button hover | `rgb(240, 114, 12)` | |
| Blue link text | `#6dacffe2` | `.blueS` helper class (About page) |
| Table row hover | `#db6918` | Orange hover on table rows |
| Dark surface hover | `#2a2a2a` | `.grey_con:hover` |

### Typography

- **Primary Font**: `Inter` (Google Fonts) — used site-wide
- **Secondary Font**: `Segoe UI` — used for headings inside `.container`
- `h2` inside containers: `1.65rem`, `font-weight: 600`, centered

### Key UI Components

- **`.container`** — Max-width card (`50rem` desktop), `1f1f1f` background, `16px` border-radius, blue glow box-shadow, `fadeIn` animation.
- **`.navbar`** — Sticky top bar with logo + nav links; collapses to burger menu on mobile.
- **`.tnea-link`** — Clickable container card with logo, heading, and orange CTA button; highlights blue on hover.
- **`.notification-bar`** — Full-width scrolling announcement ticker using CSS `scrollLeft` animation.
- **`button`** — Orange, bold, flex-centered; uses Lucide icons as leading icon.
- **`blockquote`** — Left-bordered (`#2196f3`), dark grey background, italic text.

### Animations

```css
@keyframes fadeIn    /* container entrance: fade + slide from top */
@keyframes slideUp   /* results section: slide from bottom */
@keyframes fadeInList /* list items: staggered fade-in */
@keyframes scrollLeft /* notification bar ticker */
```

### Responsive Breakpoints

| Breakpoint | Behaviour |
|---|---|
| `≤ 1200px` | Container shrinks to 80%, burger menu appears, smaller fonts |
| `≤ 768px` | Container 90%, even smaller fonts and table cells |

---

## Page Anatomy (Shared Pattern)

Every page follows this structure:

```html
<head>
  <!-- Google Analytics -->
  <!-- Meta charset, title, description, viewport -->
  <!-- Google Fonts: Inter -->
  <!-- Lucide icons CDN -->
  <!-- Favicons -->
  <!-- /style.css -->
  <!-- AdSense script -->
</head>
<body class="dark">
  <nav class="navbar">  <!-- Logo + nav links + burger button --> </nav>
  <header>              <!-- Page h1 with logo icon -->           </header>

  <!-- Page-specific content inside .container divs -->

  <!-- AdSense ins.adsbygoogle block (where applicable) -->

  <script>
    lucide.createIcons();
    /* Burger menu toggle logic */
    /* Page-specific logic */
  </script>
</body>
```

> **Rule**: The burger menu JS is copy-pasted into every page that has a `<nav>`. Keep this pattern consistent.

---

## Core JavaScript Logic (`script.js`)

Used primarily by the TNEA predictor pages. Loaded via `<script src="/script.js">`.

### Data Loading

| Function | Description |
|---|---|
| `loadCutOffCSV()` | Loads `cleansed/2024_tnea_cutoff_data.csv` into `cutoffData[]` |
| `loadRankCSV()` | Loads `cleansed/2024_tnea_rank_data.csv` into `rankData[]` |
| `loadBranchListFromCSV()` | Populates branch `<select>` from `branch_list.csv`; uses `branchMap{}` |
| `loadCollegeListFromCSV()` | Builds `collegeMap{}` (code → name + district) from `college_list_w_district.csv` |
| `loadDistrictListFromCSV()` | Populates district `<select>` from `district_list.csv` |

### Search Functions

| Function | Description |
|---|---|
| `findCollegesByCutoff()` | Filters `cutoffData` by cutoff + optional district/branch/college; renders results table |
| `findCollegesByRank()` | Filters `rankData` by rank + optional filters; renders results table |
| `getPossibilityColor(level)` | Maps `HIGH/MEDIUM/LOW` → `green/goldenrod/red` |

### Possibility Logic

- **Cutoff search**: HIGH if `cutoff ≥ row cutoff`; MEDIUM if within `avgcutOffMargin (0.5)`; LOW otherwise
- **Rank search**: HIGH if `rank ≤ row rank`; MEDIUM if within `avgRankMargin (1000)`; LOW otherwise
- Results are capped at `sliceLength = 100` rows

---

## Navigation Links (Current)

| Label | URL |
|---|---|
| Home | `/` |
| Cutoff-Predictor | `/tnea-seat-prediction/cutoff-search` |
| Rank-Predictor | `/tnea-seat-prediction/rank-search` |
| About | `/about` |

---

## Adding New Pages (Convention)

1. Create a new folder: `/<page-name>/index.html`
2. Copy the nav + header + footer script pattern from an existing page
3. Link `/style.css` for global styles; add page-specific `<style>` inline or in a separate `.css` file
4. Add the new link to the `<nav>` on **all existing pages**
5. Update `sitemap.xml` with the new URL

---

## Planned / In-Progress Features

- **Blog Section** — Three categories planned:
  - 📚 College Blogs — Reviews, comparisons, campus life
  - 📖 Study Blogs — Preparation tips, resources
  - 💼 Career Blogs — Career paths, placement guidance
  - Each category: `blog/<category>/index.html` (listing) + `blog/<category>/<slug>/index.html` (post)
- **Multi-university Support** — Predictor for universities beyond TNEA (placeholder on homepage)

---

## SEO Notes

- Each page has a unique `<title>` and `<meta name="description">`
- `sitemap.xml` at root lists all pages
- Google Search Console verified via `googlee452096526361f93.html`
- Domain uses HTTPS via GitHub Pages + CNAME

---

## Development Workflow

Since this is a pure static site:

1. Edit HTML/CSS/JS files directly — no build step needed
2. Test locally by opening files in browser or using a local server:
   ```powershell
   # Simple local server (Python)
   python -m http.server 8080
   # Then visit http://localhost:8080
   ```
3. Commit and push to `main` branch → GitHub Pages auto-deploys
4. Production URL: https://meritseat.in

---

## Do's and Don'ts

| ✅ Do | ❌ Don't |
|---|---|
| Keep all pages in dark theme (`body class="dark"`) | Add framework dependencies (React, Vue, etc.) |
| Use `/style.css` for shared styles | Use inline styles for anything that belongs in CSS |
| Use Lucide icons for UI icons | Introduce new icon libraries |
| Keep CSVs in `/data/cleansed/` for runtime use | Load raw uncleaned CSVs in production JS |
| Follow the nav + header HTML pattern on every page | Create pages without the sticky navbar |
| Use orange (`rgba(240,147,71)`) for primary CTAs | Use random ad-hoc colors outside the design system |
