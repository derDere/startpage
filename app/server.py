"""Lokaler Webserver für die Startseite."""

import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from config import DATA_DIR, WEB_DIR


class StartPageHandler(SimpleHTTPRequestHandler):
    """Liefert die Webdateien aus WEB_DIR, config.json und die Icons aus DATA_DIR."""

    def translate_path(self, path: str) -> str:
        web_path = Path(super().translate_path(path))
        relative = web_path.relative_to(WEB_DIR)
        if relative == Path("."):
            return str(WEB_DIR / "startpage.html")
        if relative == Path("config.json") or relative.parts[:2] == ("gfx", "icons"):
            return str(DATA_DIR / relative)
        return str(web_path)

    def log_message(self, format: str, *args) -> None:
        # Ohne Konsole gibt es kein stderr, in das geloggt werden könnte.
        pass


def start_server(port: int) -> ThreadingHTTPServer:
    handler = partial(StartPageHandler, directory=str(WEB_DIR))
    server = ThreadingHTTPServer(("127.0.0.1", port), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server
