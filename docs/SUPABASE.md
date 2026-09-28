# Supabase setup (database + media)

Use **Supabase** for Postgres and file storage. Host the Django API somewhere cheap (e.g. **Render** free tier) — Supabase does not run Python/Django for you.

## 1. Create the Supabase project

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Save the **database password** (shown once).

## 2. Connection strings (Postgres)

In the project: **Connect** → **ORMs** or **Connection string**.

| Use case | Connection type | Port |
|----------|-----------------|------|
| `python manage.py migrate`, one-off scripts | **Direct** | `5432` |
| Gunicorn / Render / Fly (production) | **Session pooler** (recommended) or **Direct** on free tier with low traffic | pooler `5432` or direct `5432` |
| High concurrency only | **Transaction pooler** | `6543` (+ `?pgbouncer=true` in URI) |

Copy the URI and set in `backend/.env`:

```bash
DATABASE_URL=postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres
```

Use the **URI** tab and replace `[YOUR-PASSWORD]`. No spaces or line breaks inside the line.

### “No route to host” on `db.<ref>.supabase.co` (IPv6)

The **direct** host (`db.*.supabase.co`) is often **IPv6-only**. Home/office Wi‑Fi without IPv6 fails with:

`connection to server at "db....supabase.co" (2600:...) failed: No route to host`

**Fix:** In Supabase → **Connect**, choose **Session pooler** (not “Direct”), copy that URI, and use it as `DATABASE_URL`. The pooler uses IPv4 and works from most networks.

You can still run `migrate` against the pooler URL on the free tier.

**Local check:**

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Open **http://localhost:8000/api/tracks/** — you should see `[]` or seeded tracks after migrations.

## 3. Storage (uploaded cover art, gallery, countdown images)

1. Supabase → **Storage** → **New bucket** → name: `media` → **Public bucket** (so the site can show images without signed URLs).
2. **Project Settings** → **Storage** → **S3 connection** → create **access key** (save id + secret).
3. Add to `backend/.env` (and your API host’s env vars):

```bash
USE_S3_MEDIA=1
SUPABASE_PROJECT_REF=your-project-ref
S3_BUCKET_NAME=media
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
# Optional — auto-set from SUPABASE_PROJECT_REF if omitted:
# S3_ENDPOINT_URL=https://your-project-ref.storage.supabase.co/storage/v1/s3
# S3_REGION=us-east-1
S3_MEDIA_LOCATION=
```

Public file URLs look like:

`https://[project-ref].supabase.co/storage/v1/object/public/media/track-art/...`

Set on the API host (optional, for correct absolute URLs in JSON):

```bash
MEDIA_PUBLIC_ORIGIN=https://[project-ref].supabase.co/storage/v1/object/public/media
```

## 4. Host the Django API

Supabase only replaces **database + files**. You still need Gunicorn running so **`/admin`** saves content and the public site reads it.

| Host | Typical cost | Notes |
|------|----------------|-------|
| [PythonAnywhere](https://www.pythonanywhere.com) Beginner | ~$5/mo | Fixed price; Django WSGI in the dashboard |
| [Hetzner](https://www.hetzner.com) VPS | ~€4/mo | Run `backend/Dockerfile` or `start.sh` |
| [Fly.io](https://fly.io) | Usage-based | Set a **spending limit** in the dashboard |
| [Render](https://render.com) | Varies | Optional; see `render.yaml` |

**Environment** on the API host:

| Variable | Example |
|----------|---------|
| `DJANGO_DEBUG` | `0` |
| `DJANGO_SECRET_KEY` | long random string |
| `DATABASE_URL` | Supabase **session pooler** URI |
| `CORS_ORIGINS` | `https://saintted.com,https://admin.saintted.com,https://your-app.vercel.app` |
| `CSRF_TRUSTED_ORIGINS` | same as `CORS_ORIGINS` |
| `USE_S3_MEDIA` | `1` (+ Supabase S3 keys) |

After deploy:

```bash
python manage.py migrate --noinput
python manage.py createsuperuser
```

Test: **`https://YOUR-API-HOST/api/tracks/`** returns JSON.

## 5. Point the frontend at the new API

In **Vercel** → Project → **Environment Variables**:

```bash
VITE_API_URL=https://your-api-host.onrender.com/api
```

**Redeploy** the frontend (Vite bakes this in at build time).

Verify in the browser: `https://your-api-host.onrender.com/api/tracks/` returns JSON.

## 6. Restore content (Railway data is gone)

The old Railway Postgres is no longer reachable. After `migrate` you get:

- Seed tracks from migrations (older catalog)
- Default gallery URLs (`saintted-1.jpg`, `saintted-2.jpg` on the live site)
- Featured YouTube videos from migration `0007`

Re-add **new releases**, countdown, and custom images via:

- **https://saintted.com/admin** (or `admin.saintted.com`) after `createsuperuser` + login, or  
- **https://your-api-host/admin/** (Django admin)

## 7. Checklist

- [ ] Supabase project created; `DATABASE_URL` in `backend/.env`
- [ ] `python manage.py migrate` succeeds locally
- [ ] `media` bucket + S3 keys; `USE_S3_MEDIA=1`
- [ ] API deployed; `migrate` + `createsuperuser` on host
- [ ] `CORS_ORIGINS` includes all Vercel/production domains
- [ ] `VITE_API_URL` updated on Vercel; frontend redeployed
- [ ] Tracks / countdown re-entered in admin
