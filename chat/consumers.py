import json
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from .models import Desk, Message
from django.contrib.auth.models import User

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.desk_id = self.scope['url_route']['kwargs']['desk_id']
        self.room_group_name = f'desk_{self.desk_id}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        if not text_data:
            print("Received empty text_data")
            return

        print("received data from the endpoint")
        try:
            text_data_json = json.loads(text_data)
        except json.JSONDecodeError as e:
            print(f"Invalid JSON received: {text_data}. Error: {e}")
            return

        data = text_data_json.get('data', {})
        if data['type'] == "chat_message":
            try:
                print(data)
                sent_by = await sync_to_async(User.objects.get)(username=data['sender'].strip())
            except User.DoesNotExist:
                print(f"User with username '{data['username']}' does not exist.")
                return
            try:
                desk = await sync_to_async(Desk.objects.get)(long_id=data['deskid'])
            except Desk.DoesNotExist:
                print(f"Desk with ID '{data['deskid']}' does not exist.")
                return
            message_id , timestamp = await self.save_message(
                desk=desk,
                user=sent_by,
                message=data['message'],
                reply_to = data['reply_to']
            )
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',  
                    'message': data['message'],
                    'username': sent_by.username,
                    'deskid': desk.long_id,
                    'message_id':message_id,
                    'timestamp':timestamp.strftime(format="%H:%M"),
                    'reply_to' : data['reply_to']
                }
            )
            print("Chat data sent to the room group")
        
        elif data['type'] == "typing":
            try:
                print(data)
                sent_by = await sync_to_async(User.objects.get)(username=data['sender'].replace(' ','').replace('\n','').strip())
            except User.DoesNotExist:
                print(f"User with username '{data['username']}' does not exist.")
                return
            try:
                desk = await sync_to_async(Desk.objects.get)(long_id=data['deskid'])
            except Desk.DoesNotExist:
                print(f"Desk with ID '{data['deskid']}' does not exist.")
                return
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing',
                    'message': 'Typing ...',
                    'username': sent_by.username,
                    'deskid': desk.long_id
                }
            )
            print("Typing data sent to the room group")
            
        elif data['type'] == "mark_as_read":
            try:
                sent_by = await sync_to_async(User.objects.get)(username=data['sender'].strip())
            except User.DoesNotExist:
                print(f"User with username '{data['username']}' does not exist.")
                return
            try:
                message = await sync_to_async(Message.objects.get)(message_id=data['message_id'].strip())
            except Message.DoesNotExist:
                print(f"Message with ID '{data['message_id']}' does not exist.")
                return
            await sync_to_async(message.read_by.add)(sent_by)
            print(data)
            print(f"Marked message '{data['message_id']}' as read by '{data['sender']}'.")

    async def chat_message(self, event):
        print(event)
        message = event['message']
        username = event['username']
        deskid = event['deskid']
        type_ = event['type']
        message_id = event['message_id']
        timestamp = event['timestamp']
        reply_to = event['reply_to']
        data_to_send = {
            'message': message,
            'username': username,
            'deskid': deskid,
            'type': type_,
            'message_id':message_id,
            'timestamp':timestamp,
            'reply_to':reply_to
        }
        await self.send(text_data=json.dumps({
            'data': data_to_send
        }))
        print("Data sent to the socket")

    async def typing(self, event):
        print(event)
        sender = event['username']
        deskid = event['deskid']
        type_ = event['type']
        data_to_send = {
            'message': event['message'],
            'sender': sender,
            'deskid': deskid,
            'type': type_
        }
        await self.send(text_data=json.dumps({
            'data': data_to_send
        }))
        print("Typing data sent to the socket")

    @sync_to_async
    def save_message(self, desk, user, message,reply_to):
        print("Saving message")
        replying_to_message  = None
        if reply_to is not None:
            replying_to_message = Message.objects.get(message_id = reply_to)
        new_message = Message.objects.create(desk=desk, sender=user, content=message,reply_to = replying_to_message)
        message_id , timestamp = new_message.message_id,new_message.timestamp
        new_message.save()
        return message_id,timestamp
