#!/usr/bin/env python3
"""Development static server for UNOEditor.

Why not plain `python3 -m http.server`:
  - It sends no Cache-Control, so WKWebView (Tauri macOS) keeps a persistent
    disk cache. Edits to js/app.js are invisible in `tauri dev` until the
    cache happens to expire — which made several fixes look like they "did
    nothing".
  - This server does two things:
      1. Sends no-store on every response.
      2. Rewrites index.html on the fly, appending ?v=<mtime> to every local
         js/css reference. Any source edit changes the URL, so the webview
         is forced to re-fetch even if it cached an older copy under the
         bare filename.
"""
import functools
import http.server
import os
import re
import socketserver
import time

PORT = 5173
ROOT = "."

# match src="..." / href="..." pointing at a local .js/.css file
_RES_REF = re.compile(r'(?P<attr>\b(?:src|href)\s*=\s*["\'])(?P<url>[^"\']+\.(?:js|css))(?P<quote>["\'])', re.I)


def _bust(html_bytes):
    text = html_bytes.decode("utf-8", "replace")

    def repl(m):
        url = m.group("url")
        # skip external URLs and data URIs
        if url.startswith(("http://", "https://", "//", "data:")):
            return m.group(0)
        # strip any existing query/fragment, keep the relative path
        path = url.split("?", 1)[0].split("#", 1)[0].lstrip("/")
        fs = os.path.join(ROOT, path)
        try:
            v = int(os.path.getmtime(fs) * 1000)
        except OSError:
            v = int(time.time() * 1000)
        sep = "&" if "?" in url else "?"
        return "%s%s%sv=%d%s" % (m.group("attr"), url, sep, v, m.group("quote"))

    return _RES_REF.sub(repl, text).encode("utf-8")


class DevHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        http.server.SimpleHTTPRequestHandler.end_headers(self)

    def send_head(self):
        # Inject cache-bust query params into the served index.html only.
        path = self.translate_path(self.path)
        # When the URL is a directory, SimpleHTTPRequestHandler serves its
        # index.html — resolve that explicitly so `GET /` is covered too.
        if os.path.isdir(path):
            path = os.path.join(path, "index.html")
        if os.path.basename(path) == "index.html" and self.command == "GET":
            try:
                with open(path, "rb") as f:
                    body = _bust(f.read())
                self.send_response(200)
                self.send_header("Content-type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                return __import__("io").BytesIO(body)
            except OSError:
                pass
        return http.server.SimpleHTTPRequestHandler.send_head(self)


class ReusableTCPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    handler = functools.partial(DevHandler, directory=ROOT)
    with ReusableTCPServer(("0.0.0.0", PORT), handler) as httpd:
        print("Serving %s at http://localhost:%d (no-store + mtime cache-bust)" % (ROOT, PORT), flush=True)
        httpd.serve_forever()
