import datetime
from db import get_db_connection

def get_habits(user_id, date):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM habits WHERE user_id = %s AND date = %s', (user_id, date))
    h = cursor.fetchone()
    conn.close()
    if h:
        return {'status': 'success', 'data': dict(h), 'code': 200}
    return {'status': 'success', 'data': {"attended_class": False, "tasks_completed": False}, 'code': 200}

def update_habits(user_id, data):
    date = data.get('date', datetime.date.today().isoformat())
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO habits (user_id, date, attended_class, tasks_completed)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT(user_id, date) DO UPDATE SET 
        attended_class = excluded.attended_class,
        tasks_completed = excluded.tasks_completed
    ''', (user_id, date, data.get('attended_class', False), data.get('tasks_completed', False)))
    conn.commit()
    conn.close()
    return {'status': 'success', 'message': 'Updated', 'code': 200}

def get_attendance(user_id, week):
    conn = get_db_connection()
    cursor = conn.cursor()
    if week is not None:
        cursor.execute('SELECT * FROM attendance WHERE user_id = %s AND week = %s', (user_id, week))
    else:
        cursor.execute('SELECT * FROM attendance WHERE user_id = %s', (user_id,))
    records = cursor.fetchall()
    conn.close()
    return {'status': 'success', 'data': [dict(r) for r in records], 'code': 200}

def update_attendance(user_id, data):
    subject_id = data.get('subject_id')
    week = data.get('week')
    day = data.get('day')
    attended = data.get('attended', False)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO attendance (user_id, subject_id, week, day, attended)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT(user_id, subject_id, week, day) DO UPDATE SET 
        attended = excluded.attended
    ''', (user_id, subject_id, week, day, attended))
    conn.commit()
    conn.close()
    return {'status': 'success', 'message': 'Updated', 'code': 200}

def get_user_settings(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = %s AND is_deleted = FALSE", (user_id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return {'status': 'error', 'message': 'User not found', 'code': 404}

    today = datetime.datetime.utcnow().date()
    last_active = None
    if user['last_active_date']:
        last_active = user['last_active_date'] if isinstance(user['last_active_date'], datetime.date) else datetime.datetime.strptime(user['last_active_date'], '%Y-%m-%d').date()
    
    streak = user['streak'] or 0
    if last_active == today - datetime.timedelta(days=1):
        streak += 1
        cursor.execute("UPDATE users SET streak = %s, last_active_date = %s WHERE id = %s", (streak, today.isoformat(), user_id))
        conn.commit()
    elif last_active != today:
        streak = 1
        cursor.execute("UPDATE users SET streak = %s, last_active_date = %s WHERE id = %s", (streak, today.isoformat(), user_id))
        conn.commit()

    user_dict = dict(user)
    user_dict['streak'] = streak
    conn.close()
    return {'status': 'success', 'data': user_dict, 'code': 200}

def update_user_settings(user_id, data):
    display_name = data.get('display_name')
    theme = data.get('theme')
    background_image = data.get('background_image')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET display_name = %s, theme = %s, background_image = %s WHERE id = %s", 
                  (display_name, theme, background_image, user_id))
    conn.commit()
    conn.close()
    return {'status': 'success', 'message': 'Settings updated', 'code': 200}
