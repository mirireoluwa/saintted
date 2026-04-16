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
# Do not run migrate here: Railway's HTTP health check hits the port before migrate finishes,
# so the deploy is marked unhealthy ("Application failed to respond"). Run migrate once from
# Railway → Shell (or a one-off) after deploy, and again whenever you change models.
CMD ["sh", "-c", "exec gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 1 --timeout 120"]
