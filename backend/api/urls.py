from django.urls import include, path
from rest_framework.authtoken.views import obtain_auth_token
from rest_framework.routers import DefaultRouter

from .auth_views import AdminPasswordResetView
from .views import (
    BroadcastEmailView,
    FeaturedVideoViewSet,
    GalleryImageViewSet,
    MailingListSubscribeView,
    MailingListSubscribersView,
    ReleaseCountdownDetailView,
    TrackViewSet,
    api_db_diagnostic,
    api_email_diagnostic,
)

router = DefaultRouter()
router.register(r"tracks", TrackViewSet, basename="track")
router.register(r"featured-videos", FeaturedVideoViewSet, basename="featured-video")
router.register(r"gallery-images", GalleryImageViewSet, basename="gallery-image")

urlpatterns = [
    path("diagnostic/db/", api_db_diagnostic),
    path("diagnostic/email/", api_email_diagnostic),
    path("auth/token/", obtain_auth_token),
    path("auth/reset-password/", AdminPasswordResetView.as_view(), name="auth-reset-password"),
    path("release-countdown/", ReleaseCountdownDetailView.as_view(), name="release-countdown"),
    path("mailing-list/subscribe/", MailingListSubscribeView.as_view(), name="mailing-list-subscribe"),
    path("mailing-list/subscribers/", MailingListSubscribersView.as_view(), name="mailing-list-subscribers"),
    path("mailing-list/broadcast/", BroadcastEmailView.as_view(), name="mailing-list-broadcast"),
    path("", include(router.urls)),
]
