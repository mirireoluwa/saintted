from rest_framework import generics, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from .models import FeaturedVideo, GalleryImage, ReleaseCountdown, Track
from .permissions import ReadOnlyOrAuthenticated
from .serializers import (
    FeaturedVideoSerializer,
    GalleryImageSerializer,
    ReleaseCountdownSerializer,
    TrackSerializer,
)


class TrackViewSet(viewsets.ModelViewSet):
    """
    List/retrieve/update tracks. Public GET; POST/PATCH/PUT/DELETE need token auth.
    Detail by slug: /api/tracks/<slug>/
    """
    queryset = Track.objects.all()
    serializer_class = TrackSerializer
    permission_classes = [ReadOnlyOrAuthenticated]
    lookup_field = "slug"
    lookup_url_kwarg = "slug"


class FeaturedVideoViewSet(viewsets.ModelViewSet):
    """Featured YouTube videos: public GET; writes need authentication."""
    queryset = FeaturedVideo.objects.all()
    serializer_class = FeaturedVideoSerializer
    permission_classes = [ReadOnlyOrAuthenticated]


class GalleryImageViewSet(viewsets.ModelViewSet):
    """Public gallery images: public GET; writes need authentication."""
    queryset = GalleryImage.objects.all()
    serializer_class = GalleryImageSerializer
    permission_classes = [ReadOnlyOrAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]


class ReleaseCountdownDetailView(generics.RetrieveUpdateAPIView):
    """
    Singleton settings for home-page release countdown + pre-save link.
    GET is public; PATCH/PUT require authentication.
    """
    serializer_class = ReleaseCountdownSerializer
    permission_classes = [ReadOnlyOrAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        obj, _ = ReleaseCountdown.objects.get_or_create(
            pk=1,
            defaults={
                "enabled": False,
                "song_title": "",
                "release_at": None,
                "presave_url": "",
                "header_image_url": "",
                "header_image_crop": "center",
                "header_image_focus_x": 50.0,
                "header_image_focus_y": 50.0,
            },
        )
        return obj
