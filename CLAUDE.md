# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Browser start page — a single-page app showing a clock, greeting, weather forecast, command/search inputs and organized link collections. A small Python tray app (`app/`) serves the page on `http://127.0.0.1:<port>/` and offers a native settings window. It ships as a single console-less executable for Windows and Linux.

## Architecture

**Two-page layout** controlled by mouse wheel scroll with CSS slide animations:
- **Page 1**: Clock, personalized greeting, current weather, favorites grid (4 wide × 3 high), tools list, books list
- **Page 2**: Multi-column categorized link grid ("more" section)

**Web files:**
- `startpage.html` — Entry point, table-based layout with DOM containers; top left: tab icon, icon color and tab title (stored in the URL anchor `#title=…&icon=…&color=…`, e.g. for Tree Style Tab parent tabs; without a color all tab icons use the house color `#717171` of the default favicon); bottom right: gear that opens the settings window
- `script.js` — Polls `config.json` every second and re-renders all content in place when it changes; clock/greeting update every 1s. Commands are compiled on load; invalid regex/JS and runtime errors show in a dev-server-style error overlay (click to close)
- `style.css` — Dark theme (#161616), custom Neon font, page slide animations, flexbox grid; `img.tinted` colors icons via CSS mask

**Tray app (`app/`, PySide6):**
- `main.py` — Entry point: starts the server, tray icon (double-click or menu "Open start page", "Settings", "Stop application")
- `server.py` — `http.server` on 127.0.0.1; web files come from the bundle, `config.json` and `gfx/icons/` from the data directory; `GET /icons` lists all icons, `POST /open-settings` opens the settings window
- `settings_window.py` — Tabs Front, More (drag & drop swaps cells), Commands (list + editor with JS highlighting, code shown inside `(match) => { … }`), General; every change is saved immediately
- `config.py` — Paths, load/save of `config.json`, autostart (Windows registry Run key / Linux `~/.config/autostart`)

**Data directory:** next to the executable; when run from source (`python app/main.py`) it is the repo root. `config.json` is **gitignored** — it contains the API key. `gfx/icons/` is gitignored as well, except the shared icons listed as `!` exceptions in `.gitignore`; personal icons stay local. The executable bundles every `*.svg`, `*.png` and `*.gif` from `gfx/icons/` at build time and copies missing ones into the icon folder next to itself on start; uploads from the settings window land in that folder too. On first start a missing `config.json` is created as a copy of the demo config `example_config.json` (checked in, bundled into the executable).

**`config.json` structure:**
- `general`: `user_name`, `api_key`, `latitude`, `longitude`, `search_engine` (URL with `%s` for the query), `open_in_new_tab`, `port`, `autostart`
- `favorites`: 12 slots, `tools` / `books`: 10 slots each; a slot is `null` or a link
- link: `{title, url, icon, color}` (`tools`/`books` only `{title, url}`); `icon` is a file name in `gfx/icons/`, `color` a hex color or `null`
- `more.links`: object mapping IDs to links; a link with empty `url` renders as a section title
- `more.map`: 2D array (rows × columns) of link IDs, `"0"` marks an empty cell
- `commands`: list of `{pattern, code}`; the first case-insensitive regex match runs `code` as JS with the match available as `match`; commands with an empty pattern are skipped

## Build

- Windows: `build.ps1` → `dist/windows/MyStartPage.exe`
- Linux: `build.sh` (on Windows via `wsl bash build.sh`) → `dist/linux/MyStartPage`
- Both use `MyStartPage.spec` (PyInstaller, one file, no console).

## Dependencies

- **PySide6-Essentials**, **PyInstaller** (`requirements.txt`)
- **Axios** loaded from CDN (`cdn.jsdelivr.net/npm/axios/dist/axios.min.js`)
- **OpenWeather API 2.5** (`weather` and `forecast` endpoints)
