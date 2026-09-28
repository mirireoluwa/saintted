#!/usr/bin/env bash
# Run Django migrations against DATABASE_URL (use Supabase *direct* URI, port 5432).
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -f .venv/bin/activate ]]; then
  # shellcheck source=/dev/null
  source .venv/bin/activate
fi
if [[ -f .env ]]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set. Add your Supabase URI to backend/.env" >&2
  exit 1
fi
python manage.py migrate --noinput "$@"
