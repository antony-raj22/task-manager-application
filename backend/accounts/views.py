from django.conf import settings
from django.contrib.auth.models import User
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from rest_framework import permissions, status
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Profile
from .serializers import UserSerializer
from tasks.permissions import IsAdminUserRole


class GoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        credential = request.data.get("credential")
        if not credential:
            return Response({"detail": "Google credential is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not settings.GOOGLE_CLIENT_ID:
            return Response({"detail": "GOOGLE_CLIENT_ID is not configured."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            payload = id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )
        except ValueError as exc:
            detail = "Invalid Google credential."
            if settings.DEBUG:
                detail = f"{detail} {exc}"
            return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)

        email = payload.get("email")
        if not email:
            return Response({"detail": "Google account has no email."}, status=status.HTTP_400_BAD_REQUEST)

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": email,
                "first_name": payload.get("given_name", ""),
                "last_name": payload.get("family_name", ""),
            },
        )
        if created:
            Profile.objects.get_or_create(user=user, defaults={"role": Profile.Role.MEMBER})

        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": UserSerializer(user).data})


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class MembersView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        users = User.objects.filter(is_active=True).order_by("first_name", "username")
        return Response(UserSerializer(users, many=True).data)
