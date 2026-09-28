"""PostgreSQL URL helpers (Supabase pooler, SSL)."""
from __future__ import annotations

from urllib.parse import parse_qs, urlparse


def is_supabase_host(database_url: str) -> bool:
    host = (urlparse(database_url).hostname or "").lower()
    return host.endswith(".supabase.co") or host.endswith(".pooler.supabase.com")


def uses_supabase_transaction_pooler(database_url: str) -> bool:
    parsed = urlparse(database_url)
    if parsed.port == 6543:
        return True
    query = parse_qs(parsed.query)
    for key, values in query.items():
        if key.lower() == "pgbouncer" and values and values[0].lower() in ("true", "1", "yes"):
            return True
    return False


def apply_supabase_database_options(db_config: dict, database_url: str) -> dict:
    """
    Supabase Postgres: require SSL; disable server-side cursors on the transaction pooler (port 6543).
    Run migrations against the **direct** connection (port 5432), not the pooler.
    """
    if not is_supabase_host(database_url):
        return db_config

    options = dict(db_config.get("OPTIONS") or {})
    if "sslmode" not in options and "sslmode" not in database_url.lower():
        options["sslmode"] = "require"
    db_config["OPTIONS"] = options

    if uses_supabase_transaction_pooler(database_url):
        db_config["DISABLE_SERVER_SIDE_CURSORS"] = True

    return db_config
