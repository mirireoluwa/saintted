import secrets

from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView


class AdminPasswordResetView(APIView):
    """
    Resets a user's password and returns the generated password.

    Production safety:
    - Requires RESET_PASSWORD_SECRET when DEBUG=False.
    - Intended for emergency admin access recovery.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = str(request.data.get("username", "")).strip()
        provided_secret = str(request.data.get("reset_secret", "")).strip()
        required_secret = str(getattr(settings, "RESET_PASSWORD_SECRET", "")).strip()

        if not username:
            return Response(
                {"detail": "Username is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not settings.DEBUG:
            if not required_secret:
                return Response(
                    {"detail": "Password reset is not configured on this server."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if provided_secret != required_secret:
                return Response(
                    {"detail": "Invalid reset secret."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        User = get_user_model()
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        new_password = secrets.token_urlsafe(12)
        user.set_password(new_password)
        user.save(update_fields=["password"])

        return Response(
            {
                "username": username,
                "new_password": new_password,
                "detail": "Password reset successful.",
            }
        )

