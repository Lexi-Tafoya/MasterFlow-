#!/usr/bin/env python3
"""Run the dependency-free MasterFlow prototype on a local web server."""

from __future__ import annotations

import argparse
import http.server
import os
import socketserver
from pathlib import Path


class ReusableThreadingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    allow_reuse_address = True
    daemon_threads = True


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    """Serve files with caching disabled.

    A live demo must always reflect the latest HTML, CSS, and JavaScript.
    Without this, a browser can hold an older cached script between reloads
    and show stale behavior during a walkthrough. Disabling the cache keeps
    every reload honest at the small cost of re-downloading local files.
    """

    def end_headers(self) -> None:  # noqa: D401 - stdlib hook
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve the MasterFlow prototype locally.")
    parser.add_argument("--host", default="127.0.0.1", help="Host address. Default: 127.0.0.1")
    parser.add_argument("--port", type=int, default=8000, help="Port number. Default: 8000")
    args = parser.parse_args()

    root = Path(__file__).resolve().parent
    os.chdir(root)
    handler = NoCacheHandler

    try:
        with ReusableThreadingServer((args.host, args.port), handler) as server:
            print(f"MasterFlow is running at http://{args.host}:{args.port}/index.html")
            print("Press Ctrl+C to stop the server.")
            server.serve_forever()
    except KeyboardInterrupt:
        print("\nMasterFlow server stopped.")
    except OSError as exc:
        raise SystemExit(f"Could not start the server: {exc}") from exc


if __name__ == "__main__":
    main()
