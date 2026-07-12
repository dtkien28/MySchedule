import json
from db import get_db_connection

def get_all_subjects(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM subjects WHERE user_id = %s AND is_deleted = FALSE', (user_id,))
    subs = cursor.fetchall()
    
    result = []
    for s in subs:
        cursor.execute('SELECT * FROM study_times WHERE subject_id = %s AND is_deleted = FALSE', (s['id'],))
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
    return {'status': 'success', 'data': result, 'code': 200}

def check_schedule_conflict(conn, user_id, start_week, end_week, time_slots, ignore_subject_id=None):
    cursor = conn.cursor()
    query = 'SELECT * FROM subjects WHERE user_id = %s AND is_deleted = FALSE'
    params = [user_id]
    if ignore_subject_id:
        query += ' AND id != %s'
        params.append(ignore_subject_id)
        
    cursor.execute(query, tuple(params))
    existing_subjects = cursor.fetchall()
    
    for ext_sub in existing_subjects:
        ext_start_week = ext_sub['start_week']
        ext_end_week = ext_sub['end_week']
        
        cursor.execute('SELECT * FROM study_times WHERE subject_id = %s AND is_deleted = FALSE', (ext_sub['id'],))
        ext_times = cursor.fetchall()
        
        for nt in time_slots:
            time_parts = nt['time'].split('-')
            nt_start = time_parts[0].strip()
            nt_end = time_parts[1].strip() if len(time_parts) > 1 else nt_start
            if not nt_start or not nt_end:
                continue
                
            nt_day = nt['day']
            nt_cancel_weeks = nt.get('cancel_weeks', [])
            if isinstance(nt_cancel_weeks, str):
                try:
                    nt_cancel_weeks = json.loads(nt_cancel_weeks)
                except:
                    nt_cancel_weeks = []
            
            nt_active_weeks = set(range(start_week, end_week + 1)) - set(nt_cancel_weeks)
            
            for et in ext_times:
                if et['day'] == nt_day:
                    if nt_start < et['time_end'] and et['time_start'] < nt_end:
                        et_cancel_weeks = json.loads(et['cancel_weeks']) if et['cancel_weeks'] else []
                        et_active_weeks = set(range(ext_start_week, ext_end_week + 1)) - set(et_cancel_weeks)
                        
                        intersect_weeks = nt_active_weeks.intersection(et_active_weeks)
                        if intersect_weeks:
                            week_conflict = sorted(list(intersect_weeks))[0]
                            return f"Trùng lịch với môn '{ext_sub['subject_name']}' vào {nt_day} ({et['time_start']}-{et['time_end']}) tại tuần {week_conflict}"
    return None

def create_subject(user_id, data):
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

    conflict = check_schedule_conflict(conn, user_id, s_week, e_week, data.get('time', []))
    if conflict:
        conn.close()
        return {'status': 'error', 'message': conflict, 'code': 400}

    cursor.execute('''
        INSERT INTO subjects (user_id, class_code, subject_name, type, start_week, end_week)
        VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
    ''', (user_id, data.get('class_code',''), data.get('subject_name',''), data.get('type', ''), s_week, e_week))
    
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
    return {'status': 'success', 'message': 'Added successfully', 'code': 200}

def update_subject(user_id, data):
    subject_id = data.get('id')
    if not subject_id:
        return {'status': 'error', 'message': 'Missing ID', 'code': 400}
        
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

    conflict = check_schedule_conflict(conn, user_id, s_week, e_week, data.get('time', []), ignore_subject_id=subject_id)
    if conflict:
        conn.close()
        return {'status': 'error', 'message': conflict, 'code': 400}

    # Update main table
    cursor.execute('''
        UPDATE subjects 
        SET class_code=%s, subject_name=%s, type=%s, start_week=%s, end_week=%s
        WHERE id=%s AND user_id=%s
    ''', (data.get('class_code',''), data.get('subject_name',''), data.get('type', ''), s_week, e_week, subject_id, user_id))
    
    # Delete old times
    cursor.execute('UPDATE study_times SET is_deleted = TRUE WHERE subject_id=%s', (subject_id,))
    
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
    return {'status': 'success', 'message': 'Updated successfully', 'code': 200}

def remove_subject(user_id, subject_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE subjects SET is_deleted = TRUE WHERE id = %s AND user_id = %s', (subject_id, user_id))
    conn.commit()
    conn.close()
    return {'status': 'success', 'message': 'Deleted', 'code': 200}
