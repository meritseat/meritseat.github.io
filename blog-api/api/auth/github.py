"""
api/auth/github.py
Vercel Python serverless function — redirects the browser to GitHub's OAuth page.
"""
import os
import urllib.parse
import secrets
from http.server import BaseHTTPRequestHandler


class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        state    = params.get("state", [secrets.token_hex(16)])[0]
        api_base = os.environ.get("API_BASE_URL", "")

        auth_params = urllib.parse.urlencode({
            "client_id":    os.environ.get("GITHUB_CLIENT_ID", ""),
            "redirect_uri": f"{api_base}/api/auth/callback",
            "scope":        "public_repo",
            "state":        state,
        })

        self.send_response(302)
        self.send_header("Location",
                         f"https://github.com/login/oauth/authorize?{auth_params}")
        self.end_headers()

    def log_message(self, fmt, *args):
        pass  # suppress default access log noise
