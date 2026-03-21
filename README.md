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
cp .env.example .env        # optional: then edit .env for COVER_ART_ARTIST, Spotify keys, etc.
python manage.py migrate
python manage.py runserver
```

**Local env vars:** Django loads **`backend/.env`** automatically (via `python-dotenv`). Uncomment or add lines there, e.g. `COVER_ART_ARTIST=Your Store Name`. You can instead run **`export COVER_ART_ARTIST="…"`** in the same terminal before `runserver` if you prefer not to use a file.

API: **http://localhost:8000/api/tracks/**  
Admin: **http://localhost:8000/admin/** (create a superuser with `python manage.py createsuperuser` to manage tracks.)

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # optional: edit VITE_API_URL, VITE_SITE_URL if needed
npm run dev
```

App: **http://localhost:5173**

**Link previews (Open Graph / Twitter):** The build injects **`VITE_SITE_URL`** into `index.html` so `og:image` and `twitter:image` point at **`{origin}/og-image.jpg`**. That JPEG is the hero background (`public/hero-bg.png`) with the same dark scrim as the site and **`love-saintted.png`** centered on top (1200×630). Regenerate after changing those assets:

```bash
npm run generate:og
```

Set **`VITE_SITE_URL`** in `.env` to your live origin (no trailing slash), e.g. `https://saintted.com`, before production builds so crawlers get a valid absolute image URL.

**Navigation:** From the home page, click any track in **My Music** to open its detail page at `/music/<slug>` (e.g. `/music/hyperphoria`). Detail pages include “About the song”, release year, and links to YouTube, Apple Music, and Spotify.

**Custom admin (same theme as the site):** Open **`http://localhost:5173/admin`** after signing in with your Django user. The app stores an API token in the browser and lets you add/edit tracks (titles, slug, meta, order, art URL, general link, description, year, Spotify / YouTube / Apple Music URLs) and manage featured YouTube videos.

**Production subdomain `admin.saintted.com`:** Point DNS at the same host as the main site and serve the **same** frontend build. The app redirects the root path `/` to `/admin` when the hostname is `admin.saintted.com` (or `admin.localhost` for local testing with `/etc/hosts`). Set backend env, for example:

- `DJANGO_ALLOWED_HOSTS=your-api-host,admin.saintted.com,saintted.com`
- `CORS_ORIGINS=https://saintted.com,https://admin.saintted.com`
- `VITE_API_URL` on the frontend build should point at your public API (e.g. `https://api.saintted.com/api`).

**API auth:** `POST /api/auth/token/` with JSON `{"username":"…","password":"…"}` returns `{"token":"…"}`. Send `Authorization: Token <token>` for mutating requests.

**Streaming links:** Migration `0006` fills empty per-track `youtube_url`, `apple_music_url`, and `spotify_url` with **platform search URLs** for `Saintted` + the track title (public catalog IDs weren’t reliably discoverable). The SPA uses the same logic when a field is blank. Replace with **direct track/album URLs** in Django admin or the SPA admin when you have them.

**Cover art fallback:** If `art_url` is empty, the API merges in artwork from the **iTunes Search API** (Apple Music catalog, no API key). Optionally set **`SPOTIFY_CLIENT_ID`** and **`SPOTIFY_CLIENT_SECRET`** on the server to use **Spotify Web API** when iTunes returns nothing. Results are cached per track (default **24h**, override with **`COVER_ART_CACHE_TTL`** seconds).

**Artist name for catalog search:** Set **`COVER_ART_ARTIST`** (e.g. another spelling or store listing) if your releases appear under a different name than `Saintted`. Used for iTunes/Spotify cover lookups and included in the cache key so changing it refetches art.

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

## Deploy on Vercel (frontend)

The **frontend** is a static Vite build. The **Django API** must be hosted separately (e.g. Railway, Render, Fly.io, or any VPS) and reachable over HTTPS.

1. In [Vercel](https://vercel.com) → **Add New…** → **Project** → import **`mirireoluwa/saintted`** (or your fork).
2. Under **Configure Project**:
   - **Root Directory:** `frontend` (click *Edit* and set to `frontend`).
   - Framework should auto-detect **Vite**. Build: `npm run build`, Output: `dist`.
3. **Environment Variables** (Production — required at **build** time for Vite):
   - `VITE_API_URL` = your public API base, **no trailing slash**, e.g. `https://your-api.example.com/api`
4. Deploy. Then assign your domain (e.g. `saintted.com`) in **Project → Settings → Domains**.
5. **Backend CORS:** set `CORS_ORIGINS` on Django to include your Vercel URL(s), e.g. `https://saintted.com,https://www.saintted.com,https://admin.saintted.com` (and `https://*.vercel.app` while testing).

`frontend/vercel.json` adds SPA **rewrites** so React Router paths like `/music/:slug` and `/admin` work on refresh.

Optional second Vercel project with the same repo + root `frontend` + domain **`admin.saintted.com`** if you want the admin subdomain isolated; or use one project and add **`admin.saintted.com`** as an additional domain (same build).

## Fonts and styling

Visual language is aligned with **mirireoluwa.com**: dark radial page background, **Space Grotesk** + **Manrope** for UI, **DM Mono** for labels and meta, and portfolio-style section headers (`.my music`, `.videos`). **Saintted Regular** stays the display font for the hero wordmark and track titles. Light/dark toggle still flips tokens for readability.
