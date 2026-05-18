from django.urls import path

from .views import GoogleLoginView, MeView, MembersView


urlpatterns = [
    path("google/", GoogleLoginView.as_view(), name="google-login"),
    path("me/", MeView.as_view(), name="me"),
    path("members/", MembersView.as_view(), name="members"),
]
