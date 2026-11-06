#!/usr/bin/env python3
"""Minimal static file server that mimics GitHub Pages' file resolution.

GitHub Pages resolves a request like this:

  /foo/bar   -> try /foo/bar as a file
              -> try /foo/bar/index.html
              -> try /foo/bar.html
              -> otherwise serve /404.html with HTTP 404

`python3 -m http.server` does none of that, so it is useless for checking
the routing of this site. This server implements the rules above.

Usage:
    python3 tests/pages-server.py [root] [port]
"""
import os
import posixpath
import sys
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8765

TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json",
    ".xml": "application/xml; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".png": "image/png",
    ".svg": "image/svg+xml",
}


def find_404(url_path):
    """Locate the 404 page the way GitHub Pages does: walk up from the
    requested directory until a 404.html is found, so a site mounted in a
    sub-directory still serves its own error page."""
    path = urllib.parse.unquote(url_path)
    rel = posixpath.normpath(path).lstrip("/")
    parts = rel.split("/") if rel else []

    while True:
        candidate = os.path.join(ROOT, *parts, "404.html")
        if os.path.isfile(candidate):
            return candidate
        if not parts:
            break
        parts.pop()

    fallback = os.path.join(ROOT, "404.html")
    return fallback if os.path.isfile(fallback) else None


def resolve(url_path):
    """Return (abs_path, status) for a request path, GitHub Pages style."""
    path = urllib.parse.unquote(url_path)
    path = posixpath.normpath(path)
    if path.startswith(".."):
        return None, 403
    rel = path.lstrip("/")

    candidates = []
    if path.endswith("/"):
        candidates.append(os.path.join(ROOT, rel, "index.html"))
    else:
        candidates.append(os.path.join(ROOT, rel))
        candidates.append(os.path.join(ROOT, rel, "index.html"))
        candidates.append(os.path.join(ROOT, rel + ".html"))

    for c in candidates:
        if os.path.isfile(c):
            return c, 200

    fallback = find_404(url_path)
    if fallback:
        return fallback, 404
    return None, 404


class Handler(BaseHTTPRequestHandler):
    server_version = "VoidWalkrPagesSim"

    def _serve(self, body=True):
        path = urllib.parse.urlsplit(self.path).path
        resolved, status = resolve(path)
        if not resolved:
            self.send_error(404)
            return
        with open(resolved, "rb") as fh:
            data = fh.read()
        ext = os.path.splitext(resolved)[1].lower()
        self.send_response(status)
        self.send_header("Content-Type", TYPES.get(ext, "application/octet-stream"))
        self.send_header("Content-Length", str(len(data)))
        if status == 404:
            # GitHub serves its built-in 404 page under this exact policy,
            # which blocks external stylesheets, scripts and images. Applying
            # it here too keeps the error page honest: it has to render with
            # the CSS inlined and nothing external.
            self.send_header(
                "Content-Security-Policy",
                "default-src 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'",
            )
        self.end_headers()
        if body:
            self.wfile.write(data)

    def do_GET(self):
        self._serve(body=True)

    def do_HEAD(self):
        self._serve(body=False)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    print("serving %s on http://127.0.0.1:%d" % (ROOT, PORT), flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
