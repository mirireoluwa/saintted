from django.utils.text import slugify
from rest_framework import serializers

from .cover_art import resolve_external_cover_url
from .models import FeaturedVideo, GalleryImage, ReleaseCountdown, Track


class TrackSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False, allow_blank=True)

    class Meta:
        model = Track
        fields = [
            "id", "title", "slug", "meta", "art_url", "link_url", "order",
            "description", "year", "youtube_url", "apple_music_url", "spotify_url",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if (data.get("art_url") or "").strip():
            return data
        external = resolve_external_cover_url(instance)
        if external:
            data["art_url"] = external
        return data

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


class GalleryImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = GalleryImage
        fields = ["id", "image", "image_url", "caption", "order", "created_at"]
        read_only_fields = ["created_at"]

    def get_image_url(self, obj):
        if not obj.image:
            return ""
        request = self.context.get("request")
        url = obj.image.url
        return request.build_absolute_uri(url) if request else url


class ReleaseCountdownSerializer(serializers.ModelSerializer):
    header_image_file = serializers.FileField(required=False, allow_null=True, write_only=True)
    header_image_file_url = serializers.SerializerMethodField(read_only=True)
    clear_header_image_file = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = ReleaseCountdown
        fields = [
            "id",
            "enabled",
            "song_title",
            "release_at",
            "presave_url",
            "header_image_url",
            "header_image_crop",
            "header_image_file",
            "header_image_file_url",
            "clear_header_image_file",
            "header_image_focus_x",
            "header_image_focus_y",
        ]

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        enabled = attrs.get("enabled", getattr(instance, "enabled", False) if instance else False)
        release_at = attrs.get("release_at", getattr(instance, "release_at", None) if instance else None)
        if enabled and not release_at:
            raise serializers.ValidationError(
                {"release_at": "Set a drop date when the countdown is enabled."}
            )
        return attrs

    def get_header_image_file_url(self, obj):
        if not obj.header_image_file:
            return ""
        request = self.context.get("request")
        url = obj.header_image_file.url
        return request.build_absolute_uri(url) if request else url

    def update(self, instance, validated_data):
        clear_file = validated_data.pop("clear_header_image_file", False)
        if clear_file:
            if instance.header_image_file:
                instance.header_image_file.delete(save=False)
            instance.header_image_file = None
        return super().update(instance, validated_data)
