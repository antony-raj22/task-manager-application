from django.conf import settings
from django.core.mail import send_mail
import logging

from .models import Notification


logger = logging.getLogger(__name__)


def create_notification(*, recipient, actor, task, kind, title, message):
    notification = Notification.objects.create(
        recipient=recipient,
        actor=actor,
        task=task,
        kind=kind,
        title=title,
        message=message,
    )
    send_notification_email(notification)
    return notification


def send_notification_email(notification):
    email = notification.recipient.email
    if not email or not settings.EMAIL_HOST_USER:
        return

    try:
        send_mail(
            subject=notification.title,
            message=notification.message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception:
        logger.exception("Failed to send task notification email to %s", email)
