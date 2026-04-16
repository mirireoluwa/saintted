from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve as media_serve


def public_root(_request):
    """
    Lets you verify traffic hits this Django app (not a static site on the same hostname).
    Repo-root index.html must never be served from this image — if you still see that HTML,
    Railway is not routing this hostname to this container.
    """
    return JsonResponse(
        {"service": "saintted-api", "framework": "django", "api": "/api/"},
        headers={"Cache-Control": "no-store"},
    )


urlpatterns = [
    path("", public_root),
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
    re_path(r"^media/(?P<path>.*)$", media_serve, {"document_root": settings.MEDIA_ROOT}),
]
