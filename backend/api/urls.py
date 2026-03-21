from django.urls import include, path
from rest_framework.authtoken.views import obtain_auth_token
from rest_framework.routers import DefaultRouter

from .views import FeaturedVideoViewSet, ReleaseCountdownDetailView, TrackViewSet

router = DefaultRouter()
router.register(r"tracks", TrackViewSet, basename="track")
router.register(r"featured-videos", FeaturedVideoViewSet, basename="featured-video")

urlpatterns = [
    path("auth/token/", obtain_auth_token),
    path("release-countdown/", ReleaseCountdownDetailView.as_view(), name="release-countdown"),
    path("", include(router.urls)),
]
