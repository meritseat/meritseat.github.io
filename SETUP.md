# MeritSeat Blog Submission — One-Time Setup Guide

This document explains how to set up the Automated Blog Submission system.
After following these steps once, writers can submit blogs through the UI at
**https://meritseat.in/blog/write/** without any manual work.

---

## What you need
- Your Vercel account (you already have this ✅)
- A GitHub account with admin access to `meritseat/meritseat.github.io`
- Node.js installed locally (https://nodejs.org)

---

## Step 1 — Find your GitHub Reviewer Username

The PR system needs your GitHub username (not email) to assign you as reviewer.

1. Go to https://github.com
2. Click your profile photo → "Your profile"
3. Your username is shown under your profile picture (e.g., `meritseat`)
4. Note it down — you'll need it in Step 3.

---

## Step 2 — Register a GitHub OAuth App

This gives the site permission to authenticate users with GitHub.

1. Go to https://github.com/settings/developers
2. Click **"OAuth Apps"** → **"New OAuth App"**
3. Fill in:
   - **Application name**: `MeritSeat Blog Writer`
   - **Homepage URL**: `https://meritseat.in`
   - **Authorization callback URL**: `https://meritseat-blog-api.vercel.app/api/auth/callback`
     *(Update this URL after Step 3 once you know your Vercel project URL)*
4. Click **"Register application"**
5. On the next screen, note down:
   - **Client ID** (shown on the page)
   - Click **"Generate a new client secret"** → note down the **Client Secret**

---

## Step 3 — Deploy the Backend to Vercel

The backend lives in the `blog-api/` folder of this repo.

### Option A — Vercel Dashboard (Easiest)
1. Go to https://vercel.com/new
2. Import the `meritseat/meritseat.github.io` repository
3. Change **Root Directory** to `blog-api`
4. Click **Deploy**
5. Once deployed, copy your Vercel project URL (e.g., `https://meritseat-blog-api.vercel.app`)

### Option B — Vercel CLI
```powershell
cd blog-api
npm install
npx vercel --prod
```
Follow the prompts. Copy the deployment URL shown at the end.

---

## Step 4 — Set Environment Variables in Vercel

In the Vercel dashboard for your `blog-api` project:

1. Go to **Settings → Environment Variables**
2. Add the following variables:

| Variable Name | Value |
|---|---|
| `GITHUB_CLIENT_ID` | The Client ID from Step 2 |
| `GITHUB_CLIENT_SECRET` | The Client Secret from Step 2 |
| `GITHUB_REPO_OWNER` | `meritseat` |
| `GITHUB_REPO_NAME` | `meritseat.github.io` |
| `REVIEWER_GITHUB_USERNAME` | Your GitHub username (from Step 1) |
| `SITE_URL` | `https://meritseat.in` |
| `API_BASE_URL` | Your Vercel URL (e.g., `https://meritseat-blog-api.vercel.app`) |

3. Click **Save** and then **Redeploy** the project for changes to take effect.

---

## Step 5 — Update the OAuth Callback URL

Now that you have the Vercel URL:

1. Go back to https://github.com/settings/developers → your OAuth App
2. Update **Authorization callback URL** to:
   `https://YOUR-VERCEL-URL.vercel.app/api/auth/callback`
3. Click **Update application**

---

## Step 6 — Update the Writer Page with your Vercel URL

Open `blog/write/index.html` and update line ~370:

```javascript
// Before:
const VERCEL_API_URL = 'https://YOUR-PROJECT.vercel.app';

// After (replace with your actual URL):
const VERCEL_API_URL = 'https://meritseat-blog-api.vercel.app';
```

Commit and push this change.

---

## Step 7 — Test the System

1. Visit https://meritseat.in/blog/write/
2. Click "Start Writing" → choose a category
3. Click "Login with GitHub" → authorize the app
4. Fill in a test post → click "Submit for Review"
5. Check https://github.com/meritseat/meritseat.github.io/pulls for the PR
6. Verify you are set as the reviewer

---

## How Blog Posts Get Published

```
Writer submits form
      ↓
Vercel API creates branch + PR
      ↓
You receive review notification
      ↓
Review & approve the PR on GitHub
      ↓
Merge → Post goes live automatically on meritseat.in
```

---

## CORS Note

The Vercel backend is configured to only accept requests from `https://meritseat.in`.
Testing locally will fail unless you update the CORS origin in `vercel.json` to also allow `http://localhost:PORT`.

---

## File Reference

```
blog-api/
├── package.json          ← Node.js project config
├── vercel.json           ← Vercel config + CORS headers
└── api/
    ├── auth/
    │   ├── github.js     ← Step 1: Redirects to GitHub OAuth
    │   └── callback.js   ← Step 2: Exchanges code → token
    └── submit-blog.js    ← Step 3: Creates branch, PR, requests reviewer

blog/write/index.html     ← The 6-step writer wizard (frontend)
```
