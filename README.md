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

**Custom admin (same theme as the site):** Open **`http://localhost:5173/admin`** after signing in with your Django user. The app stores an API token in the browser and lets you add/edit tracks (titles, slug, meta, order, art URL, general link, description, year, Spotify / YouTube / Apple Music URLs), manage featured YouTube videos, and configure a **release countdown** (drop date/time + optional pre-save URL) shown as a **pill** (same glass treatment as the nav bar) on the public home page directly under the fixed header, above the hero.

**Release countdown:** Migrations **`0008`** / **`0009`** add `ReleaseCountdown` and seed the singleton row (`id=1`). Configure it in the SPA admin or Django admin. When **enabled**, the site shows a live timer until `release_at`; after the drop it shows **Out now** and still uses the pre-save URL as **Listen / save** if set. Turn off **Show countdown** when you no longer want the pill.

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
├── backend/                 # Django API
│   ├── Dockerfile           # Railway / Docker image (explicit pip + collectstatic)
│   ├── railway.toml         # Railway: Docker builder + pre-deploy migrate + healthcheck
│   ├── Procfile             # release + web (Heroku-style; optional on Railway)
│   ├── config/              # Project settings & URLs
│   ├── api/                 # Tracks app (model, serializers, views)
│   ├── manage.py
│   ├── runtime.txt          # pinned Python version (some hosts read this)
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

## Deploy: [Railway](https://railway.app) (Django API) + [Neon](https://neon.tech) (Postgres) + [Vercel](https://vercel.com) (frontend)

Deploy the **API first** so you have a stable URL for **`VITE_API_URL`** and for **`CORS_ORIGINS`** / **`CSRF_TRUSTED_ORIGINS`**.

### A. Postgres on [Neon](https://neon.tech)

Create a project, create a database, and copy **`DATABASE_URL`**. Prefer Neon’s **direct** (port **`5432`**) URI for migrations unless you know you need the pooler.

### B. API on [Railway](https://railway.app)

This repo ships **`backend/Dockerfile`** + **`backend/railway.toml`**: the image runs **`pip install`** and **`collectstatic`** during the Docker build; the container **CMD** starts **Gunicorn** on **`$PORT`** only. **Do not chain `migrate` into the same CMD** on Railway: the platform’s HTTP health check runs against **`/api/tracks/`** while the process is still migrating, so the service never becomes healthy and the edge shows **“Application failed to respond.”** After each deploy (or when you change models), open **Railway → your service → Shell** and run **`python manage.py migrate --noinput`** once. With **Root Directory** `backend`, Railway uses the **Dockerfile** builder (clear any old **custom Build Command** in the Railway UI). **`backend/runtime.txt`** still documents **Python 3.12.8** for local / other hosts.

