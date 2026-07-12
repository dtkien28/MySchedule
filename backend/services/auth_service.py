import os
import bcrypt
import random
import datetime
import jwt
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from db import get_db_connection
from google import genai
from google.genai import types

def get_secret_key():
    return os.getenv("JWT_SECRET_KEY")

def get_genai_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        return genai.Client(api_key=api_key)
    return None

def register_user(username, email, display_name, password):
    if not username or not password or not email:
        return {'status': 'error', 'message': 'Username, email and password are required', 'code': 400}
        
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Check if user exists and is unverified, then delete them to allow re-registration
        cursor.execute("SELECT id, is_verified FROM users WHERE (username = %s OR email = %s) AND is_deleted = FALSE", (username, email))
        existing_user = cursor.fetchone()
        if existing_user:
            if existing_user['is_verified'] == 1:
                return {'status': 'error', 'message': 'Username or email already exists', 'code': 400}
            else:
                cursor.execute("UPDATE users SET is_deleted = TRUE WHERE id = %s", (existing_user['id'],))
                
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
                
        return {'status': 'success', 'message': 'Vui lòng kiểm tra email để lấy mã xác thực', 'user_id': user_id, 'code': 200}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {'status': 'error', 'message': str(e), 'code': 500}
    finally:
        conn.close()

def verify_otp_code(user_id, code):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM otps WHERE user_id = %s ORDER BY id DESC LIMIT 1", (user_id,))
        otp = cursor.fetchone()
        
        if not otp or otp['code'] != str(code):
            return {'status': 'error', 'message': 'Mã OTP không chính xác', 'code': 400}
            
        expires_at_dt = otp['expires_at'] if isinstance(otp['expires_at'], datetime.datetime) else datetime.datetime.strptime(otp['expires_at'], '%Y-%m-%d %H:%M:%S.%f')
        if expires_at_dt < datetime.datetime.utcnow():
            return {'status': 'error', 'message': 'Mã OTP đã hết hạn', 'code': 400}
            
        cursor.execute("UPDATE users SET is_verified = 1 WHERE id = %s", (user_id,))
        cursor.execute("DELETE FROM otps WHERE user_id = %s", (user_id,))
        conn.commit()
        return {'status': 'success', 'message': 'Xác thực thành công, bạn có thể đăng nhập', 'code': 200}
    finally:
        conn.close()

def login_user(username, password):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = %s AND is_deleted = FALSE", (username,))
    user = cursor.fetchone()
    conn.close()
    
    if user and bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
        if user['is_verified'] == 0:
            return {'status': 'error', 'message': 'Tài khoản chưa được xác thực email', 'code': 403}
            
        secret_key = get_secret_key()
        if not secret_key:
            return {'status': 'error', 'message': 'Server misconfiguration: JWT_SECRET_KEY missing', 'code': 500}

        token = jwt.encode({
            'user_id': user['id'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, secret_key, algorithm="HS256")
        
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
        
        return {
            'status': 'success',
            'code': 200,
            'data': {
                'token': token, 
                'username': user['username'], 
                'user_id': user['id'],
                'display_name': user['display_name'] or user['username'],
                'theme': user['theme'],
                'background_image': user['background_image'],
                'streak': streak
            }
        }
        
    return {'status': 'error', 'message': 'Invalid username or password', 'code': 401}

def get_auth_ai_helper(action, data):
    client = get_genai_client()
    # Calculate Vietnam time (UTC+7)
    vn_time = datetime.datetime.utcnow() + datetime.timedelta(hours=7)
    current_time_str = f"{vn_time.strftime('%Y-%m-%d %H:%M:%S')} (Giờ Việt Nam)"
    
    try:
        system_prompt = f"""
        Bạn là Ketib AI. Bối cảnh thời gian hiện tại là: {current_time_str}.
        Hãy trả lời cực kỳ ngắn gọn (1 câu), tự nhiên, hài hước một chút nếu phù hợp.
        Tuyệt đối không giải thích dài dòng. Chỉ trả về một câu thoại.
        """
        
        user_prompt = ""
        if action == 'greeting':
            user_prompt = "Hãy viết một câu chào mừng ngắn gọn cho người dùng đang ở trang đăng nhập. Dựa vào giờ hiện tại để có lời chào phù hợp (ví dụ đêm muộn thì hỏi sao còn thức, sáng sớm thì chúc ngày mới năng suất, v.v.)."
        elif action == 'login_error':
            user_prompt = "Người dùng vừa nhập sai mật khẩu đăng nhập. Hãy an ủi nhẹ nhàng và hỏi xem họ có cần giúp đổi mật khẩu không."
        elif action == 'dashboard_greeting':
            name = data.get('name', 'bạn')
            user_prompt = f"Hãy viết một câu chào mừng ngắn gọn (khoảng 1 câu), truyền động lực học tập và làm việc cho người dùng tên là {name} khi họ vừa vào trang quản lý (Dashboard). Dựa vào giờ hiện tại để có lời chào phù hợp."
        elif action == 'weather_report':
            weather_data = data.get('weather_data', {})
            temp = weather_data.get('temperature', '')
            user_prompt = f"Trời đang {temp}°C. Hãy viết 1 câu siêu ngắn gọn và thân thiện thông báo thời tiết (có thể kèm lời khuyên nhỏ) để góc trên màn hình. Tuyệt đối chỉ 1 câu, không dài dòng."
        else:
            return {'status': 'success', 'message': 'Xin chào!'}
            
        if client:
            chat = client.chats.create(
                model="gemini-3.1-flash-lite-preview",
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    response_mime_type="text/plain"
                )
            )
            response = chat.send_message(user_prompt)
            return {'status': 'success', 'message': response.text.strip()}
        else:
            raise Exception("Gemini Client not initialized")
    except Exception as e:
        print("Auth AI Helper Error:", e)
        # Fallback messages
        if action == 'greeting':
            return {'status': 'success', 'message': 'Chào mừng bạn quay trở lại với Ketib!'}
        elif action == 'dashboard_greeting':
            return {'status': 'success', 'message': f"Chào mừng {data.get('name', 'bạn')}! Chúc bạn một ngày hiệu quả!"}
        elif action == 'weather_report':
            return {'status': 'success', 'message': 'Thời tiết hôm nay khá đẹp, chúc bạn một ngày năng suất!'}
        return {'status': 'success', 'message': 'Mật khẩu chưa đúng, bạn kiểm tra lại nhé.'}
