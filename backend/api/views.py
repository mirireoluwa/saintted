from rest_framework import viewsets

from .models import Track, FeaturedVideo
from .permissions import ReadOnlyOrAuthenticated
from .serializers import TrackSerializer, FeaturedVideoSerializer


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
