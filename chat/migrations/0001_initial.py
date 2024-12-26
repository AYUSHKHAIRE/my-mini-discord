# Generated by Django 5.1.4 on 2024-12-22 04:46

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Desk',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('long_id', models.CharField(blank=True, editable=False, max_length=36, null=True, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('members', models.IntegerField(default=0)),
                ('new_message', models.BooleanField(default=False)),
                ('participants', models.ManyToManyField(related_name='desk', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='Message',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('content', models.TextField()),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('message_id', models.CharField(blank=True, editable=False, max_length=36, null=True, unique=True)),
                ('desk', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='chat.desk')),
                ('read_by', models.ManyToManyField(related_name='read_by', to=settings.AUTH_USER_MODEL)),
                ('reply_to', models.ForeignKey(blank=True, editable=False, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='replies', to='chat.message')),
                ('sender', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sent_messages', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['timestamp'],
            },
        ),
    ]
