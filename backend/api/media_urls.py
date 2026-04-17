"""Absolute URLs for user-uploaded files (JSON consumed by a SPA on another origin)."""

from django.conf import settings


def public_media_url(request, path: str) -> str:
    path = (path or "").strip()
    if not path:
        return ""
    if path.startswith("//"):
        return f"https:{path}"
    low = path.lower()
    if low.startswith("http://") or low.startswith("https://"):
        return path
    origin = (getattr(settings, "MEDIA_PUBLIC_ORIGIN", None) or "").strip().rstrip("/")
    if origin:
        return f"{origin}{path}" if path.startswith("/") else f"{origin}/{path}"
    if request is not None:
        return request.build_absolute_uri(path)
    return path
