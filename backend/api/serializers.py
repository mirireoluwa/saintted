from django.utils.text import slugify
from rest_framework import serializers
from .models import Track, FeaturedVideo


class TrackSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False, allow_blank=True)

    class Meta:
        model = Track
        fields = [
            "id", "title", "slug", "meta", "art_url", "link_url", "order",
            "description", "year", "youtube_url", "apple_music_url", "spotify_url",
        ]

    def _unique_slug(self, base: str) -> str:
        base = (base or "track").strip() or "track"
        if not Track.objects.filter(slug=base).exists():
            return base
        n = 2
        while True:
            candidate = f"{base}-{n}"
            if not Track.objects.filter(slug=candidate).exists():
                return candidate
            n += 1

    def create(self, validated_data):
        raw_slug = (validated_data.get("slug") or "").strip()
        if not raw_slug:
            base = slugify(validated_data["title"]) or "track"
            validated_data["slug"] = self._unique_slug(base)
        else:
            validated_data["slug"] = raw_slug
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "slug" in validated_data and not (validated_data.get("slug") or "").strip():
            validated_data.pop("slug", None)
        return super().update(instance, validated_data)


class FeaturedVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeaturedVideo
        fields = ["id", "title", "youtube_id", "order"]
