from django.contrib import admin
from .models import Track, FeaturedVideo


@admin.register(FeaturedVideo)
class FeaturedVideoAdmin(admin.ModelAdmin):
    list_display = ["title", "youtube_id", "order"]
    list_editable = ["order"]


@admin.register(Track)
class TrackAdmin(admin.ModelAdmin):
    list_display = ["title", "meta", "year", "order"]
    list_editable = ["order"]
    list_filter = ["year"]
    prepopulated_fields = {"slug": ("title",)}
    fieldsets = (
        (None, {"fields": ("title", "slug", "meta", "order", "art_url", "link_url")}),
        ("Detail page", {"fields": ("description", "year", "youtube_url", "apple_music_url", "spotify_url")}),
    )
