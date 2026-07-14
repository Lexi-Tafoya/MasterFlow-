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


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve the MasterFlow prototype locally.")
    parser.add_argument("--host", default="127.0.0.1", help="Host address. Default: 127.0.0.1")
    parser.add_argument("--port", type=int, default=8000, help="Port number. Default: 8000")
    args = parser.parse_args()

    root = Path(__file__).resolve().parent
    os.chdir(root)
    handler = http.server.SimpleHTTPRequestHandler

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
