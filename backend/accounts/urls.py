from django.urls import path

from .views import CompanyUserDetailView, CompanyUsersView, GoogleLoginView, MeView, MembersView


urlpatterns = [
    path("google/", GoogleLoginView.as_view(), name="google-login"),
    path("me/", MeView.as_view(), name="me"),
    path("members/", MembersView.as_view(), name="members"),
    path("users/", CompanyUsersView.as_view(), name="company-users"),
    path("users/<int:pk>/", CompanyUserDetailView.as_view(), name="company-user-detail"),
]
