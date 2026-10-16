"""Startet Webserver und Tray-Icon der Startseite."""

import sys
import webbrowser

from PySide6.QtCore import QObject, Qt, Signal
from PySide6.QtGui import QIcon
from PySide6.QtWidgets import QApplication, QMenu, QSystemTrayIcon

from config import WEB_DIR, install_bundled_icons, load_config
from server import start_server
from settings_window import SettingsWindow


class SettingsRequest(QObject):
    """Leitet die Settings-Anfrage der Seite aus dem Server-Thread in den GUI-Thread weiter."""

    requested = Signal()


def main() -> None:
    install_bundled_icons()
    port = load_config()["general"]["port"]
    url = f"http://127.0.0.1:{port}/"

    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(False)
    settings_window: SettingsWindow | None = None

    def open_page() -> None:
        webbrowser.open(url)

    def open_settings() -> None:
        nonlocal settings_window
        if settings_window is None or not settings_window.isVisible():
            settings_window = SettingsWindow(load_config())
        settings_window.show()
        # Windows holt Fenster einer Hintergrund-App nicht nach vorne; kurz "immer oben" legt es trotzdem über den Browser.
        window_handle = settings_window.windowHandle()
        window_handle.setFlag(Qt.WindowType.WindowStaysOnTopHint, True)
        window_handle.setFlag(Qt.WindowType.WindowStaysOnTopHint, False)
        settings_window.raise_()
        settings_window.activateWindow()

    def on_activated(reason: QSystemTrayIcon.ActivationReason) -> None:
        if reason == QSystemTrayIcon.ActivationReason.DoubleClick:
            open_page()

    settings_request = SettingsRequest()
    settings_request.requested.connect(open_settings, Qt.ConnectionType.QueuedConnection)
    start_server(port, settings_request.requested.emit)

    menu = QMenu()
    menu.addAction("Open start page", open_page)
    menu.addAction("Settings", open_settings)
    menu.addSeparator()
    menu.addAction("Stop application", app.quit)

    tray = QSystemTrayIcon(QIcon(str(WEB_DIR / "gfx" / "favicon.png")))
    tray.setToolTip("MyStartPage")
    tray.setContextMenu(menu)
    tray.activated.connect(on_activated)
    tray.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
