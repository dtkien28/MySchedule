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

app = Flask(__name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'static', 'uploads', 'music')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# CORS restricted to frontend
allowed_origin = os.getenv("ALLOWED_ORIGIN", "http://localhost:5173")
CORS(app, resources={r"/api/*": {"origins": allowed_origin}})

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

# --- AUTH ROUTES ---
@app.route('/api/auth/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    data = request.json
    username = data.get('username')
    email = data.get('email')
    display_name = data.get('name', username)
    password = data.get('password')
    
    if not username or not password or not email:
        return jsonify({'message': 'Username, email and password are required'}), 400
        
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Check if user exists and is unverified, then delete them to allow re-registration
        cursor.execute("SELECT id, is_verified FROM users WHERE username = %s OR email = %s", (username, email))
        existing_user = cursor.fetchone()
        if existing_user:
            if existing_user['is_verified'] == 1:
                return jsonify({'message': 'Username or email already exists'}), 400
            else:
                cursor.execute("DELETE FROM users WHERE id = %s", (existing_user['id'],))
                
        cursor.execute("INSERT INTO users (username, email, display_name, password_hash, is_verified) VALUES (%s, %s, %s, %s, 0) RETURNING id", (username, email, display_name, hashed.decode('utf-8')))
        user_id = cursor.fetchone()['id']
        
        # Generate OTP
        otp_code = str(random.randint(100000, 999999))
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
        cursor.execute("INSERT INTO otps (user_id, code, expires_at) VALUES (%s, %s, %s)", (user_id, otp_code, expires_at))
        conn.commit()
        
        # Send Email
        sg_api_key = os.getenv('SENDGRID_API_KEY')
        sg_sender = os.getenv('SENDGRID_SENDER_EMAIL')
        if sg_api_key and sg_sender:
            message = Mail(
                from_email=sg_sender,
                to_emails=email,
                subject='Xác thực tài khoản Ketib Schedule',
                html_content=f'<strong>Mã xác thực của bạn là: {otp_code}</strong>. Mã có hiệu lực trong 15 phút.'
            )
            try:
                sg = SendGridAPIClient(sg_api_key)
                sg.send(message)
            except Exception as e:
                print("SendGrid Error:", e)
                raise Exception("Không thể gửi email OTP. Vui lòng kiểm tra lại cấu hình SendGrid (API Key hoặc Sender Email).")
                
        return jsonify({'message': 'Vui lòng kiểm tra email để lấy mã xác thực', 'user_id': user_id})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'message': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/auth/verify', methods=['POST'])
@limiter.limit("5 per minute")
def verify_otp():
    data = request.json
    user_id = data.get('user_id')
    code = data.get('code')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM otps WHERE user_id = %s ORDER BY id DESC LIMIT 1", (user_id,))
        otp = cursor.fetchone()
        
        if not otp or otp['code'] != str(code):
            return jsonify({'message': 'Mã OTP không chính xác'}), 400
            
        expires_at_dt = otp['expires_at'] if isinstance(otp['expires_at'], datetime.datetime) else datetime.datetime.strptime(otp['expires_at'], '%Y-%m-%d %H:%M:%S.%f')
        if expires_at_dt < datetime.datetime.utcnow():
            return jsonify({'message': 'Mã OTP đã hết hạn'}), 400
            
        cursor.execute("UPDATE users SET is_verified = 1 WHERE id = %s", (user_id,))
        cursor.execute("DELETE FROM otps WHERE user_id = %s", (user_id,))
        conn.commit()
        return jsonify({'message': 'Xác thực thành công, bạn có thể đăng nhập'})
    finally:
        conn.close()

@app.route('/api/auth/login', methods=['POST'])
@limiter.limit("5 per minute")
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
    user = cursor.fetchone()
    conn.close()
    
    if user and bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
        if user['is_verified'] == 0:
            return jsonify({'message': 'Tài khoản chưa được xác thực email'}), 403
            
        token = jwt.encode({
            'user_id': user['id'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, SECRET_KEY, algorithm="HS256")
        
        # Calculate Streak
        today = datetime.datetime.utcnow().date()
        last_active = None
        if user['last_active_date']:
            last_active = user['last_active_date'] if isinstance(user['last_active_date'], datetime.date) else datetime.datetime.strptime(user['last_active_date'], '%Y-%m-%d').date()
        
        streak = user['streak']
        if last_active == today - datetime.timedelta(days=1):
            streak += 1
        elif last_active != today:
            streak = 1
            
        update_conn = get_db_connection()
        update_cursor = update_conn.cursor()
        update_cursor.execute("UPDATE users SET streak = %s, last_active_date = %s WHERE id = %s", (streak, today.isoformat(), user['id']))
        update_conn.commit()
        update_conn.close()
        
        return jsonify({
            'token': token, 
            'username': user['username'], 
            'user_id': user['id'],
            'display_name': user['display_name'] or user['username'],
            'theme': user['theme'],
            'background_image': user['background_image'],
            'streak': streak
        })
        
    return jsonify({'message': 'Invalid username or password'}), 401


# --- SUBJECTS ROUTES (Using new DTU Parser logic) ---
def parse_dtu_string(raw_text: str):
    print("[Regex Parser] Bắt đầu xử lý bằng logic code thông thường (Regex)...")
    try:
        lines = [line.strip() for line in raw_text.split('\n') if line.strip()]
        if not lines:
            return {"status": "error", "message": "Empty string"}
            
        class_code = ""
        subject_name = ""
        type_val = ""
        start_week = 1
        end_week = 52
        
        parts = lines[0].split('\t')
        class_code = parts[0].strip() if len(parts) > 0 else ""
        subject_name = parts[1].strip() if len(parts) > 1 else ""
        type_val = parts[2].strip() if len(parts) > 2 else ""
        
        start_week = ""
        end_week = ""
        time_slots = []
        
        time_regex = r'(T[2-7]|CN)\s*:\s*(\d{1,2}[:h]\d{2})\s*-\s*(\d{1,2}[:h]\d{2})'
        
        for line in lines:
            week_match = re.search(r'(\d+)\s*--\s*(\d+)', line)
            if week_match:
                start_week = int(week_match.group(1))
                end_week = int(week_match.group(2))
                break
                
        # Extract all time slots
        for line in lines:
            if "Tuần hủy:" in line or "Hủy" in line:
                continue
            matches = re.finditer(time_regex, line)
            for m in matches:
                time_slots.append({"day": m.group(1), "time": f"{m.group(2).replace('h', ':')}-{m.group(3).replace('h', ':')}", "room": "", "cancel_weeks": []})

        # Extract cancel weeks
        for line in lines:
            cancel_match = re.search(r'(T[2-7]|CN):\s*Hủy\s*([\d,\s]+)', line)
            if cancel_match:
                day = cancel_match.group(1)
                weeks = [int(w.strip()) for w in cancel_match.group(2).split(',') if w.strip().isdigit()]
                for ts in time_slots:
                    if ts['day'] == day:
                        ts['cancel_weeks'].extend(weeks)

        # Extract room lines
        room_lines = []
        for line in lines[1:]:
            if "Tuần hủy:" in line or "Hủy" in line or "Xem Lịch Học Bổ Sung" in line: continue
            if re.search(time_regex, line): continue
            if re.search(r'^\d+$', line) or re.match(r'^\d{2}/\d{2}/\d{4}$', line): continue
            if line.strip():
                room_lines.append(line.strip())

        # Attempt to parse rooms and locations
        rooms_col = []
        locs_col = []
        for rl in room_lines:
            if '\t' in rl:
                pts = rl.split('\t')
                r_parts = pts[0].strip().split()
                if len(r_parts) > 1 and len(r_parts) <= len(time_slots):
                    rooms_col.extend(r_parts)
                else:
                    rooms_col.append(pts[0].strip())
                locs_col.append(pts[1].strip())
            else:
                locs_col.append(rl.strip())
        
        # padding
        while len(rooms_col) < len(time_slots):
            rooms_col.append(rooms_col[-1] if rooms_col else "")
        while len(locs_col) < len(time_slots):
            locs_col.append(locs_col[-1] if locs_col else "")
            
        for i, ts in enumerate(time_slots):
            r = rooms_col[i] if i < len(rooms_col) else ""
            l = locs_col[i] if i < len(locs_col) else ""
            ts['room'] = f"{r} {l}".strip()
                
        print("[Regex Parser] Xử lý thành công!")
        return {
            "status": "success",
            "data": {
                "class_code": class_code,
                "subject_name": subject_name,
                "type": type_val,
                "start_week": start_week,
                "end_week": end_week,
                "time": time_slots
            }
        }
    except Exception as e:
        print(f"[Regex Parser] Lỗi: {str(e)}")
        return {"status": "error", "message": str(e)}

@app.route('/api/subjects/parse', methods=['POST'])
@token_required
def api_parse_subject(current_user_id):
    data = request.json
    raw_text = data.get('raw_text', '')

    # Lấy đường link public của Camber Node từ biến môi trường
    camber_node_url = os.getenv("CAMBER_NODE_URL")
    
    if camber_node_url:
        try:
            # Bắn request thẳng vào endpoint /extract của máy chủ GPU FastAPI
            api_endpoint = f"{camber_node_url.rstrip('/')}/extract"
            
            response = requests.post(api_endpoint, json={"raw_text": raw_text}, timeout=30)
            response_data = response.json()
            
            if response_data.get("status") == "success":
                parsed_ai = response_data["data"]
                
                # Map cấu trúc JSON của AI sang cấu trúc mảng time[] mà Frontend đang dùng
                time_slots = []
                for s in parsed_ai.get('schedules', []):
                    time_slots.append({
                        "day": s.get('day_of_week', ''),
                        "time": f"{s.get('start_time', '')}-{s.get('end_time', '')}",
                        "room": f"{s.get('room', '')} {s.get('location', '')}".strip(),
                        "cancel_weeks": s.get('canceled_weeks', [])
                    })

                return jsonify({
                    "status": "success",
                    "data": {
                        "class_code": parsed_ai.get('class_name', ''),
                        "subject_name": parsed_ai.get('subject_name', ''),
                        "type": parsed_ai.get('type', ''),
                        "start_week": parsed_ai.get('start_week', 1),
                        "end_week": parsed_ai.get('end_week', 52),
                        "time": time_slots
                    }
                })
            else:
                print("Lỗi phân tích từ Camber AI:", response_data.get("message"))
                
        except Exception as e:
            print("Không thể kết nối đến Camber Node:", e)

    # Nếu máy chủ AI tắt, mất kết nối, hoặc chưa cấu hình URL -> Tự động Fallback về Regex nội bộ
    return jsonify(parse_dtu_string(raw_text))

@app.route('/api/subjects', methods=['GET'])
@token_required
def get_subjects(current_user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM subjects WHERE user_id = %s', (current_user_id,))
    subs = cursor.fetchall()
    
    result = []
    for s in subs:
        cursor.execute('SELECT * FROM study_times WHERE subject_id = %s', (s['id'],))
        times = cursor.fetchall()
        
        result.append({
            "id": s['id'],
            "class_code": s['class_code'],
            "subject_name": s['subject_name'],
            "type": s['type'],
            "start_week": s['start_week'],
            "end_week": s['end_week'],
            "time": [
                {
                    "day": t['day'],
                    "time": f"{t['time_start']}-{t['time_end']}",
                    "room": t['room'],
                    "cancel_weeks": json.loads(t['cancel_weeks']) if t['cancel_weeks'] else []
                } for t in times
            ]
        })
    conn.close()
    return jsonify(result)

@app.route('/api/subjects', methods=['POST'])
@token_required
def add_subject(current_user_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        s_week = int(data.get('start_week') or 1)
    except (ValueError, TypeError):
        s_week = 1
        
    try:
        e_week = int(data.get('end_week') or 52)
    except (ValueError, TypeError):
        e_week = 52

    cursor.execute('''
        INSERT INTO subjects (user_id, class_code, subject_name, type, start_week, end_week)
        VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
    ''', (current_user_id, data.get('class_code',''), data.get('subject_name',''), data.get('type', ''), s_week, e_week))
    
    subject_id = cursor.fetchone()['id']
    
    for t in data.get('time', []):
        time_parts = t['time'].split('-')
        t_start = time_parts[0].strip()
        t_end = time_parts[1].strip() if len(time_parts) > 1 else t_start
        
        cursor.execute('''
            INSERT INTO study_times (subject_id, day, time_start, time_end, room, cancel_weeks)
            VALUES (%s, %s, %s, %s, %s, %s)
        ''', (subject_id, t['day'], t_start, t_end, t.get('room', ''), json.dumps(t.get('cancel_weeks', []))))
        
    conn.commit()
    conn.close()
    return jsonify({'message': 'Added successfully'})

@app.route('/api/subjects', methods=['PUT'])
@token_required
def edit_subject(current_user_id):
    data = request.json
    subject_id = data.get('id')
    if not subject_id:
        return jsonify({'message': 'Missing ID'}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        s_week = int(data.get('start_week') or 1)
    except (ValueError, TypeError):
        s_week = 1
        
    try:
        e_week = int(data.get('end_week') or 52)
    except (ValueError, TypeError):
        e_week = 52

    # Update main table
    cursor.execute('''
        UPDATE subjects 
        SET class_code=%s, subject_name=%s, type=%s, start_week=%s, end_week=%s
        WHERE id=%s AND user_id=%s
    ''', (data.get('class_code',''), data.get('subject_name',''), data.get('type', ''), s_week, e_week, subject_id, current_user_id))
    
    # Delete old times
    cursor.execute('DELETE FROM study_times WHERE subject_id=%s', (subject_id,))
    
    # Insert new times
    for t in data.get('time', []):
        time_parts = t['time'].split('-')
        t_start = time_parts[0].strip()
        t_end = time_parts[1].strip() if len(time_parts) > 1 else t_start
        
        cursor.execute('''
            INSERT INTO study_times (subject_id, day, time_start, time_end, room, cancel_weeks)
            VALUES (%s, %s, %s, %s, %s, %s)
        ''', (subject_id, t['day'], t_start, t_end, t.get('room', ''), json.dumps(t.get('cancel_weeks', []))))
        
    conn.commit()
    conn.close()
    return jsonify({'message': 'Updated successfully'})

@app.route('/api/subjects/<int:id>', methods=['DELETE'])
@token_required
def delete_subject(current_user_id, id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM subjects WHERE id = %s AND user_id = %s', (id, current_user_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Deleted'})


# --- WORK SCHEDULES ROUTES ---
@app.route('/api/works', methods=['GET', 'POST'])
@token_required
def handle_works(current_user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if request.method == 'GET':
        cursor.execute('SELECT * FROM work_schedules WHERE user_id = %s', (current_user_id,))
        works = cursor.fetchall()
        conn.close()
        return jsonify([dict(w) for w in works])
        
    elif request.method == 'POST':
        data = request.json
        cursor.execute('''
            INSERT INTO work_schedules (user_id, title, day, time_start, time_end)
            VALUES (%s, %s, %s, %s, %s)
        ''', (current_user_id, data['title'], data['day'], data['time_start'], data['time_end']))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Added'})

@app.route('/api/works/<int:id>', methods=['DELETE'])
@token_required
def delete_work(current_user_id, id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM work_schedules WHERE id = %s AND user_id = %s', (id, current_user_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Deleted'})


# --- GROUPS ROUTES ---
@app.route('/api/groups', methods=['GET', 'POST'])
@token_required
def handle_groups(current_user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if request.method == 'GET':
        cursor.execute('''
            SELECT g.id, g.name FROM groups g 
            JOIN group_members gm ON gm.group_id = g.id 
            WHERE gm.user_id = %s
        ''', (current_user_id,))
        groups = cursor.fetchall()
        conn.close()
        return jsonify([dict(g) for g in groups])
        
    if request.method == 'POST':
        name = request.json.get('name')
        cursor.execute('INSERT INTO groups (name, owner_id) VALUES (%s, %s) RETURNING id', (name, current_user_id))
        g_id = cursor.fetchone()['id']
        cursor.execute('INSERT INTO group_members (group_id, user_id) VALUES (%s, %s)', (g_id, current_user_id))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Group created', 'id': g_id})

@app.route('/api/groups/<int:group_id>/members', methods=['POST'])
@token_required
def add_group_member(current_user_id, group_id):
    target_username = request.json.get('username')
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT owner_id FROM groups WHERE id = %s', (group_id,))
    
    g = cursor.fetchone()
    if not g or g['owner_id'] != current_user_id:
        return jsonify({'error': 'Unauthorized'}), 403
        
    cursor.execute('SELECT id FROM users WHERE username = %s', (target_username,))
        
    target_user = cursor.fetchone()
    if not target_user:
        return jsonify({'error': 'User not found'}), 404
        
    try:
        cursor.execute('INSERT INTO group_members (group_id, user_id) VALUES (%s, %s)', (group_id, target_user['id']))
        conn.commit()
    except:
        pass
    conn.close()
    return jsonify({'message': 'Member added'})

@app.route('/api/groups/<int:group_id>/schedule', methods=['GET'])
@token_required
def get_group_schedule(current_user_id, group_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM group_members WHERE group_id = %s AND user_id = %s', (group_id, current_user_id))
    
    mem = cursor.fetchone()
    if not mem:
        return jsonify({'error': 'Not in group'}), 403
        
    cursor.execute('SELECT u.id, u.username FROM group_members gm JOIN users u ON gm.user_id = u.id WHERE gm.group_id = %s', (group_id,))
        
    members = cursor.fetchall()
    
    schedule_data = []
    
    for m in members:
        cursor.execute('SELECT id, start_week, end_week FROM subjects WHERE user_id = %s', (m['id'],))
        subs = cursor.fetchall()
        for s in subs:
            cursor.execute('SELECT day, time_start, time_end, cancel_weeks FROM study_times WHERE subject_id = %s', (s['id'],))
            times = cursor.fetchall()
            for t in times:
                schedule_data.append({
                    "user_id": m['id'],
                    "username": m['username'],
                    "type": "study",
                    "day": t['day'],
                    "time_start": t['time_start'],
                    "time_end": t['time_end'],
                    "start_week": s['start_week'],
                    "end_week": s['end_week'],
                    "cancel_weeks": json.loads(t['cancel_weeks']) if t['cancel_weeks'] else []
                })
        
        cursor.execute('SELECT day, time_start, time_end FROM work_schedules WHERE user_id = %s', (m['id'],))
        
        works = cursor.fetchall()
        for w in works:
            schedule_data.append({
                "user_id": m['id'],
                "username": m['username'],
                "type": "work",
                "day": w['day'],
                "time_start": w['time_start'],
                "time_end": w['time_end'],
                "start_week": 1,
                "end_week": 52,
                "cancel_weeks": []
            })
            
    conn.close()
    conn.close()
    return jsonify(schedule_data)

@app.route('/api/groups/<int:group_id>/meetings', methods=['POST'])
@token_required
def create_group_meeting(current_user_id, group_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if user is in group
    cursor.execute('SELECT * FROM group_members WHERE group_id = %s AND user_id = %s', (group_id, current_user_id))
    member = cursor.fetchone()
    if not member:
        conn.close()
        return jsonify({'error': 'Not authorized'}), 403
        
    cursor.execute('''
        INSERT INTO group_meetings (group_id, title, scheduled_day, time_start, time_end)
        VALUES (%s, %s, %s, %s, %s)
    ''', (group_id, data.get('title'), data.get('scheduled_day'), data.get('time_start'), data.get('time_end')))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Created'})

@app.route('/api/meetings', methods=['GET'])
@token_required
def get_user_meetings(current_user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    # Get meetings for all groups the user is a part of
    cursor.execute('''
        SELECT m.*, g.name as group_name 
        FROM group_meetings m
        JOIN groups g ON m.group_id = g.id
        JOIN group_members gm ON g.id = gm.group_id
        WHERE gm.user_id = %s
    ''', (current_user_id,))
    meetings = cursor.fetchall()
    conn.close()
    return jsonify([dict(m) for m in meetings])

# --- HABITS / DAILY TRACKING ---
@app.route('/api/habits', methods=['GET', 'POST'])
@token_required
def handle_habits(current_user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if request.method == 'GET':
        date = request.args.get('date', datetime.date.today().isoformat())
        cursor.execute('SELECT * FROM habits WHERE user_id = %s AND date = %s', (current_user_id, date))
        h = cursor.fetchone()
        conn.close()
        if h:
            return jsonify(dict(h))
        return jsonify({"attended_class": False, "tasks_completed": False})
        
    if request.method == 'POST':
        data = request.json
        date = data.get('date', datetime.date.today().isoformat())
        cursor.execute('''
            INSERT INTO habits (user_id, date, attended_class, tasks_completed)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT(user_id, date) DO UPDATE SET 
            attended_class = excluded.attended_class,
            tasks_completed = excluded.tasks_completed
        ''', (current_user_id, date, data.get('attended_class', False), data.get('tasks_completed', False)))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Updated'})

# --- ATTENDANCE ---
@app.route('/api/attendance', methods=['GET', 'POST'])
@token_required
def handle_attendance(current_user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if request.method == 'GET':
        week = request.args.get('week', type=int)
        cursor.execute('SELECT * FROM attendance WHERE user_id = %s AND week = %s', (current_user_id, week))
        records = cursor.fetchall()
        conn.close()
        return jsonify([dict(r) for r in records])
        
    if request.method == 'POST':
        data = request.json
        subject_id = data.get('subject_id')
        week = data.get('week')
        day = data.get('day')
        attended = data.get('attended', False)
        
        cursor.execute('''
            INSERT INTO attendance (user_id, subject_id, week, day, attended)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT(user_id, subject_id, week, day) DO UPDATE SET 
            attended = excluded.attended
        ''', (current_user_id, subject_id, week, day, attended))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Updated'})

# --- TASKS (KANBAN) ---
@app.route('/api/tasks', methods=['GET', 'POST'])
@token_required
def handle_tasks(current_user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if request.method == 'GET':
        cursor.execute('SELECT * FROM tasks WHERE user_id = %s', (current_user_id,))
        tasks = cursor.fetchall()
        conn.close()
        return jsonify([dict(t) for t in tasks])
        
    if request.method == 'POST':
        data = request.json
        cursor.execute('''
            INSERT INTO tasks (user_id, title, status, scheduled_day, scheduled_time_start, scheduled_time_end)
            VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
        ''', (current_user_id, data['title'], data.get('status', 'todo'), data.get('scheduled_day'), data.get('time_start'), data.get('time_end')))
        task_id = cursor.fetchone()['id']
        conn.commit()
        conn.close()
        return jsonify({'message': 'Added', 'id': task_id})

@app.route('/api/tasks/<int:id>', methods=['PUT', 'DELETE'])
@token_required
def manage_task(current_user_id, id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if request.method == 'PUT':
        data = request.json
        cursor.execute('UPDATE tasks SET status = %s WHERE id = %s AND user_id = %s', (data['status'], id, current_user_id))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Updated'})
        
    if request.method == 'DELETE':
        cursor.execute('DELETE FROM tasks WHERE id = %s AND user_id = %s', (id, current_user_id))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Deleted'})

# --- SETTINGS AND MUSIC ROUTES ---
@app.route('/api/settings', methods=['GET', 'PUT'])
@token_required
def user_settings(current_user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if request.method == 'GET':
        cursor.execute("SELECT * FROM users WHERE id = %s", (current_user_id,))
        user = cursor.fetchone()
        if not user:
            conn.close()
            return jsonify({'message': 'User not found'}), 404

        # Update Streak on load
        today = datetime.datetime.utcnow().date()
        last_active = None
        if user['last_active_date']:
            last_active = user['last_active_date'] if isinstance(user['last_active_date'], datetime.date) else datetime.datetime.strptime(user['last_active_date'], '%Y-%m-%d').date()
        
        streak = user['streak'] or 0
        if last_active == today - datetime.timedelta(days=1):
            streak += 1
            cursor.execute("UPDATE users SET streak = %s, last_active_date = %s WHERE id = %s", (streak, today.isoformat(), current_user_id))
            conn.commit()
        elif last_active != today:
            streak = 1
            cursor.execute("UPDATE users SET streak = %s, last_active_date = %s WHERE id = %s", (streak, today.isoformat(), current_user_id))
            conn.commit()

        user_dict = dict(user)
        user_dict['streak'] = streak
        conn.close()
        return jsonify(user_dict)
        
    if request.method == 'PUT':
        data = request.json
        display_name = data.get('display_name')
        theme = data.get('theme')
        background_image = data.get('background_image')
        
        cursor.execute("UPDATE users SET display_name = %s, theme = %s, background_image = %s WHERE id = %s", 
                      (display_name, theme, background_image, current_user_id))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Settings updated'})

@app.route('/api/music', methods=['GET', 'POST'])
@token_required
def manage_music(current_user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if request.method == 'GET':
        cursor.execute("SELECT * FROM music_links WHERE user_id = %s", (current_user_id,))
        links = cursor.fetchall()
        conn.close()
        return jsonify([dict(row) for row in links])
        
    if request.method == 'POST':
        data = request.json
        cursor.execute("INSERT INTO music_links (user_id, title, youtube_url) VALUES (%s, %s, %s) RETURNING id", 
                      (current_user_id, data['title'], data['youtube_url']))
        link_id = cursor.fetchone()['id']
        conn.commit()
        conn.close()
        return jsonify({'message': 'Music added', 'id': link_id})

@app.route('/api/music/<int:id>', methods=['DELETE'])
@token_required
def delete_music(current_user_id, id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM music_links WHERE id = %s AND user_id = %s", (id, current_user_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Music deleted'})

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
    if file and file.filename.endswith('.mp3'):
        filename = secure_filename(f"{current_user_id}_{int(datetime.datetime.now().timestamp())}_{file.filename}")
        file.save(os.path.join(UPLOAD_FOLDER, filename))
        
        conn = get_db_connection()
        cursor = conn.cursor()
        title = request.form.get('title', file.filename)
        cursor.execute("INSERT INTO music_links (user_id, title, type, file_path) VALUES (%s, %s, 'mp3', %s) RETURNING id", 
                      (current_user_id, title, filename))
        link_id = cursor.fetchone()['id']
        conn.commit()
        conn.close()
        return jsonify({'message': 'File uploaded', 'id': link_id})
    return jsonify({'message': 'Invalid file type'}), 400


# --- PLAYLISTS ROUTES ---
@app.route('/api/playlists', methods=['GET', 'POST'])
@token_required
def manage_playlists(current_user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if request.method == 'GET':
        cursor.execute("SELECT * FROM playlists WHERE user_id = %s", (current_user_id,))
        playlists = cursor.fetchall()
        result = []
        for p in playlists:
            cursor.execute('''
                SELECT pi.id as item_id, pi.order_index, ml.*
                FROM playlist_items pi
                JOIN music_links ml ON pi.music_id = ml.id
                WHERE pi.playlist_id = %s
                ORDER BY pi.order_index ASC
            ''', (p['id'],))
            items = cursor.fetchall()
            d = dict(p)
            d['items'] = [dict(i) for i in items]
            result.append(d)
        conn.close()
        return jsonify(result)
        
    if request.method == 'POST':
        data = request.json
        name = data.get('name', 'New Playlist')
        cursor.execute("INSERT INTO playlists (user_id, name) VALUES (%s, %s) RETURNING id", (current_user_id, name))
        pid = cursor.fetchone()['id']
        conn.commit()
        conn.close()
        return jsonify({'message': 'Playlist created', 'id': pid})

@app.route('/api/playlists/<int:id>', methods=['DELETE'])
@token_required
def delete_playlist(current_user_id, id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM playlists WHERE id = %s AND user_id = %s", (id, current_user_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Playlist deleted'})

@app.route('/api/playlists/<int:id>/items', methods=['POST'])
@token_required
def add_playlist_item(current_user_id, id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # check ownership
    cursor.execute("SELECT * FROM playlists WHERE id = %s AND user_id = %s", (id, current_user_id))
    p = cursor.fetchone()
    if not p:
        conn.close()
        return jsonify({'message': 'Not found'}), 404
        
    music_id = data.get('music_id')
    # get max order
    cursor.execute("SELECT MAX(order_index) as m FROM playlist_items WHERE playlist_id = %s", (id,))
    max_order = cursor.fetchone()['m']
    next_order = (max_order or 0) + 1
    
    cursor.execute("INSERT INTO playlist_items (playlist_id, music_id, order_index) VALUES (%s, %s, %s) RETURNING id", (id, music_id, next_order))
    item_id = cursor.fetchone()['id']
    conn.commit()
    conn.close()
    return jsonify({'message': 'Item added', 'id': item_id})

@app.route('/api/playlists/items/<int:item_id>', methods=['DELETE'])
@token_required
def delete_playlist_item(current_user_id, item_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    # verify ownership via playlist
    cursor.execute('''
        DELETE FROM playlist_items 
        WHERE id = %s AND playlist_id IN (SELECT id FROM playlists WHERE user_id = %s)
    ''', (item_id, current_user_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Item deleted'})

# --- STUDY ROOMS ROUTES ---
@app.route('/api/rooms', methods=['GET', 'POST'])
@token_required
def manage_rooms(current_user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if request.method == 'GET':
        cursor.execute('''
            SELECT sr.*, u.display_name as host_name,
                   (SELECT COUNT(*) FROM study_room_members WHERE room_id = sr.id) as current_participants
            FROM study_rooms sr
            JOIN users u ON sr.host_id = u.id
            WHERE sr.status = 'active'
        ''')
        rooms = cursor.fetchall()
        conn.close()
        return jsonify([dict(row) for row in rooms])
        
    if request.method == 'POST':
        data = request.json
        max_p = data.get('max_participants', 10)
        req_app = 1 if data.get('require_approval') else 0
        playlist_id = data.get('playlist_id')
        if not playlist_id:
            playlist_id = None
        
        # Close existing rooms of this host
        cursor.execute("UPDATE study_rooms SET status = 'closed' WHERE host_id = %s", (current_user_id,))
        
        cursor.execute('''
            INSERT INTO study_rooms (host_id, max_participants, require_approval, playlist_id, current_song_index, music_start_time, created_at)
            VALUES (%s, %s, %s, %s, 0, %s, %s) RETURNING id
        ''', (current_user_id, max_p, req_app, playlist_id, datetime.datetime.utcnow().isoformat(), datetime.datetime.utcnow().isoformat()))
        room_id = cursor.fetchone()['id']
        
        # Add host to room members
        cursor.execute("INSERT INTO study_room_members (room_id, user_id, status, joined_at) VALUES (%s, %s, 'approved', %s)",
                      (room_id, current_user_id, datetime.datetime.utcnow().isoformat()))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Room created', 'room_id': room_id})

@app.route('/api/rooms/<int:room_id>/join', methods=['POST'])
@token_required
def join_room(current_user_id, room_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM study_rooms WHERE id = %s AND status = 'active'", (room_id,))
    
    room = cursor.fetchone()
    if not room:
        conn.close()
        return jsonify({'message': 'Room not found or inactive'}), 404
        
    cursor.execute("SELECT COUNT(*) as c FROM study_room_members WHERE room_id = %s", (room_id,))
    members_count = cursor.fetchone()['c']
    if members_count >= room['max_participants'] and room['host_id'] != current_user_id:
        conn.close()
        return jsonify({'message': 'Room is full'}), 400
        
    status = 'pending' if room['require_approval'] and room['host_id'] != current_user_id else 'approved'
    
    # Insert or update
    cursor.execute('''
        INSERT INTO study_room_members (room_id, user_id, status, joined_at)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT(room_id, user_id) DO UPDATE SET status=excluded.status
    ''', (room_id, current_user_id, status, datetime.datetime.utcnow().isoformat()))
    
    conn.commit()
    conn.close()
    return jsonify({'message': 'Joined', 'status': status})

@app.route('/api/rooms/<int:room_id>/kick/<int:target_user_id>', methods=['POST'])
@token_required
def kick_user(current_user_id, room_id, target_user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT host_id FROM study_rooms WHERE id = %s", (room_id,))
    
    room = cursor.fetchone()
    if not room or room['host_id'] != current_user_id:
        conn.close()
        return jsonify({'message': 'Unauthorized'}), 403
        
    cursor.execute("DELETE FROM study_room_members WHERE room_id = %s AND user_id = %s", (room_id, target_user_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'User kicked'})


@app.route('/api/rooms/<int:room_id>/next_song', methods=['POST'])
@token_required
def next_song(current_user_id, room_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM study_rooms WHERE id = %s", (room_id,))
    
    room = cursor.fetchone()
    if not room or room['host_id'] != current_user_id:
        conn.close()
        return jsonify({'message': 'Unauthorized'}), 403
        
    new_index = room['current_song_index'] + 1
    cursor.execute("UPDATE study_rooms SET current_song_index = %s, music_start_time = %s WHERE id = %s",
                  (new_index, datetime.datetime.utcnow().isoformat(), room_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Next song triggered'})


@app.route('/api/rooms/<int:room_id>/leave', methods=['POST'])
@token_required
def leave_room(current_user_id, room_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT host_id FROM study_rooms WHERE id = %s', (room_id,))
        room = cursor.fetchone()
        if not room:
            return jsonify({'message': 'Room not found'}), 404
        
        if room['host_id'] == current_user_id:
            # Host leaves, soft delete room
            cursor.execute("UPDATE study_rooms SET status = 'closed' WHERE id = %s", (room_id,))
        else:
            # Member leaves
            cursor.execute("DELETE FROM study_room_members WHERE room_id = %s AND user_id = %s", (room_id, current_user_id))
        
        conn.commit()
        return jsonify({'message': 'Left room successfully'}), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/rooms/<int:room_id>/sync', methods=['GET'])
@token_required
def sync_room(current_user_id, room_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM study_rooms WHERE id = %s', (room_id,))
    room = cursor.fetchone()
    
    if not room:
        conn.close()
        return jsonify({'message': 'Room not found'}), 404
        
    # Check if user is in room and approved
    cursor.execute("SELECT status FROM study_room_members WHERE room_id = %s AND user_id = %s", (room_id, current_user_id))
    member = cursor.fetchone()
    if not member or member['status'] != 'approved':
        conn.close()
        return jsonify({'message': 'Not a member or pending'}), 403

    room_dict = dict(room)
    room_dict['music_title'] = None
    room_dict['music_type'] = None
    room_dict['youtube_url'] = None
    room_dict['file_path'] = None

    if room_dict.get('playlist_id'):
        cursor.execute('''
            SELECT ml.* 
            FROM playlist_items pi
            JOIN music_links ml ON pi.music_id = ml.id
            WHERE pi.playlist_id = %s
            ORDER BY pi.order_index ASC
        ''', (room_dict['playlist_id'],))
        items = cursor.fetchall()
        if items:
            idx = room_dict['current_song_index'] % len(items)
            current_music = items[idx]
            room_dict['music_title'] = current_music['title']
            room_dict['music_type'] = current_music['type']
            room_dict['youtube_url'] = current_music['youtube_url']
            room_dict['file_path'] = current_music['file_path']
        
    cursor.execute('''
        SELECT u.id, u.display_name, u.username, srm.status
        FROM study_room_members srm
        JOIN users u ON srm.user_id = u.id
        WHERE srm.room_id = %s
    ''', (room_id,))
    members = cursor.fetchall()
    
    conn.close()
    
    return jsonify({
        'room': room_dict,
        'members': [dict(m) for m in members]
    })

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