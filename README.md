# saintted

Full-stack replica of [saintted.framer.website](https://saintted.framer.website): **React + TypeScript** frontend and **Django** backend.

## Stack

- **Frontend:** React 18, TypeScript, Vite
- **Backend:** Django 5, Django REST Framework
- **API:** REST `GET /api/tracks/` (list) and `GET /api/tracks/<slug>/` (detail); **writes** (`POST`/`PATCH`/`DELETE`) require a DRF auth token. SPA admin UI at **`/admin`** (use **`admin.saintted.com`** in production — see below).

## Quick start

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

API: **http://localhost:8000/api/tracks/**  
Admin: **http://localhost:8000/admin/** (create a superuser with `python manage.py createsuperuser` to manage tracks.)

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # optional: edit VITE_API_URL if needed
npm run dev
```

App: **http://localhost:5173**

**Navigation:** From the home page, click any track in **My Music** to open its detail page at `/music/<slug>` (e.g. `/music/hyperphoria`). Detail pages include “About the song”, release year, and links to YouTube, Apple Music, and Spotify.

**Custom admin (same theme as the site):** Open **`http://localhost:5173/admin`** after signing in with your Django user. The app stores an API token in the browser and lets you add/edit tracks (titles, slug, meta, order, art URL, general link, description, year, Spotify / YouTube / Apple Music URLs) and manage featured YouTube videos.

**Production subdomain `admin.saintted.com`:** Point DNS at the same host as the main site and serve the **same** frontend build. The app redirects the root path `/` to `/admin` when the hostname is `admin.saintted.com` (or `admin.localhost` for local testing with `/etc/hosts`). Set backend env, for example:

- `DJANGO_ALLOWED_HOSTS=your-api-host,admin.saintted.com,saintted.com`
- `CORS_ORIGINS=https://saintted.com,https://admin.saintted.com`
- `VITE_API_URL` on the frontend build should point at your public API (e.g. `https://api.saintted.com/api`).

**API auth:** `POST /api/auth/token/` with JSON `{"username":"…","password":"…"}` returns `{"token":"…"}`. Send `Authorization: Token <token>` for mutating requests.

The frontend uses the same layout and copy as the Framer site. Tracks are loaded from the Django API; if the API is unavailable, it falls back to built-in track data.

## Project layout

```
saintted/
├── backend/                 # Django API
│   ├── config/              # Project settings & URLs
│   ├── api/                 # Tracks app (model, serializers, views)
│   ├── manage.py
│   └── requirements.txt
├── frontend/                # React + TypeScript (Vite)
│   ├── src/
│   │   ├── api/             # API client
│   │   ├── components/      # Hero, Intro, MusicSection, etc.
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── index.css
│   ├── index.html
│   └── package.json
├── index.html               # Legacy static version (optional)
├── styles.css
├── script.js
└── README.md
```

## Fonts and styling

Visual language is aligned with **mirireoluwa.com**: dark radial page background, **Space Grotesk** + **Manrope** for UI, **DM Mono** for labels and meta, and portfolio-style section headers (`.my music`, `.videos`). **Saintted Regular** stays the display font for the hero wordmark and track titles. Light/dark toggle still flips tokens for readability.
