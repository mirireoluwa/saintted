from django.contrib import admin

from .models import FeaturedVideo, ReleaseCountdown, Track


@admin.register(FeaturedVideo)
class FeaturedVideoAdmin(admin.ModelAdmin):
    list_display = ["title", "youtube_id", "order"]
    list_editable = ["order"]


@admin.register(ReleaseCountdown)
class ReleaseCountdownAdmin(admin.ModelAdmin):
    list_display = ["enabled", "song_title", "release_at", "presave_url"]
    fields = ["enabled", "song_title", "release_at", "presave_url"]

    def has_add_permission(self, request):
        # Prefer singleton pk=1 from migration; allow add only if table is empty
        return ReleaseCountdown.objects.count() == 0

    def has_delete_permission(self, request, obj=None):
        return False


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
