"""Pfade, Laden und Speichern der config.json sowie der Autostart-Eintrag."""

import json
import os
import shutil
import sys
from pathlib import Path

APP_NAME = "MyStartPage"
EMPTY_CELL = "0"

# Die Exe entpackt die Webdateien in ein temporäres Verzeichnis (sys._MEIPASS);
# config.json und Icons liegen neben der Exe. Ohne Exe ist beides der Repo-Ordner.
if getattr(sys, "frozen", False):
    WEB_DIR = Path(sys._MEIPASS)
    DATA_DIR = Path(sys.executable).parent
else:
    WEB_DIR = DATA_DIR = Path(__file__).resolve().parent.parent

CONFIG_FILE = DATA_DIR / "config.json"
ICON_DIR = DATA_DIR / "gfx" / "icons"
BUNDLED_ICON_DIR = WEB_DIR / "gfx" / "icons"
EXAMPLE_CONFIG_FILE = WEB_DIR / "example_config.json"


def install_bundled_icons() -> None:
    """Kopiert die in der Exe mitgelieferten Icons in den Icon-Ordner, ohne vorhandene zu überschreiben."""
    if BUNDLED_ICON_DIR == ICON_DIR:
        return
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    for icon in BUNDLED_ICON_DIR.glob("*"):
        target = ICON_DIR / icon.name
        if not target.exists():
            shutil.copy(icon, target)


def load_config() -> dict:
    # Beim Erststart dient die Demo-Config als Ausgangspunkt.
    if not CONFIG_FILE.exists():
        shutil.copy(EXAMPLE_CONFIG_FILE, CONFIG_FILE)
    return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))


def save_config(config: dict) -> None:
    # Erst in eine Temp-Datei schreiben, damit die Seite beim Pollen nie eine halbe Datei liest.
    temp_file = CONFIG_FILE.with_suffix(".tmp")
    temp_file.write_text(json.dumps(config, indent=4, ensure_ascii=False), encoding="utf-8")
    os.replace(temp_file, CONFIG_FILE)


def set_autostart(enabled: bool) -> None:
    if getattr(sys, "frozen", False):
        command = f'"{sys.executable}"'
    else:
        command = f'"{sys.executable}" "{Path(__file__).resolve().parent / "main.py"}"'

    if sys.platform == "win32":
        import winreg

        run_key = r"Software\Microsoft\Windows\CurrentVersion\Run"
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, run_key, 0, winreg.KEY_SET_VALUE) as key:
            if enabled:
                winreg.SetValueEx(key, APP_NAME, 0, winreg.REG_SZ, command)
            else:
                try:
                    winreg.DeleteValue(key, APP_NAME)
                except FileNotFoundError:
                    pass
    else:
        desktop_file = Path.home() / ".config" / "autostart" / f"{APP_NAME}.desktop"
        if enabled:
            desktop_file.parent.mkdir(parents=True, exist_ok=True)
            desktop_file.write_text(
                f"[Desktop Entry]\nType=Application\nName={APP_NAME}\nExec={command}\n",
                encoding="utf-8",
            )
        else:
            desktop_file.unlink(missing_ok=True)
