import os
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from flask_cors import CORS
from dotenv import load_dotenv
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman
import jwt
import bcrypt
import datetime
import json
import re
import random
import traceback
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from db import init_db, get_db_connection
import requests

# Load environment variables
load_dotenv()
from google import genai
from google.genai import types

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

app = Flask(__name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'static', 'uploads', 'music')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# CORS restricted to frontend
raw_origins = os.getenv("ALLOWED_ORIGIN", "http://localhost:5173")
allowed_origins = [origin.strip() for origin in raw_origins.split(",")]
CORS(app, resources={r"/api/*": {"origins": allowed_origins}})

# Security headers (allow HTTP for local dev)
Talisman(app, force_https=False)

# Rate Limiter
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["100 per minute"],
    storage_uri="memory://"
)

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("Lỗi Bảo Mật: Cần cấu hình biến môi trường JWT_SECRET_KEY trong file .env trước khi chạy server.")

def token_required(f):
    def decorator(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token or not token.startswith("Bearer "):
            return jsonify({'message': 'Token is missing!'}), 401
        
        token = token.split(" ")[1]
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            current_user_id = data['user_id']
        except Exception as e:
            return jsonify({'message': 'Token is invalid!'}), 401
            
        return f(current_user_id, *args, **kwargs)
    decorator.__name__ = f.__name__
    return decorator

from services.auth_service import register_user, verify_otp_code, login_user, get_auth_ai_helper

# --- AUTH ROUTES ---
@app.route('/api/auth/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    data = request.json
    username = data.get('username')
    email = data.get('email')
    display_name = data.get('name', username)
    password = data.get('password')
    
    result = register_user(username, email, display_name, password)
    
    if result.get('status') == 'error':
        return jsonify({'message': result.get('message')}), result.get('code', 400)
    
    return jsonify({
        'message': result.get('message'), 
        'user_id': result.get('user_id')
    }), result.get('code', 200)

@app.route('/api/auth/verify', methods=['POST'])
@limiter.limit("5 per minute")
def verify_otp():
    data = request.json
    user_id = data.get('user_id')
    code = data.get('code')
    
    result = verify_otp_code(user_id, code)
    if result.get('status') == 'error':
        return jsonify({'message': result.get('message')}), result.get('code', 400)
    return jsonify({'message': result.get('message')}), result.get('code', 200)

@app.route('/api/auth/ai-helper', methods=['POST'])
def auth_ai_helper():
    data = request.json
    action = data.get('action') # 'greeting' or 'login_error'
    
    result = get_auth_ai_helper(action, data)
    return jsonify({'message': result.get('message')})


@app.route('/api/auth/login', methods=['POST'])
@limiter.limit("5 per minute")
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    result = login_user(username, password)
    if result.get('status') == 'error':
        return jsonify({'message': result.get('message')}), result.get('code', 401)
    
    return jsonify(result.get('data')), result.get('code', 200)


from services.ai_service import process_ai_subject_parsing, get_ai_system_status, process_chatbot_chat

@app.route('/api/subjects/parse', methods=['POST'])
@token_required
def api_parse_subject(current_user_id):
    data = request.json
    raw_text = data.get('raw_text', '')
    result = process_ai_subject_parsing(raw_text)
    return jsonify(result)

@app.route('/api/ai_status', methods=['GET'])
def get_ai_status():
    result = get_ai_system_status()
    return jsonify(result)

@app.route('/api/chatbot/chat', methods=['POST'])
@token_required
def api_chatbot(current_user_id):
    data = request.json
    user_message = data.get('message', '')
    chat_history = data.get('history', [])
    page_context = data.get('page_context', {})

    result = process_chatbot_chat(current_user_id, user_message, chat_history, page_context)
    return jsonify(result)

from services.subject_service import get_all_subjects, create_subject, update_subject, remove_subject

@app.route('/api/subjects', methods=['GET'])
@token_required
def get_subjects(current_user_id):
    result = get_all_subjects(current_user_id)
    return jsonify(result.get('data')), result.get('code', 200)

@app.route('/api/subjects', methods=['POST'])
@token_required
def add_subject(current_user_id):
    data = request.json
    result = create_subject(current_user_id, data)
    if result.get('status') == 'error':
        return jsonify({'message': result.get('message')}), result.get('code', 400)
    return jsonify({'message': result.get('message')}), result.get('code', 200)

@app.route('/api/subjects', methods=['PUT'])
@token_required
def edit_subject(current_user_id):
    data = request.json
    result = update_subject(current_user_id, data)
    if result.get('status') == 'error':
        return jsonify({'message': result.get('message')}), result.get('code', 400)
    return jsonify({'message': result.get('message')}), result.get('code', 200)

@app.route('/api/subjects/<int:id>', methods=['DELETE'])
@token_required
def delete_subject(current_user_id, id):
    result = remove_subject(current_user_id, id)
    return jsonify({'message': result.get('message')}), result.get('code', 200)


# --- WORK SCHEDULES ROUTES ---
from services.work_service import get_works, create_work, delete_work

@app.route('/api/works', methods=['GET', 'POST'])
@token_required
def handle_works(current_user_id):
    if request.method == 'GET':
        result = get_works(current_user_id)
        return jsonify(result.get('data')), result.get('code', 200)
        
    elif request.method == 'POST':
        data = request.json
        result = create_work(current_user_id, data)
        return jsonify({'message': result.get('message')}), result.get('code', 200)

@app.route('/api/works/<int:id>', methods=['DELETE'])
@token_required
def delete_work_route(current_user_id, id):
    result = delete_work(current_user_id, id)
    return jsonify({'message': result.get('message')}), result.get('code', 200)


# --- GROUPS ROUTES ---
from services.group_service import get_groups, create_group, add_group_member, get_group_schedule, create_group_meeting, get_user_meetings

@app.route('/api/groups', methods=['GET', 'POST'])
@token_required
def handle_groups(current_user_id):
    if request.method == 'GET':
        result = get_groups(current_user_id)
        return jsonify(result.get('data')), result.get('code', 200)
        
    if request.method == 'POST':
        name = request.json.get('name')
        result = create_group(current_user_id, name)
        return jsonify({'message': result.get('message'), 'id': result.get('id')}), result.get('code', 200)

@app.route('/api/groups/<int:group_id>/members', methods=['POST'])
@token_required
def add_group_member_route(current_user_id, group_id):
    target_username = request.json.get('username')
    result = add_group_member(current_user_id, group_id, target_username)
    if result.get('status') == 'error':
        return jsonify({'error': result.get('error')}), result.get('code', 400)
    return jsonify({'message': result.get('message')}), result.get('code', 200)

@app.route('/api/groups/<int:group_id>/schedule', methods=['GET'])
@token_required
def get_group_schedule_route(current_user_id, group_id):
    result = get_group_schedule(current_user_id, group_id)
    if result.get('status') == 'error':
        return jsonify({'error': result.get('error')}), result.get('code', 400)
    return jsonify(result.get('data')), result.get('code', 200)

@app.route('/api/groups/<int:group_id>/meetings', methods=['POST'])
@token_required
def create_group_meeting_route(current_user_id, group_id):
    data = request.json
    result = create_group_meeting(current_user_id, group_id, data)
    if result.get('status') == 'error':
        return jsonify({'error': result.get('error')}), result.get('code', 400)
    return jsonify({'message': result.get('message')}), result.get('code', 200)

@app.route('/api/meetings', methods=['GET'])
@token_required
def get_user_meetings_route(current_user_id):
    result = get_user_meetings(current_user_id)
    return jsonify(result.get('data')), result.get('code', 200)

from services.user_service import get_habits, update_habits, get_attendance, update_attendance, get_user_settings, update_user_settings
import datetime

@app.route('/api/habits', methods=['GET', 'POST'])
@token_required
def handle_habits(current_user_id):
    if request.method == 'GET':
        date = request.args.get('date', datetime.date.today().isoformat())
        result = get_habits(current_user_id, date)
        return jsonify(result.get('data')), result.get('code', 200)
        
    if request.method == 'POST':
        data = request.json
        result = update_habits(current_user_id, data)
        return jsonify({'message': result.get('message')}), result.get('code', 200)

# --- ATTENDANCE ---
@app.route('/api/attendance', methods=['GET', 'POST'])
@token_required
def handle_attendance(current_user_id):
    if request.method == 'GET':
        week = request.args.get('week', type=int)
        result = get_attendance(current_user_id, week)
        return jsonify(result.get('data')), result.get('code', 200)
        
    if request.method == 'POST':
        data = request.json
        result = update_attendance(current_user_id, data)
        return jsonify({'message': result.get('message')}), result.get('code', 200)

# --- TASKS (KANBAN) ---
from services.task_service import get_tasks, create_task, update_task_status, delete_task

@app.route('/api/tasks', methods=['GET', 'POST'])
@token_required
def handle_tasks(current_user_id):
    if request.method == 'GET':
        result = get_tasks(current_user_id)
        return jsonify(result.get('data')), result.get('code', 200)
        
    if request.method == 'POST':
        data = request.json
        result = create_task(current_user_id, data)
        return jsonify({'message': result.get('message'), 'id': result.get('id')}), result.get('code', 200)

@app.route('/api/tasks/<int:id>', methods=['PUT', 'DELETE'])
@token_required
def manage_task(current_user_id, id):
    if request.method == 'PUT':
        data = request.json
        result = update_task_status(current_user_id, id, data['status'])
        return jsonify({'message': result.get('message')}), result.get('code', 200)
        
    if request.method == 'DELETE':
        result = delete_task(current_user_id, id)
        return jsonify({'message': result.get('message')}), result.get('code', 200)

# --- SETTINGS AND MUSIC ROUTES ---
@app.route('/api/settings', methods=['GET', 'PUT'])
@token_required
def user_settings(current_user_id):
    if request.method == 'GET':
        result = get_user_settings(current_user_id)
        if result.get('status') == 'error':
            return jsonify({'message': result.get('message')}), result.get('code', 404)
        return jsonify(result.get('data')), result.get('code', 200)
        
    if request.method == 'PUT':
        data = request.json
        result = update_user_settings(current_user_id, data)
        return jsonify({'message': result.get('message')}), result.get('code', 200)

from services.music_service import get_music_links, add_music_link, delete_music_link, upload_music_file, get_playlists, create_playlist, delete_playlist, add_playlist_item, delete_playlist_item

@app.route('/api/music', methods=['GET', 'POST'])
@token_required
def manage_music(current_user_id):
    if request.method == 'GET':
        result = get_music_links(current_user_id)
        return jsonify(result.get('data')), result.get('code', 200)
        
    if request.method == 'POST':
        data = request.json
        result = add_music_link(current_user_id, data)
        return jsonify({'message': result.get('message'), 'id': result.get('id')}), result.get('code', 200)

@app.route('/api/music/<int:id>', methods=['DELETE'])
@token_required
def delete_music_route(current_user_id, id):
    result = delete_music_link(current_user_id, id)
    return jsonify({'message': result.get('message')}), result.get('code', 200)

@app.route('/static/uploads/music/<filename>')
def serve_music(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/api/music/upload', methods=['POST'])
@token_required
def upload_music(current_user_id):
    if 'file' not in request.files:
        return jsonify({'message': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No selected file'}), 400
    if file and file.filename.lower().endswith('.mp3'):
        title = request.form.get('title', file.filename)
        result = upload_music_file(current_user_id, file, title, UPLOAD_FOLDER)
        return jsonify({'message': result.get('message'), 'id': result.get('id')}), result.get('code', 200)
    return jsonify({'message': 'Invalid file type'}), 400


# --- PLAYLISTS ROUTES ---
@app.route('/api/playlists', methods=['GET', 'POST'])
@token_required
def handle_playlists(current_user_id):
    if request.method == 'GET':
        result = get_playlists(current_user_id)
        return jsonify(result.get('data')), result.get('code', 200)
        
    if request.method == 'POST':
        data = request.json
        name = data.get('name', 'New Playlist')
        result = create_playlist(current_user_id, name)
        return jsonify({'message': result.get('message'), 'id': result.get('id')}), result.get('code', 200)

@app.route('/api/playlists/<int:id>', methods=['DELETE'])
@token_required
def delete_playlist_route(current_user_id, id):
    result = delete_playlist(current_user_id, id)
    return jsonify({'message': result.get('message')}), result.get('code', 200)

@app.route('/api/playlists/<int:id>/items', methods=['POST'])
@token_required
def add_playlist_item_route(current_user_id, id):
    data = request.json
    music_id = data.get('music_id')
    result = add_playlist_item(current_user_id, id, music_id)
    if result.get('status') == 'error':
        return jsonify({'message': result.get('message')}), result.get('code', 404)
    return jsonify({'message': result.get('message'), 'id': result.get('id')}), result.get('code', 200)

@app.route('/api/playlists/items/<int:item_id>', methods=['DELETE'])
@token_required
def delete_playlist_item_route(current_user_id, item_id):
    result = delete_playlist_item(current_user_id, item_id)
    return jsonify({'message': result.get('message')}), result.get('code', 200)

# --- STUDY ROOMS ROUTES ---
from services.room_service import get_rooms, create_room, join_room, kick_user, next_song, leave_room, sync_room

@app.route('/api/rooms', methods=['GET', 'POST'])
@token_required
def manage_rooms_route(current_user_id):
    if request.method == 'GET':
        result = get_rooms()
        return jsonify(result.get('data')), result.get('code', 200)
        
    if request.method == 'POST':
        data = request.json
        result = create_room(current_user_id, data)
        return jsonify({'message': result.get('message'), 'room_id': result.get('room_id')}), result.get('code', 200)

@app.route('/api/rooms/<int:room_id>/join', methods=['POST'])
@token_required
def join_room_route(current_user_id, room_id):
    result = join_room(current_user_id, room_id)
    if result.get('status') == 'error':
        return jsonify({'message': result.get('message')}), result.get('code', 400)
    return jsonify({'message': result.get('message'), 'status': result.get('room_status')}), result.get('code', 200)

@app.route('/api/rooms/<int:room_id>/kick/<int:target_user_id>', methods=['POST'])
@token_required
def kick_user_route(current_user_id, room_id, target_user_id):
    result = kick_user(current_user_id, room_id, target_user_id)
    if result.get('status') == 'error':
        return jsonify({'message': result.get('message')}), result.get('code', 403)
    return jsonify({'message': result.get('message')}), result.get('code', 200)

@app.route('/api/rooms/<int:room_id>/next_song', methods=['POST'])
@token_required
def next_song_route(current_user_id, room_id):
    result = next_song(current_user_id, room_id)
    if result.get('status') == 'error':
        return jsonify({'message': result.get('message')}), result.get('code', 403)
    return jsonify({'message': result.get('message')}), result.get('code', 200)

@app.route('/api/rooms/<int:room_id>/leave', methods=['POST'])
@token_required
def leave_room_route(current_user_id, room_id):
    result = leave_room(current_user_id, room_id)
    if result.get('status') == 'error':
        return jsonify({'message': result.get('message')}), result.get('code', 404)
    return jsonify({'message': result.get('message')}), result.get('code', 200)

@app.route('/api/rooms/<int:room_id>/sync', methods=['GET'])
@token_required
def sync_room_route(current_user_id, room_id):
    result = sync_room(current_user_id, room_id)
    if result.get('status') == 'error':
        return jsonify({'message': result.get('message')}), result.get('code', 404)
    return jsonify(result.get('data')), result.get('code', 200)

# Initialize database on startup (works for gunicorn as well)
try:
    init_db()
    print("Database initialized.")
except Exception as e:
    print(f"Warning: Could not initialize database automatically. {e}")

if __name__ == '__main__':
    if os.environ.get("FLASK_ENV") == "development":
        app.run(debug=True, port=int(os.environ.get("PORT", 5000)))
    else:
        app.run(port=int(os.environ.get("PORT", 5000)))