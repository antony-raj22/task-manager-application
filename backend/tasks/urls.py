from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AdminSummaryView, CalendarTaskView, NotificationViewSet, TaskViewSet


router = DefaultRouter()
router.register("tasks", TaskViewSet, basename="tasks")
router.register("notifications", NotificationViewSet, basename="notifications")

urlpatterns = [
    path("", include(router.urls)),
    path("calendar/", CalendarTaskView.as_view(), name="calendar"),
    path("admin/summary/", AdminSummaryView.as_view(), name="admin-summary"),
]
