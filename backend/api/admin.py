from django.contrib import admin

from .models import FeaturedVideo, GalleryImage, ReleaseCountdown, Track


@admin.register(FeaturedVideo)
class FeaturedVideoAdmin(admin.ModelAdmin):
    list_display = ["title", "youtube_id", "order"]
    list_editable = ["order"]


@admin.register(ReleaseCountdown)
class ReleaseCountdownAdmin(admin.ModelAdmin):
    list_display = [
        "enabled",
        "song_title",
        "release_at",
        "presave_url",
        "header_image_crop",
        "header_video_url",
    ]
    fields = [
        "enabled",
        "song_title",
        "release_at",
        "presave_url",
        "header_image_url",
        "header_image_file",
        "header_video_url",
        "header_video_file",
        "header_image_crop",
        "header_image_focus_x",
        "header_image_focus_y",
    ]

    def has_add_permission(self, request):
        # Prefer singleton pk=1 from migration; allow add only if table is empty
        return ReleaseCountdown.objects.count() == 0

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(GalleryImage)
class GalleryImageAdmin(admin.ModelAdmin):
    list_display = ["id", "caption", "order", "created_at"]
    list_editable = ["order"]


@admin.register(Track)
class TrackAdmin(admin.ModelAdmin):
    list_display = ["title", "meta", "year", "order", "is_published", "is_unreleased", "is_highlighted"]
    list_editable = ["order", "is_published", "is_unreleased", "is_highlighted"]
    list_filter = ["year", "is_published", "is_unreleased", "is_highlighted"]
    prepopulated_fields = {"slug": ("title",)}
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "title",
                    "slug",
                    "meta",
                    "order",
                    "is_published",
                    "is_highlighted",
                    "art_url",
                    "art_file",
                    "link_url",
                )
            },
        ),
        (
            "Unreleased / upcoming",
            {
                "fields": ("is_unreleased", "release_at", "presave_url"),
                "description": "When unreleased is checked, set release time and optional pre-save URL for the countdown page.",
            },
        ),
        ("Detail page", {"fields": ("description", "year", "youtube_url", "apple_music_url", "spotify_url")}),
    )
