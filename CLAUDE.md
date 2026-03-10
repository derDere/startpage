# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Browser start page — a static single-page app showing a clock, greeting, weather forecast, and organized link collections. No build system; open `startpage.html` directly in a browser.

## Architecture

**Two-page layout** controlled by mouse wheel scroll with CSS slide animations:
- **Page 1**: Clock, personalized greeting, current weather, favorites grid (4x4 icons), tools list, books list
- **Page 2**: Multi-column categorized link grid ("more" section)

**Key files:**
- `startpage.html` — Entry point, table-based layout with DOM containers
- `script.js` — All application logic in `pageLoaded()` callback; clock/greeting updates every 1s
- `style.css` — Dark theme (#161616), custom Neon font, page slide animations, flexbox grid
- `store.js` — Runtime configuration (API key, GPS coords, user name, all content data). **Gitignored** — contains secrets
- `example_store.js` — Template for `store.js`; copy and rename to set up

**Data injection pattern:** `store.js` attaches methods to the `document` object (`getApiKey()`, `getLocation()`, `getUserName()`, `getContentData()`). Application code calls these to retrieve config at runtime.

**Content data structure** (returned by `getContentData()`):
- `favorites`: array of `{icon, title, url, alt}` — rendered as icon grid
- `tools`: array of `[title, url]` pairs
- `books`: array of `[title, url]` pairs
- `more.links`: object mapping IDs to `[url, title, icon?]`
- `more.map`: 2D array defining multi-column grid layout by link ID

## Dependencies

- **Axios** loaded from CDN (`cdn.jsdelivr.net/npm/axios/dist/axios.min.js`)
- **OpenWeather API v3.0** (`api.openweathermap.org/data/3.0/onecall`) — weather integration exists but is currently commented out in `script.js`

## Sensitive Files

`store.js` and `gfx/icons/` are in `.gitignore` — they contain a personal API key and custom icons. Never commit these.
