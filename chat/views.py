from django.shortcuts import render,get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from .models import Desk,Message
from datetime import datetime
import json
from django.contrib.auth.models import User

@login_required
def get_desk_list(request):
    user = request.user  
    all_desks = Desk.objects.filter(participants=user)  
    chatdict = {'data': []}

    for desk in all_desks:
        participants = desk.participants.all()  
        participant_usernames = [participant.username for participant in participants if participant != user]
        strinngusers = ''
        if len(participant_usernames) <= 2:
            strinngusers = participant_usernames[0]
        else:
            strinngusers = f'{participant_usernames[0]} and {desk.members - 2} others'
        new_messages = 0
        desk_messages = Message.objects.filter(desk=desk)
        desk_messages = [ msg for msg in desk_messages ]
        for dm in desk_messages:
            all_readers = dm.read_by.all()
            all_readers = [reader for reader in all_readers]
            if user not in all_readers:
                new_messages += 1
        if len(desk_messages) > 0:
            latest_message = f'{desk_messages[-1].sender.username} : {desk_messages[-1].content}'
        else:
            latest_message = "No new messages"
        chatdict['data'].append({
            'id': desk.long_id,
            'new_messages': new_messages,
            'participants':strinngusers,  
            'latest_message':latest_message
        })
    return JsonResponse(chatdict)

@login_required
def get_messages_for_desk(request, desk_id):
    user = request.user
    desk_obj = get_object_or_404(Desk, long_id=desk_id)
    members = desk_obj.members
    all_messages = Message.objects.filter(desk=desk_obj)
    message_dict = {'data': []}
    all_participants = desk_obj.participants.all()
    participant_usernames = [participant.username for participant in all_participants if participant != user]
    
    sender = None
    if desk_obj.members > 2:
        sender = f'{participant_usernames[0]} and {desk_obj.members - 2} others'
        print(sender)
    else:
        sender = participant_usernames[0]
        print(sender)
    profile = ''  
    if not all_messages.exists():
        return JsonResponse({'data': [], 'sender': sender, 'profile': profile})
    for m in all_messages:
        reply_to = None
        reply_to_message_conteent = None
        timestamps = m.timestamp.isoformat()
        all_readers = m.read_by.all()
        all_readers = [reader for reader in all_readers]
        read_by_user = False
        if user in all_readers:
            read_by_user = True
        if m.reply_to:
            reply_to = m.reply_to.message_id
            reply_to_message_conteent = m.reply_to.content
        message_dict['data'].append(
            {
                'day' : timestamps[2:10],
                'time' : timestamps[11:16],
                'content': m.content,
                'sender': m.sender.username,
                'receiver': user.username,
                'read_by_user':read_by_user,
                'message_id':m.message_id,
                'reply_to':reply_to,
                'reply_to_message_content':reply_to_message_conteent
            }
        )
    
    message_dict['sender'] = sender
    message_dict['profile'] = profile
    message_dict['members'] = members

    return JsonResponse(message_dict)

@login_required
def create_new_chat(request, Username):
    if request.method == "POST":
        user = request.user
        try:
            new_user = User.objects.get(username=Username)
        except User.DoesNotExist:
            return JsonResponse({'error': 'User does not exist'}, status=400)

        if user == new_user:
            return JsonResponse({'error': 'Cannot create a chat with yourself'}, status=400)

        existing_desk = Desk.objects.filter(
            participants=user
        ).filter(participants=new_user, members=2).first()
        if existing_desk:
            return JsonResponse({'error': 'Desk already exists'}, status=400)

        new_desk = Desk.objects.create(members=2)
        new_desk.participants.add(user, new_user)
        deskid = new_desk.save()

        return JsonResponse({'status': 'ok', 'message': 'New desk created successfully',"deskid":deskid})

    return JsonResponse({'error': 'Invalid request method'}, status=405)