1. [Railway](https://railway.app) → **New project** → **Deploy from GitHub repo** → select this repository.  
2. Open the new **web service** → **Settings** → **Root Directory** → set to **`backend`** (required so Railway finds **`railway.toml`**, **`manage.py`**, and **`requirements.txt`**).  
3. **Variables** → add (comma-separated lists have **no spaces** after commas):
   - **`DJANGO_DEBUG`** = `0`
   - **`DJANGO_SECRET_KEY`** — long random string (Railway can generate one)
   - **`DATABASE_URL`** — paste Neon’s connection string (must work from the public internet; include **`sslmode=require`** if Neon shows it)
   - **`CORS_ORIGINS`** — every HTTPS origin that loads the SPA, e.g. `https://your-app.vercel.app,https://saintted.com,https://www.saintted.com`
   - **`CSRF_TRUSTED_ORIGINS`** — same values as **`CORS_ORIGINS`**
   - Optionally **`DJANGO_ALLOWED_HOSTS`** — only if you use a **custom API domain**; Railway’s **`*.up.railway.app`** hostnames are already allowed when **`DJANGO_DEBUG=0`**
4. **Deploy** (or push to the connected branch). Watch logs: **pre-deploy** should run **`migrate`**, then Gunicorn should bind to **`$PORT`**.  
5. **Networking** → generate a public **`.up.railway.app`** URL (or attach your own domain). Your frontend base is **`https://<that-host>/api`** (**no** trailing slash after **`api`**).  
6. **Shell** (or one-off command): **`python manage.py createsuperuser`** for Django admin and SPA admin login.

**Optional:** If the service root is **not** `backend`, set **Settings → Config-as-code path** to **`/backend/railway.toml`** so Railway still loads this file.

**Other hosts:** **`backend/Procfile`** defines only **`web`** (Gunicorn). There is **no** `release:` line: Railway can run Procfile `release` **outside** the Docker image, which breaks with **`python: command not found`**. **`collectstatic`** is in the **Dockerfile**; **`migrate`** via **`railway ssh`** (see above). Heroku users can use a [release phase](https://devcenter.heroku.com/articles/procfile#the-release-process) separately if needed.

Production stack: **Gunicorn**, **WhiteNoise**, **PostgreSQL** via **`DATABASE_URL`**. Local dev uses SQLite when **`DATABASE_URL`** is unset.

### C. Frontend on [Vercel](https://vercel.com)

1. **Add New…** → **Project** → import the same repo.  
2. **Root Directory:** `frontend`. Framework: **Vite** (build `npm run build`, output `dist`).  
3. **Environment Variables** (Production — needed at **build** time):
   - **`VITE_API_URL`** = `https://<your-api-host>/api` (**no trailing slash**)
   - **`VITE_SITE_URL`** = your public site origin, e.g. `https://saintted.com` (Open Graph / canonical URLs, sitemap, and `react-helmet-async` fallbacks)
   - **`VITE_SENTRY_DSN`** (optional) — enables browser error reporting and tracing via Sentry when set

4. Deploy, then add your domain under **Settings → Domains**.  
5. If CORS errors appear, add every deployed frontend origin (including `https://xxx.vercel.app`) to **`CORS_ORIGINS`** and **`CSRF_TRUSTED_ORIGINS`** on the **API** service and redeploy.

`frontend/vercel.json` adds SPA **rewrites** so `/music/:slug` and `/admin` work on refresh.

**Admin subdomain:** add **`admin.saintted.com`** (or a second Vercel project) to **`CORS_ORIGINS`** / **`CSRF_TRUSTED_ORIGINS`** as well.

**If `admin.saintted.com` opens the public homepage (as `saintted.com`):** The browser is being **redirected to your primary domain** before the SPA runs, so the app never sees the `admin` hostname. On Vercel → your project → **Settings → Domains**, add **`admin.saintted.com`** as a domain on the **same** project as the main site. Ensure it is **not** configured to “redirect” to the apex domain (each hostname should serve the deployment directly). DNS should point the `admin` host at Vercel (e.g. **CNAME** to `cname.vercel-dns.com` as shown in the dashboard). Optional: set **`VITE_ADMIN_HOSTS`** in the Vercel env to a comma-separated list of extra hostnames that should use admin-only routing (e.g. a preview URL).

### Railway: `python: command not found` in deploy logs

That line almost never comes from this repo’s **Dockerfile** (build-time `python` is the official image). It usually means Railway is still running a **saved service command** that calls `python` **outside** your container (for example an old **Start**, **Release**, or **Build** field).

On the **API** service → **Settings**, clear or fix every custom command so the repo drives deploy:

- **Build Command** — empty (use **Dockerfile** only).
- **Start Command** — empty **or** leave empty and rely on **`backend/railway.toml`** `startCommand` (committed: `gunicorn …`).
- **Custom install / release / deploy hooks** — remove any line that starts with `python `.

Redeploy after saving. Migrations: **`railway ssh`** (not `railway shell`), `cd /app` if needed, then **`python3 manage.py migrate --noinput`**. If you still see `python: command not found`, use **`/usr/local/bin/python3 manage.py migrate --noinput`** (official image path).

### Host + database notes

- Do not rely on SQLite in production; most PaaS disks are ephemeral.  
- Prefer **Neon** (or another managed Postgres) for **`DATABASE_URL`** so the database is not tied to your web host’s lifecycle.

### Troubleshooting: “Track not found” or admin “Login failed”

Both the public site and **`admin.saintted.com`** call the same API. These issues are usually one of the following:

1. **`VITE_API_URL` is wrong (most common)**  
   It must look like **`https://<your-api-host>/api`**.  
   - Include the **`/api`** segment (Django mounts the REST API there).  
   - **No trailing slash** after `api`.  
   - Fix it in **Vercel → Project → Settings → Environment Variables**, then **Redeploy** (Vite bakes this in at build time).

2. **Open the API in the browser**  
   Visit **`https://<your-api-host>/api/tracks/`** — you should see JSON. If you get **404**, the path is wrong (often missing `/api`). If the list is **`[]`**, migrations ran but no tracks — add tracks in Django admin or the SPA admin (after login works).

3. **CORS / CSRF**  
   On the API host, **`CORS_ORIGINS`** and **`CSRF_TRUSTED_ORIGINS`** must include **`https://saintted.com`**, **`https://admin.saintted.com`**, and any **`https://*.vercel.app`** URL you use. Redeploy the API after saving.

4. **Login**  
   Create a user on **production** via the host shell: **`python manage.py createsuperuser`**. Use that username/password on **`admin.saintted.com`**.  
   If login shows **`HTTP 404`**, the token URL is wrong → recheck **`VITE_API_URL`**.

5. **Migrations**  
   In the API **deploy logs**, confirm **`migrate`** runs and finishes. If the database was recreated, re-run **`createsuperuser`** and re-import or re-add tracks.

On the live site, open **DevTools → Console**: if **`VITE_API_URL`** doesn’t end with **`/api`**, the app logs a warning.

## SEO, drafts, performance, and monitoring

- **Per-page meta:** The SPA updates `<title>`, description, canonical URL, and Open Graph / Twitter tags via **`react-helmet-async`**. Track pages use cover art as **`og:image`** when available, plus JSON-LD (`MusicGroup` on the home page, `MusicRecording` on track pages).
- **Sitemap:** `npm run build` runs **`scripts/generate-sitemap.mjs`** first (`prebuild`), which writes **`frontend/public/sitemap.xml`** using **`VITE_SITE_URL`** and **`VITE_API_URL`** (public track list). Commit the generated file or rely on CI to regenerate each deploy.
- **`robots.txt`:** Served from **`frontend/public/robots.txt`**. Update the **`Sitemap:`** line if your production domain is not `saintted.com`.
- **Draft tracks:** The **`Track.is_published`** flag (default **true**) hides tracks from **anonymous** `GET /api/tracks/` and `GET /api/tracks/<slug>/`. Authenticated admin/API token requests still see all tracks. Run **`python manage.py migrate`** after pulling to apply migration **`0014_track_is_published`**.
- **Hero prefetch:** `index.html` includes a **`link rel="prefetch"`** for **`/release-countdown/`** when **`VITE_API_URL`** is set at build time; the client also starts that fetch early and caches hero settings in **`sessionStorage`** for faster repeat visits.
- **Operations (recommended outside the repo):** Use an uptime monitor on your public API URL; enable **automated Postgres backups** (e.g. in Neon); tune **Sentry** alerts in the Sentry project.

## Fonts and styling

Visual language is aligned with **mirireoluwa.com**: dark radial page background, **Space Grotesk** + **Manrope** for UI, **DM Mono** for labels and meta, and portfolio-style section headers (`.my music`, `.videos`). **Saintted Regular** stays the display font for the hero wordmark and track titles. Light/dark toggle still flips tokens for readability.
