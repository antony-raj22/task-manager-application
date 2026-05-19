from django.conf import settings
from django.contrib.auth.models import User
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from rest_framework import permissions, status
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Profile
from .serializers import CompanyUserCreateSerializer, CompanyUserUpdateSerializer, UserSerializer
from tasks.permissions import IsAdminOrTLRole, IsAdminUserRole, is_admin_user, is_tl_user


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

        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            return Response(
                {"detail": "Access denied. Ask the admin to add your company account first."},
                status=status.HTTP_403_FORBIDDEN,
            )

        Profile.objects.get_or_create(user=user, defaults={"role": Profile.Role.MEMBER})
        updated_fields = []
        first_name = payload.get("given_name", "")
        last_name = payload.get("family_name", "")
        if first_name and not user.first_name:
            user.first_name = first_name
            updated_fields.append("first_name")
        if last_name and not user.last_name:
            user.last_name = last_name
            updated_fields.append("last_name")
        if updated_fields:
            user.save(update_fields=updated_fields)

        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": UserSerializer(user).data})


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class MembersView(APIView):
    permission_classes = [IsAdminOrTLRole]

    def get(self, request):
        users = User.objects.order_by("first_name", "username")
        if is_tl_user(request.user) and not is_admin_user(request.user):
            users = users.filter(is_active=True, teams__lead=request.user).distinct()
        return Response(UserSerializer(users, many=True).data)


class CompanyUsersView(APIView):
    permission_classes = [IsAdminUserRole]

    def post(self, request):
        serializer = CompanyUserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class CompanyUserDetailView(APIView):
    permission_classes = [IsAdminUserRole]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"detail": "Company user not found."}, status=status.HTTP_404_NOT_FOUND)
        if user.is_staff or user.is_superuser:
            return Response({"detail": "Admin users must be edited in Django admin."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CompanyUserUpdateSerializer(user, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        updated_user = serializer.save()
        return Response(UserSerializer(updated_user).data)
