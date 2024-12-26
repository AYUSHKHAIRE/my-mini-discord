from django.urls import path, include
from . import views
urlpatterns = [
    path('available_desks/', views.get_desk_list, name='get_desk_list'),
    path('c/<str:desk_id>/', views.get_messages_for_desk, name='get_messages_for_desk'),
    path('c/new/<str:Username>/', views.create_new_chat, name='create_new_chat'),
]