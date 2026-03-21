"""
Resolve cover art from Apple Music (iTunes Search API) and optionally Spotify Web API
when Track.art_url is empty. iTunes Search is public and needs no API key.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

USER_AGENT = "SainttedSite/1.0 (artist site; +https://github.com/mirireoluwa/saintted)"
ITUNES_TIMEOUT = float(os.environ.get("COVER_ART_ITUNES_TIMEOUT", "8"))
SPOTIFY_TIMEOUT = float(os.environ.get("COVER_ART_SPOTIFY_TIMEOUT", "10"))
CACHE_TTL_SUCCESS = int(os.environ.get("COVER_ART_CACHE_TTL", "86400"))  # 24h


def cover_art_artist_name() -> str:
    """Artist string used in iTunes/Spotify searches (settings.COVER_ART_ARTIST)."""
    return getattr(settings, "COVER_ART_ARTIST", "Saintted") or "Saintted"


def _cache_key_for_track(track_pk: int) -> str:
    artist = cover_art_artist_name()
    safe = "".join(c if c.isalnum() else "_" for c in artist.lower())[:48]
    return f"cover_art:track:{track_pk}:{safe}"


def _upgrade_itunes_artwork(url: str) -> str:
    if not url:
        return ""
    # Higher resolution (Apple CDN pattern)
    return (
        url.replace("100x100bb", "600x600bb")
        .replace("200x200bb", "600x600bb")
        .replace("300x300bb", "600x600bb")
    )


def fetch_itunes_artwork_url(title: str, artist: str | None = None) -> str:
    if artist is None:
        artist = cover_art_artist_name()
    """Public iTunes Search API — same catalog as Apple Music storefront."""
    term = urllib.parse.quote(f"{artist} {title}".strip())
    url = f"https://itunes.apple.com/search?term={term}&entity=song&limit=15&country=us"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=ITUNES_TIMEOUT) as resp:
            payload = json.load(resp)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as e:
        logger.debug("iTunes cover lookup failed: %s", e)
        return ""

    results = payload.get("results") or []
    if not results:
        return ""

    title_norm = title.strip().lower()
    artist_norm = artist.strip().lower()

    def artist_matches(aname: str) -> bool:
        a = (aname or "").lower()
        if not a or not artist_norm:
            return False
        if artist_norm in a or a in artist_norm:
            return True
        a_c = a.replace(" ", "")
        cfg_c = artist_norm.replace(" ", "")
        if len(cfg_c) >= 4 and cfg_c in a_c:
            return True
        if len(cfg_c) >= 4 and len(a_c) >= 4 and cfg_c[:4] == a_c[:4]:
            return True
        return False

    def title_matches(tname: str) -> bool:
        t = (tname or "").lower()
        if not t:
            return False
        return title_norm in t or t in title_norm or t.replace(" ", "") == title_norm.replace(
            " ", ""
        )

    best_any = ""
    for r in results:
        raw = r.get("artworkUrl100") or ""
        if not raw:
            continue
        upgraded = _upgrade_itunes_artwork(raw)
        if not best_any:
            best_any = upgraded
        tname = r.get("trackName") or ""
        aname = r.get("artistName") or ""
        if title_matches(tname) and artist_matches(aname):
            return upgraded

    return best_any


def _spotify_client_token() -> str:
    cid = os.environ.get("SPOTIFY_CLIENT_ID", "").strip()
    secret = os.environ.get("SPOTIFY_CLIENT_SECRET", "").strip()
    if not cid or not secret:
        return ""

    auth = base64.b64encode(f"{cid}:{secret}".encode()).decode()
    body = urllib.parse.urlencode({"grant_type": "client_credentials"}).encode()
    req = urllib.request.Request(
        "https://accounts.spotify.com/api/token",
        data=body,
        headers={
            "Authorization": f"Basic {auth}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=SPOTIFY_TIMEOUT) as resp:
            data = json.load(resp)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError, KeyError) as e:
        logger.debug("Spotify token failed: %s", e)
        return ""

    return (data.get("access_token") or "").strip()


def fetch_spotify_artwork_url(title: str, artist: str | None = None) -> str:
    if artist is None:
        artist = cover_art_artist_name()
    token = _spotify_client_token()
    if not token:
        return ""

    def _q(s: str) -> str:
        return (s or "").replace('"', " ").strip()

    q = f'artist:"{_q(artist)}" track:"{_q(title)}"'
    params = urllib.parse.urlencode({"q": q, "type": "track", "limit": "5"})
    url = f"https://api.spotify.com/v1/search?{params}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=SPOTIFY_TIMEOUT) as resp:
            payload = json.load(resp)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as e:
        logger.debug("Spotify cover lookup failed: %s", e)
        return ""

    items = (payload.get("tracks") or {}).get("items") or []
    title_norm = title.strip().lower()
    for item in items:
        name = (item.get("name") or "").lower()
        if title_norm not in name and name not in title_norm:
            continue
        album = item.get("album") or {}
        images = album.get("images") or []
        if not images:
            continue
        # Prefer largest
        sorted_imgs = sorted(images, key=lambda x: x.get("width") or 0, reverse=True)
        u = (sorted_imgs[0].get("url") or "").strip()
        if u:
            return u

    if items:
        album = items[0].get("album") or {}
        for img in sorted(
            album.get("images") or [],
            key=lambda x: x.get("width") or 0,
            reverse=True,
        ):
            u = (img.get("url") or "").strip()
            if u:
                return u
    return ""


def resolve_external_cover_url(track) -> str:
    """
    Return HTTPS artwork URL or empty string. Uses cache per track id when available.
    """
    raw = (getattr(track, "art_url", None) or "").strip()
    if raw:
        return raw

    cache_key = _cache_key_for_track(track.pk)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    title = getattr(track, "title", "") or ""
    if not title.strip():
        return ""

    artist = cover_art_artist_name()
    url = fetch_itunes_artwork_url(title, artist)
    if not url:
        url = fetch_spotify_artwork_url(title, artist)

    if url:
        cache.set(cache_key, url, CACHE_TTL_SUCCESS)
    return url or ""
