from django.db import models


class Track(models.Model):
    """A music track (single, EP, etc.)."""
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    meta = models.CharField(max_length=128, help_text="e.g. Single, Single (Sound), EP")
    art_url = models.URLField(blank=True, help_text="Cover art image URL")
    link_url = models.URLField(blank=True, help_text="Streaming or purchase link")
    order = models.PositiveIntegerField(default=0, help_text="Display order (lower first)")
    # Detail page
    description = models.TextField(blank=True, help_text="About the song")
    year = models.PositiveIntegerField(null=True, blank=True, help_text="Release year")
    youtube_url = models.URLField(blank=True)
    apple_music_url = models.URLField(blank=True)
    spotify_url = models.URLField(blank=True)

    class Meta:
        ordering = ["order", "title"]

    def __str__(self) -> str:
        return self.title


class FeaturedVideo(models.Model):
    """A featured YouTube video for the home page."""
    title = models.CharField(max_length=255, blank=True, help_text="Optional display title")
    youtube_id = models.CharField(max_length=20, help_text="YouTube video ID (e.g. from watch?v=VIDEO_ID)")
    order = models.PositiveIntegerField(default=0, help_text="Display order (lower first)")

    class Meta:
        ordering = ["order", "title"]

    def __str__(self) -> str:
        return self.title or self.youtube_id
