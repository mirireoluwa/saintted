#!/bin/sh
set -e

echo "Running database migrations..."
python manage.py migrate --noinput

echo "Starting server..."
exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:${PORT:-8000} \
  --workers 1 \
  --worker-class gthread \
  --threads 4 \
  --timeout 600 \
  --graceful-timeout 120 \
  --keep-alive 5
