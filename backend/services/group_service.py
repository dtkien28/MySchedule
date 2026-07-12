import json
from db import get_db_connection

def get_groups(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT g.id, g.name FROM groups g 
        JOIN group_members gm ON gm.group_id = g.id 
        WHERE gm.user_id = %s AND g.is_deleted = FALSE AND gm.is_deleted = FALSE
    ''', (user_id,))
    groups = cursor.fetchall()
    conn.close()
    return {'status': 'success', 'data': [dict(g) for g in groups], 'code': 200}

def create_group(user_id, name):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO groups (name, owner_id) VALUES (%s, %s) RETURNING id', (name, user_id))
    g_id = cursor.fetchone()['id']
    cursor.execute('INSERT INTO group_members (group_id, user_id) VALUES (%s, %s)', (g_id, user_id))
    conn.commit()
    conn.close()
    return {'status': 'success', 'message': 'Group created', 'id': g_id, 'code': 200}

def add_group_member(user_id, group_id, target_username):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT owner_id FROM groups WHERE id = %s AND is_deleted = FALSE', (group_id,))
    g = cursor.fetchone()
    if not g or g['owner_id'] != user_id:
        conn.close()
        return {'status': 'error', 'error': 'Unauthorized', 'code': 403}
        
    cursor.execute('SELECT id FROM users WHERE username = %s AND is_deleted = FALSE', (target_username,))
    target_user = cursor.fetchone()
    if not target_user:
        conn.close()
        return {'status': 'error', 'error': 'User not found', 'code': 404}
        
    try:
        cursor.execute('INSERT INTO group_members (group_id, user_id) VALUES (%s, %s)', (group_id, target_user['id']))
        conn.commit()
    except:
        pass
    conn.close()
    return {'status': 'success', 'message': 'Member added', 'code': 200}

def get_group_schedule(user_id, group_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM group_members WHERE group_id = %s AND user_id = %s AND is_deleted = FALSE', (group_id, user_id))
    mem = cursor.fetchone()
    if not mem:
        conn.close()
        return {'status': 'error', 'error': 'Not in group', 'code': 403}
        
    cursor.execute('SELECT u.id, u.username FROM group_members gm JOIN users u ON gm.user_id = u.id WHERE gm.group_id = %s AND gm.is_deleted = FALSE AND u.is_deleted = FALSE', (group_id,))
    members = cursor.fetchall()
    
    schedule_data = []
    
    for m in members:
        cursor.execute('SELECT id, start_week, end_week FROM subjects WHERE user_id = %s AND is_deleted = FALSE', (m['id'],))
        subs = cursor.fetchall()
        for s in subs:
            cursor.execute('SELECT day, time_start, time_end, cancel_weeks FROM study_times WHERE subject_id = %s AND is_deleted = FALSE', (s['id'],))
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
        
        cursor.execute('SELECT day, time_start, time_end FROM work_schedules WHERE user_id = %s AND is_deleted = FALSE', (m['id'],))
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
    return {'status': 'success', 'data': schedule_data, 'code': 200}

def create_group_meeting(user_id, group_id, data):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM group_members WHERE group_id = %s AND user_id = %s', (group_id, user_id))
    member = cursor.fetchone()
    if not member:
        conn.close()
        return {'status': 'error', 'error': 'Not authorized', 'code': 403}
        
    cursor.execute('''
        INSERT INTO group_meetings (group_id, title, scheduled_day, time_start, time_end)
        VALUES (%s, %s, %s, %s, %s)
    ''', (group_id, data.get('title'), data.get('scheduled_day'), data.get('time_start'), data.get('time_end')))
    conn.commit()
    conn.close()
    return {'status': 'success', 'message': 'Created', 'code': 200}

def get_user_meetings(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT m.*, g.name as group_name 
        FROM group_meetings m
        JOIN groups g ON m.group_id = g.id
        JOIN group_members gm ON g.id = gm.group_id
        WHERE gm.user_id = %s
    ''', (user_id,))
    meetings = cursor.fetchall()
    conn.close()
    return {'status': 'success', 'data': [dict(m) for m in meetings], 'code': 200}
