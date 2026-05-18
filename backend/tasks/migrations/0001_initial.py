from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Task",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True)),
                ("status", models.CharField(choices=[("TODO", "To do"), ("IN_PROGRESS", "In progress"), ("COMPLETED", "Completed")], default="TODO", max_length=20)),
                ("priority", models.CharField(choices=[("LOW", "Low"), ("MEDIUM", "Medium"), ("HIGH", "High")], default="MEDIUM", max_length=20)),
                ("start_date", models.DateField(blank=True, null=True)),
                ("due_date", models.DateField()),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("assigned_to", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="assigned_tasks", to=settings.AUTH_USER_MODEL)),
                ("created_by", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="created_tasks", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["due_date", "-created_at"],
            },
        ),
    ]
