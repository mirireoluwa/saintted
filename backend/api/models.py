from django.core.validators import MaxValueValidator, MinValueValidator
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


class GalleryImage(models.Model):
    """Uploaded gallery image shown on the public home page."""
    image = models.ImageField(upload_to="gallery/")
    caption = models.CharField(max_length=255, blank=True)
    order = models.PositiveIntegerField(default=0, help_text="Display order (lower first)")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "-created_at", "id"]

    def __str__(self) -> str:
        return self.caption.strip() or f"Image {self.pk}"


class ReleaseCountdown(models.Model):
    """
    Singleton row (pk=1): optional home-page countdown + pre-save link.
    Managed via SPA admin or Django admin.
    """
    enabled = models.BooleanField(default=False, help_text="Show countdown on the public site")
    song_title = models.CharField(
        max_length=255,
        blank=True,
        help_text="e.g. Single name shown above the timer",
    )
    release_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the song drops (stored in UTC; use admin timezone awareness)",
    )
    presave_url = models.URLField(
        blank=True,
        help_text="Pre-save / pre-add link (Spotify, Apple, Linkfire, etc.)",
    )
    header_image_url = models.URLField(
        blank=True,
        default="",
        help_text="Optional hero/header image URL for the public home page",
    )
    header_image_file = models.FileField(
        upload_to="hero-header/",
        blank=True,
        null=True,
        help_text="Optional uploaded hero/header image for the public home page",
    )
    header_image_crop = models.CharField(
        max_length=16,
        choices=[
            ("center", "Center"),
            ("top", "Top"),
            ("bottom", "Bottom"),
            ("left", "Left"),
            ("right", "Right"),
        ],
        default="center",
        help_text="How the hero/header image should be cropped",
    )
    header_image_focus_x = models.FloatField(
        default=50.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        help_text="Horizontal focal point in percent (0 = left, 100 = right)",
    )
    header_image_focus_y = models.FloatField(
        default=50.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        help_text="Vertical focal point in percent (0 = top, 100 = bottom)",
    )

    class Meta:
        verbose_name = "Release countdown"
        verbose_name_plural = "Release countdown"

    def __str__(self) -> str:
        return self.song_title.strip() or "Release countdown"
