# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TYME TYBLE** is a personal productivity/smart timetable web app. Users can manage tasks, notes, and deadlines through a calendar-based interface.

Stack: Flask 3.0 + Flask-SQLAlchemy backend, SQLite database, vanilla JS/HTML/CSS frontend (no frameworks).

## Running the App

```bash
pip install -r requirements.txt
python app.py
```

App runs at `http://localhost:5000`. The SQLite database is auto-created at `instance/database.db` on first run.

## Architecture

### Backend

- **`app.py`** — Flask app factory: initializes SQLAlchemy, registers blueprints, creates tables, serves `index.html` at `/`.
- **`models.py`** — Four SQLAlchemy models: `User`, `Task`, `Note`, `Deadline`. All user-owned items cascade-delete on user removal. Dates stored as `YYYY-MM-DD` strings.
- **`routes/`** — Five blueprints registered under `/api/`:
  - `auth.py` → `/api/auth/*` (register, login, logout, me)
  - `tasks.py` → `/api/tasks/*`
  - `notes.py` → `/api/notes/*`
  - `deadlines.py` → `/api/deadlines/*`
  - `calendar.py` → `/api/summary`, `/api/day/<date>`, `/api/upcoming`, `/api/stats`

All non-auth routes use a `@login_required` decorator that checks `session['user_id']` and returns 401 if missing.

### Frontend

Single-page app served from `templates/index.html`. All views are rendered via JS injection into a content div; routing is hash-based (`#/today`, `#/calendar`, etc.).

JS load order in `index.html` matters — `api.js` and `store.js` must load before views/components:

- **`static/js/api.js`** — Thin fetch wrapper for all API calls
- **`static/js/store.js`** — Client-side state (current user, selected date)
- **`static/js/router.js`** — Hash-based SPA routing
- **`static/js/views/`** — One file per page: `today.js`, `calendar.js`, `tasks.js`, `notes.js`, `deadlines.js`, `work.js`
- **`static/js/components/`** — Reusable widgets: `clock.js`, `miniCalendar.js`, `editor.js` (rich text with base64 image support), `panel.js` (day sidebar)
- **`static/js/main.js`** — App init and event delegation

CSS is split by concern across `static/css/` (base, layout, auth, components, per-view files).

## Key Conventions

- All API endpoints filter data by `session['user_id']` — data is strictly per-user.
- Task status values: `todo`, `in-progress`, `done`. Priority values: `low`, `normal`, `high`.
- Note color values: `default`, `yellow`, `green`, `blue`, `pink`.
- `task.description` and `note.content` store raw HTML (from the rich text editor, may include base64-encoded images).
- The `instance/` directory is gitignored — never commit the database.
- The session secret in `app.py` (`'tyme-tyble-secret-key-change-in-prod'`) must be replaced before any production deployment.
