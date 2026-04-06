# saintted

Full-stack replica of [saintted.framer.website](https://saintted.framer.website): **React + TypeScript** frontend and **Django** backend.

## Stack

- **Frontend:** React 18, TypeScript, Vite
- **Backend:** Django 5, Django REST Framework
- **API:** REST `GET /api/tracks/` (list) and `GET /api/tracks/<slug>/` (detail); `GET/PATCH /api/release-countdown/` (singleton: home-page countdown + pre-save link; PATCH needs token). **Writes** (`POST`/`PATCH`/`DELETE`) on other resources require a DRF auth token. SPA admin UI at **`/admin`** (use **`admin.saintted.com`** in production — see below).

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

**Custom admin (same theme as the site):** Open **`http://localhost:5173/admin`** after signing in with your Django user. The app stores an API token in the browser and lets you add/edit tracks (titles, slug, meta, order, art URL, general link, description, year, Spotify / YouTube / Apple Music URLs), manage featured YouTube videos, and configure a **release countdown** (drop date/time + optional pre-save URL) shown on the public home page below the header.

**Release countdown:** Migrations **`0008`** / **`0009`** add `ReleaseCountdown` and seed the singleton row (`id=1`). Configure it in the SPA admin or Django admin. When **enabled**, the site shows a live timer until `release_at`; after the drop it shows **Out now** and still uses the pre-save URL as **Listen / save** if set. Turn off **Show countdown** when you no longer want the banner.

**Production subdomain `admin.saintted.com`:** Point DNS at the same host as the main site and serve the **same** frontend build. The app redirects the root path `/` to `/admin` when the hostname is `admin.saintted.com` (or `admin.localhost` for local testing with `/etc/hosts`). Set backend env, for example:

- `DJANGO_ALLOWED_HOSTS=your-api-host,admin.saintted.com,saintted.com`
- `CORS_ORIGINS=https://saintted.com,https://admin.saintted.com`
- `VITE_API_URL` on the frontend build should point at your public API (e.g. `https://api.saintted.com/api`).

**API auth:** `POST /api/auth/token/` with JSON `{"username":"…","password":"…"}` returns `{"token":"…"}`. Send `Authorization: Token <token>` for mutating requests.

**Streaming links:** Migration `0006` fills empty per-track `youtube_url`, `apple_music_url`, and `spotify_url` with **platform search URLs** for `Saintted` + the track title (public catalog IDs weren’t reliably discoverable). The SPA uses the same logic when a field is blank. Replace with **direct track/album URLs** in Django admin or the SPA admin when you have them.

**Featured videos:** Migration `0007` seeds two **FeaturedVideo** rows (YouTube IDs `CZ5orlyaDd8`, `zB1PkrtOBGU`). It is idempotent (`get_or_create` by `youtube_id`). Manage more clips in Django admin, the SPA admin, or the API.

**Cover art fallback:** If `art_url` is empty, the API merges in artwork from the **iTunes Search API** (Apple Music catalog, no API key). Optionally set **`SPOTIFY_CLIENT_ID`** and **`SPOTIFY_CLIENT_SECRET`** on the server to use **Spotify Web API** when iTunes returns nothing. Results are cached per track (default **24h**, override with **`COVER_ART_CACHE_TTL`** seconds).

**Artist name for catalog search:** Set **`COVER_ART_ARTIST`** (e.g. another spelling or store listing) if your releases appear under a different name than `Saintted`. Used for iTunes/Spotify cover lookups and included in the cache key so changing it refetches art.

The frontend uses the same layout and copy as the Framer site. Tracks are loaded from the Django API; if the API is unavailable, it falls back to built-in track data.

## Project layout

```
saintted/
├── render.yaml              # Render Blueprint (Postgres + Django web service)
├── backend/                 # Django API
│   ├── config/              # Project settings & URLs
│   ├── api/                 # Tracks app (model, serializers, views)
│   ├── manage.py
│   ├── runtime.txt          # Python version on Render
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

## Deploy: Render (backend) + Vercel (frontend)

Deploy the **API first** so you know the URL for `VITE_API_URL` and CORS.

### A. Backend on [Render](https://render.com)

**Option 1 — Blueprint (repo root `render.yaml`)**  
1. Render → **New +** → **Blueprint** → connect **`mirireoluwa/saintted`**.  
2. Apply the blueprint (creates **PostgreSQL** `saintted-db` + **Web Service** `saintted-api` with root **`backend`**).  
3. In the web service → **Environment**, set (comma-separated lists, **no spaces** after commas):
   - **`CORS_ORIGINS`** — every origin that loads the SPA in a browser, e.g. `https://your-app.vercel.app,https://saintted.com,https://www.saintted.com`
   - **`CSRF_TRUSTED_ORIGINS`** — same values as `CORS_ORIGINS` (needed for Django admin + session CSRF over HTTPS)
   - Optionally **`DJANGO_ALLOWED_HOSTS`** — your API hostname(s), e.g. `saintted-api.onrender.com` (Render `*.onrender.com` is already allowed when `DJANGO_DEBUG=0`)

**Option 2 — Manual Web Service**  
1. **New +** → **PostgreSQL** (note the **Internal/External Database URL**).  
2. **New +** → **Web Service** → same repo, **Root Directory** = `backend`, **Runtime** = Python.  
3. **Build command:** `pip install -r requirements.txt && python manage.py collectstatic --noinput`  
4. **Start command:** `python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`  
5. **Environment variables:** `DJANGO_DEBUG=0`, generate **`DJANGO_SECRET_KEY`**, paste **`DATABASE_URL`** from Postgres, plus `CORS_ORIGINS` and `CSRF_TRUSTED_ORIGINS` as above.

**After the API is live**

- API base for the frontend: **`https://<your-service>.onrender.com/api`** (no trailing slash after `api`).  
- **Shell** (Render dashboard → service → **Shell**): `python manage.py createsuperuser` so you can use Django admin and the SPA admin token login.

Production stack: **Gunicorn**, **WhiteNoise** for static (Django admin CSS/JS), **PostgreSQL** via **`DATABASE_URL`**. Local dev still uses SQLite when `DATABASE_URL` is unset.

### B. Frontend on [Vercel](https://vercel.com)

1. **Add New…** → **Project** → import the same repo.  
2. **Root Directory:** `frontend`. Framework: **Vite** (build `npm run build`, output `dist`).  
3. **Environment Variables** (Production — needed at **build** time):
   - **`VITE_API_URL`** = `https://<your-service>.onrender.com/api` (same URL as above; **no trailing slash**)
   - **`VITE_SITE_URL`** = your public site origin, e.g. `https://saintted.com` (Open Graph / canonical URLs, sitemap, and `react-helmet-async` fallbacks)
   - **`VITE_SENTRY_DSN`** (optional) — enables browser error reporting and tracing via Sentry when set

4. Deploy, then add your domain under **Settings → Domains**.  
5. If CORS errors appear, add every deployed frontend origin (including `https://xxx.vercel.app`) to **`CORS_ORIGINS`** and **`CSRF_TRUSTED_ORIGINS`** on Render and redeploy the API (or clear cache).

`frontend/vercel.json` adds SPA **rewrites** so `/music/:slug` and `/admin` work on refresh.

**Admin subdomain:** add **`admin.saintted.com`** (or a second Vercel project) to **`CORS_ORIGINS`** / **`CSRF_TRUSTED_ORIGINS`** as well.

### Render + database notes

- If blueprint database creation isn’t available on your plan, create **PostgreSQL** manually and set **`DATABASE_URL`** on the web service.  
- Do not rely on SQLite on Render; the filesystem is ephemeral.

### Troubleshooting: “Track not found” or admin “Login failed”

Both the public site and **`admin.saintted.com`** call the same API. These issues are usually one of the following:

1. **`VITE_API_URL` is wrong (most common)**  
   It must be exactly:  
   `https://<your-render-service>.onrender.com/api`  
   - Include the **`/api`** segment (Django mounts the REST API there).  
   - **No trailing slash** after `api`.  
   - Fix it in **Vercel → Project → Settings → Environment Variables**, then **Redeploy** (Vite bakes this in at build time).

2. **Open the API in the browser**  
   Visit `https://<your-service>.onrender.com/api/tracks/` — you should see JSON. If you get **404**, the path is wrong (often missing `/api`). If the list is **`[]`**, migrations ran but no tracks — add tracks in Django admin or the SPA admin (after login works).

3. **CORS / CSRF**  
   On Render, **`CORS_ORIGINS`** and **`CSRF_TRUSTED_ORIGINS`** must include **`https://saintted.com`**, **`https://admin.saintted.com`**, and any **`https://*.vercel.app`** URL you use. Redeploy the API after saving.

4. **Login**  
   Create a user on **production**: Render → Web Service → **Shell** → `python manage.py createsuperuser`. Use that username/password on **`admin.saintted.com`**.  
   If login shows **`HTTP 404`**, the token URL is wrong → recheck **`VITE_API_URL`**.

5. **Migrations**  
   In Render **Logs**, confirm `migrate` runs and finishes. If the DB was recreated, re-run **`createsuperuser`** and re-import or re-add tracks.

On the live site, open **DevTools → Console**: if **`VITE_API_URL`** doesn’t end with **`/api`**, the app logs a warning.

## SEO, drafts, performance, and monitoring

- **Per-page meta:** The SPA updates `<title>`, description, canonical URL, and Open Graph / Twitter tags via **`react-helmet-async`**. Track pages use cover art as **`og:image`** when available, plus JSON-LD (`MusicGroup` on the home page, `MusicRecording` on track pages).
- **Sitemap:** `npm run build` runs **`scripts/generate-sitemap.mjs`** first (`prebuild`), which writes **`frontend/public/sitemap.xml`** using **`VITE_SITE_URL`** and **`VITE_API_URL`** (public track list). Commit the generated file or rely on CI to regenerate each deploy.
- **`robots.txt`:** Served from **`frontend/public/robots.txt`**. Update the **`Sitemap:`** line if your production domain is not `saintted.com`.
- **Draft tracks:** The **`Track.is_published`** flag (default **true**) hides tracks from **anonymous** `GET /api/tracks/` and `GET /api/tracks/<slug>/`. Authenticated admin/API token requests still see all tracks. Run **`python manage.py migrate`** after pulling to apply migration **`0014_track_is_published`**.
- **Hero prefetch:** `index.html` includes a **`link rel="prefetch"`** for **`/release-countdown/`** when **`VITE_API_URL`** is set at build time; the client also starts that fetch early and caches hero settings in **`sessionStorage`** for faster repeat visits.
- **Operations (recommended outside the repo):** Use an uptime monitor on your Render API URL; enable **automated Postgres backups** in your host dashboard; tune **Sentry** alerts in the Sentry project.

## Fonts and styling

Visual language is aligned with **mirireoluwa.com**: dark radial page background, **Space Grotesk** + **Manrope** for UI, **DM Mono** for labels and meta, and portfolio-style section headers (`.my music`, `.videos`). **Saintted Regular** stays the display font for the hero wordmark and track titles. Light/dark toggle still flips tokens for readability.
