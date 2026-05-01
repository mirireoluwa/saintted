# Railway / any Docker host: explicit Python + pip (avoids "pip: not found" when
# a custom Railpack build command overrides the default install step).
FROM python:3.12.8-slim

WORKDIR /app
# Ensure interpreters are found in minimal shells (e.g. some `railway ssh` sessions).
ENV PATH="/usr/local/bin:/usr/bin:/bin:${PATH}" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Fail fast if the Docker build context is not `backend/` (Railway Root Directory must be `backend`).
RUN test -f manage.py

# No DB required; settings fall back to SQLite when DATABASE_URL is unset at build time.
RUN DJANGO_SECRET_KEY=collectstatic-only python3 manage.py collectstatic --noinput

EXPOSE 8000
# start.sh runs migrate then starts gunicorn. Railway healthcheck timeout is 180s
# which is plenty for migrations to complete before gunicorn binds.
RUN chmod +x start.sh
CMD ["sh", "start.sh"]
