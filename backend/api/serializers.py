import logging

from django.utils.text import slugify
from rest_framework import serializers
from rest_framework.fields import empty

from .cover_art import resolve_external_cover_url
from .media_urls import public_media_url
from .models import FeaturedVideo, GalleryImage, MailingListSubscriber, ReleaseCountdown, Track

logger = logging.getLogger(__name__)


class TrackSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False, allow_blank=True)
    art_file = serializers.ImageField(required=False, allow_null=True, write_only=True)
    clear_art_file = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = Track
        fields = [
            "id", "title", "slug", "meta", "art_url", "art_file", "clear_art_file", "link_url", "order",
            "description", "year", "youtube_url", "apple_music_url", "spotify_url",
            "is_published", "is_highlighted",
            "is_unreleased", "release_at", "presave_url",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        try:
            if instance.art_file:
                url = instance.art_file.url
                data["art_url"] = public_media_url(request, url)
                return data
            if (data.get("art_url") or "").strip():
                return data
            external = resolve_external_cover_url(instance)
            if external:
                data["art_url"] = external
        except Exception as e:
            # One bad row (storage URL, iTunes/Spotify payload, etc.) must not 500 the whole list.
            logger.warning("TrackSerializer.to_representation pk=%s: %s", instance.pk, e)
        return data

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        unreleased = attrs.get("is_unreleased", instance.is_unreleased if instance else False)
        release_at = attrs.get("release_at", empty)
        if release_at is empty:
            release_at = instance.release_at if instance else None
        if unreleased and not release_at:
            raise serializers.ValidationError(
                {"release_at": "Set a release date and time when the track is marked unreleased."}
            )
        return attrs

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
        validated_data.pop("clear_art_file", False)
        art_file = validated_data.pop("art_file", None)
        raw_slug = (validated_data.get("slug") or "").strip()
        if not raw_slug:
            base = slugify(validated_data["title"]) or "track"
            validated_data["slug"] = self._unique_slug(base)
        else:
            validated_data["slug"] = raw_slug
        instance = super().create(validated_data)
        if art_file is not None:
            instance.art_file = art_file
            instance.save(update_fields=["art_file"])
        return instance

    def update(self, instance, validated_data):
        if "slug" in validated_data and not (validated_data.get("slug") or "").strip():
            validated_data.pop("slug", None)
        clear_art = validated_data.pop("clear_art_file", False)
        art_file = validated_data.pop("art_file", None)
        if clear_art:
            if instance.art_file:
                instance.art_file.delete(save=False)
            instance.art_file = None
        instance = super().update(instance, validated_data)
        if art_file is not None:
            if instance.art_file:
                instance.art_file.delete(save=False)
            instance.art_file = art_file
            instance.save(update_fields=["art_file"])
        elif clear_art:
            instance.save(update_fields=["art_file"])
        return instance


class TrackDetailSerializer(TrackSerializer):
    """Retrieve-only extras: neighbor slugs so the client can enable prev/next without loading the full list."""

    previous_slug = serializers.SerializerMethodField()
    next_slug = serializers.SerializerMethodField()

    class Meta(TrackSerializer.Meta):
        fields = [*TrackSerializer.Meta.fields, "previous_slug", "next_slug"]

    def _visible_queryset(self):
        qs = Track.objects.all()
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if user and user.is_authenticated:
            return qs
        return qs.filter(is_published=True)

    def get_previous_slug(self, obj):
        # For an unreleased detail page, navigation should move through released tracks.
        if obj.is_unreleased:
            return (
                self._visible_queryset()
                .filter(is_unreleased=False)
                .order_by("is_highlighted", "-order", "-id")
                .values_list("slug", flat=True)
                .first()
            )
        return (
            self._visible_queryset()
            .filter(order__lt=obj.order)
            .order_by("-order")
            .values_list("slug", flat=True)
            .first()
        )

    def get_next_slug(self, obj):
        # From unreleased -> "next" should land on the first released track in homepage flow
        # (highlighted release first, then regular released tracks by order).
        if obj.is_unreleased:
            return (
                self._visible_queryset()
                .filter(is_unreleased=False)
                .order_by("-is_highlighted", "order", "id")
                .values_list("slug", flat=True)
                .first()
            )
        return (
            self._visible_queryset()
            .filter(order__gt=obj.order)
            .order_by("order")
            .values_list("slug", flat=True)
            .first()
        )


class FeaturedVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeaturedVideo
        fields = ["id", "title", "youtube_id", "order"]


class GalleryImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = GalleryImage
        fields = ["id", "image", "image_url", "external_url", "caption", "order", "created_at"]
        read_only_fields = ["created_at"]

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get("request")
            return public_media_url(request, obj.image.url)
        return (obj.external_url or "").strip()


class ReleaseCountdownSerializer(serializers.ModelSerializer):
    header_image_file = serializers.FileField(required=False, allow_null=True, write_only=True)
    header_image_file_url = serializers.SerializerMethodField(read_only=True)
    clear_header_image_file = serializers.BooleanField(write_only=True, required=False, default=False)
    header_video_file = serializers.FileField(required=False, allow_null=True, write_only=True)
    header_video_file_url = serializers.SerializerMethodField(read_only=True)
    clear_header_video_file = serializers.BooleanField(write_only=True, required=False, default=False)

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
            "header_video_url",
            "header_video_file",
            "header_video_file_url",
            "clear_header_video_file",
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
        return public_media_url(request, obj.header_image_file.url)

    def get_header_video_file_url(self, obj):
        if not obj.header_video_file:
            return ""
        request = self.context.get("request")
        return public_media_url(request, obj.header_video_file.url)

    def update(self, instance, validated_data):
        clear_file = validated_data.pop("clear_header_image_file", False)
        clear_video = validated_data.pop("clear_header_video_file", False)
        if clear_file:
            if instance.header_image_file:
                instance.header_image_file.delete(save=False)
            instance.header_image_file = None
        if clear_video:
            if instance.header_video_file:
                instance.header_video_file.delete(save=False)
            instance.header_video_file = None
        return super().update(instance, validated_data)


class MailingListSubscriberSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(max_length=100, trim_whitespace=True)
    last_name = serializers.CharField(max_length=100, trim_whitespace=True)
    email = serializers.EmailField()

    class Meta:
        model = MailingListSubscriber
        fields = ["first_name", "last_name", "email"]
