# chat/routing.py
from django.urls import path

from . import consumers

websocket_urlpatterns = [
    path("ws/<str:desk_id>/", consumers.ChatConsumer.as_asgi()),
]
