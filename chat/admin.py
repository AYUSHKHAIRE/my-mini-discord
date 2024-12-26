from django.contrib import admin

# Register your models here.
from .models import Desk,Message

admin.site.register(Desk)
admin.site.register(Message)