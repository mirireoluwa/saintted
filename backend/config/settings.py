"""
Django settings for saintted backend.
"""
import os
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Local overrides: create backend/.env (see .env.example). Not used if file missing.
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "dev-secret-change-in-production",
)

DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"

ALLOWED_HOSTS = ["localhost", "127.0.0.1", ".localhost"]
_extra_hosts = os.environ.get("DJANGO_ALLOWED_HOSTS", "").strip()
if _extra_hosts:
    ALLOWED_HOSTS = list(
        dict.fromkeys(
            ALLOWED_HOSTS + [h.strip() for h in _extra_hosts.split(",") if h.strip()]
        )
    )
# Default PaaS hostnames when deploying without a custom API domain yet (DEBUG=0).
if not DEBUG:
    _paas_suffixes = (
        ".up.railway.app",
        ".railway.app",
        ".fly.dev",
    )
    ALLOWED_HOSTS = list(dict.fromkeys(ALLOWED_HOSTS + list(_paas_suffixes)))

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework.authtoken",
    "api",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# Production: set DATABASE_URL (PostgreSQL: Neon, Supabase, managed RDS, …). Local: SQLite if unset.
_sqlite_url = "sqlite:///" + str(BASE_DIR / "db.sqlite3").replace("\\", "/")
_database_url_raw = (os.environ.get("DATABASE_URL") or "").strip()
if not _database_url_raw:
    _database_url_effective = _sqlite_url
else:
    _lower = _database_url_raw.lower()
    if not (_lower.startswith("postgres://") or _lower.startswith("postgresql://")):
        raise ImproperlyConfigured(
            "DATABASE_URL must start with postgresql:// or postgres://. "
            "Neon: Project → Connect → copy the full URI (not a fragment after ://). "
            "Check backend/.env: no line break inside the URL, no leading spaces, "
            "and no quotes that trim the scheme."
        )
    _database_url_effective = _database_url_raw

DATABASES = {
    "default": dj_database_url.parse(
        _database_url_effective,
        conn_max_age=600,
        conn_health_checks=True,
    )
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Media storage:
# - Local dev/default: filesystem under MEDIA_ROOT
# - Production option: S3-compatible object storage (AWS S3, Cloudflare R2, etc.)
USE_S3_MEDIA = os.environ.get("USE_S3_MEDIA", "0") == "1"
_s3_bucket = (os.environ.get("S3_BUCKET_NAME") or "").strip()
if USE_S3_MEDIA and _s3_bucket:
    AWS_ACCESS_KEY_ID = (os.environ.get("S3_ACCESS_KEY_ID") or "").strip()
    AWS_SECRET_ACCESS_KEY = (os.environ.get("S3_SECRET_ACCESS_KEY") or "").strip()
    AWS_STORAGE_BUCKET_NAME = _s3_bucket
    AWS_S3_REGION_NAME = (os.environ.get("S3_REGION") or "").strip() or None
    AWS_S3_ENDPOINT_URL = (os.environ.get("S3_ENDPOINT_URL") or "").strip() or None
    AWS_DEFAULT_ACL = None
    AWS_QUERYSTRING_AUTH = False
    AWS_S3_FILE_OVERWRITE = False
    AWS_S3_ADDRESSING_STYLE = (os.environ.get("S3_ADDRESSING_STYLE") or "auto").strip()
    _s3_custom_domain = (os.environ.get("S3_CUSTOM_DOMAIN") or "").strip()
    if _s3_custom_domain:
        AWS_S3_CUSTOM_DOMAIN = _s3_custom_domain
        MEDIA_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/"
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3.S3Storage",
            "OPTIONS": {
                "location": (os.environ.get("S3_MEDIA_LOCATION") or "media").strip(),
            },
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
        },
    }
else:
    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
        },
    }

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# HTTPS behind reverse proxies (Vercel, Railway, Fly, …)
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    # DB-backed sessions require `django_session` (migrate). Until then, every request 500s.
    # Signed cookies avoid that for healthchecks and anonymous GET / while Postgres is empty.
    SESSION_ENGINE = "django.contrib.sessions.backends.signed_cookies"

def _split_csv_origins(raw: str) -> list[str]:
    """Comma-separated https origins; strips whitespace, quotes, and invisible chars from env paste."""
    raw = raw.replace("\u200b", "").replace("\u200c", "").replace("\u200d", "").replace("\ufeff", "")
    out: list[str] = []
    for part in raw.split(","):
        o = part.strip().strip('"').strip("'")
        if o:
            out.append(o)
    return out


_csrf_origins = os.environ.get("CSRF_TRUSTED_ORIGINS", "").strip()
CSRF_TRUSTED_ORIGINS = _split_csv_origins(_csrf_origins)

# CORS: Vite dev + optional extra origins (e.g. https://saintted.com,https://admin.saintted.com)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://admin.localhost:5173",
]
_cors_extra = os.environ.get("CORS_ORIGINS", "").strip()
if _cors_extra:
    CORS_ALLOWED_ORIGINS = list(
        dict.fromkeys(CORS_ALLOWED_ORIGINS + _split_csv_origins(_cors_extra))
    )
if not DEBUG and _csrf_origins:
    # Union CSRF origins into CORS: teams often list every frontend on CSRF_TRUSTED_ORIGINS but
    # omit admin (or the whole CORS_ORIGINS var), which yields "TypeError: Failed to fetch" for
    # all admin SPA requests (Authorization triggers a preflight).
    CORS_ALLOWED_ORIGINS = list(
        dict.fromkeys(CORS_ALLOWED_ORIGINS + _split_csv_origins(_csrf_origins))
    )

REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
}

# Cover-art fallback (iTunes / Spotify search) — override if stores list you under another spelling
COVER_ART_ARTIST = (os.environ.get("COVER_ART_ARTIST") or "Saintted").strip() or "Saintted"

# Optional shared secret for admin password reset endpoint in production.
# Required when DEBUG=False if you want to use /api/auth/reset-password/.
RESET_PASSWORD_SECRET = (os.environ.get("RESET_PASSWORD_SECRET") or "").strip()
