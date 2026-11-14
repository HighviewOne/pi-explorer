"""Serve the repo root at /pi-explorer/ (like GitHub Pages) for the browser tests."""
import functools
import http.server
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PREFIX = '/pi-explorer'


class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        if path == PREFIX:
            path = PREFIX + '/'
        if path.startswith(PREFIX + '/'):
            path = path[len(PREFIX):]
        else:
            path = '/__not_found__'
        return super().translate_path(path)

    def log_message(self, *args):
        pass


port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
handler = functools.partial(Handler, directory=str(ROOT))
http.server.ThreadingHTTPServer(('127.0.0.1', port), handler).serve_forever()
