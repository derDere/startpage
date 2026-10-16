"""Lokaler Webserver für die Startseite."""

import json
import threading
from collections.abc import Callable
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from config import DATA_DIR, ICON_DIR, WEB_DIR


class StartPageHandler(SimpleHTTPRequestHandler):
    """Liefert die Webdateien aus WEB_DIR, config.json und die Icons aus DATA_DIR.

    Zusätzlich: GET /icons listet alle Icons, POST /open-settings öffnet das Settings-Fenster.
    """

    def __init__(self, *args, open_settings: Callable[[], None], **kwargs) -> None:
        self.open_settings = open_settings
        super().__init__(*args, **kwargs)

    def translate_path(self, path: str) -> str:
        web_path = Path(super().translate_path(path))
        relative = web_path.relative_to(WEB_DIR)
        if relative == Path("."):
            return str(WEB_DIR / "startpage.html")
        if relative == Path("config.json") or relative.parts[:2] == ("gfx", "icons"):
            return str(DATA_DIR / relative)
        return str(web_path)

    def do_GET(self) -> None:
        if self.path.split("?", 1)[0] == "/icons":
            icons = sorted(path.name for path in ICON_DIR.glob("*") if path.is_file())
            self.send_json(icons)
        else:
            super().do_GET()

    def do_POST(self) -> None:
        if self.path == "/open-settings":
            self.open_settings()
            self.send_response(204)
            self.end_headers()
        else:
            self.send_error(404)

    def end_headers(self) -> None:
        # Der Browser fragt jede Datei neu an; unveränderte Dateien kommen als 304 zurück.
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def send_json(self, data: object) -> None:
        body = json.dumps(data).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args) -> None:
        # Ohne Konsole gibt es kein stderr, in das geloggt werden könnte.
        pass


def start_server(port: int, open_settings: Callable[[], None]) -> ThreadingHTTPServer:
    handler = partial(StartPageHandler, open_settings=open_settings, directory=str(WEB_DIR))
    server = ThreadingHTTPServer(("127.0.0.1", port), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server
