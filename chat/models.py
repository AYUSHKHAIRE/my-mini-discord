import uuid
from django.db import models
from django.contrib.auth.models import User

class Desk(models.Model):
    long_id = models.CharField(max_length=36, unique=True, editable=False, blank=True, null=True)  # Allow nulls temporarily
    participants = models.ManyToManyField(User, related_name='desk')
    created_at = models.DateTimeField(auto_now_add=True)
    members = models.IntegerField(default=0)
    new_message = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.long_id:
            import uuid
            self.long_id = str(uuid.uuid4())
        super().save(*args, **kwargs)
        return self.long_id

    def participants_summary(self):
        """Return a summary of participants: first two names and 'and x others'."""
        participant_names = list(self.participants.values_list('username', flat=True))
        if len(participant_names) == 0:
            return "No participants"
        elif len(participant_names) <= 2:
            return ", ".join(participant_names)
        else:
            return f"{', '.join(participant_names[:2])}, and {len(participant_names) - 2} others"

    def __str__(self):
        return f"Desk ({self.long_id}): {self.participants_summary()}"
    
class Message(models.Model):
    desk = models.ForeignKey(Desk, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    read_by = models.ManyToManyField(User, related_name='read_by')
    message_id = models.CharField(max_length=36, unique=True, blank=True, null=True)  # Editable in the admin
    reply_to = models.ForeignKey('self', on_delete=models.CASCADE, blank=True, null=True, related_name='replies')

    def save(self, *args, **kwargs):
        if not self.message_id:
            import uuid
            self.message_id = f"message_{uuid.uuid4()}"
        super().save(*args, **kwargs)
        if not self.read_by.filter(id=self.sender.id).exists():  # Avoid duplicates
            self.read_by.add(self.sender)

    def __str__(self):
        return f"Message from {self.sender.username} at {self.timestamp}"

    class Meta:
        ordering = ['timestamp']
