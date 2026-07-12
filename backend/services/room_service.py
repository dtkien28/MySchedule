import datetime
from db import get_db_connection

def get_rooms():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT sr.*, u.display_name as host_name,
               (SELECT COUNT(*) FROM study_room_members WHERE room_id = sr.id AND is_deleted = FALSE) as current_participants
        FROM study_rooms sr
        JOIN users u ON sr.host_id = u.id
        WHERE sr.status = 'active' AND sr.is_deleted = FALSE AND u.is_deleted = FALSE
    ''')
    rooms = cursor.fetchall()
    conn.close()
    return {'status': 'success', 'data': [dict(row) for row in rooms], 'code': 200}

def create_room(user_id, data):
    max_p = data.get('max_participants', 10)
    req_app = 1 if data.get('require_approval') else 0
    playlist_id = data.get('playlist_id')
    if not playlist_id:
        playlist_id = None
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE study_rooms SET status = 'closed' WHERE host_id = %s", (user_id,))
    
    cursor.execute('''
        INSERT INTO study_rooms (host_id, max_participants, require_approval, playlist_id, current_song_index, music_start_time, created_at)
        VALUES (%s, %s, %s, %s, 0, %s, %s) RETURNING id
    ''', (user_id, max_p, req_app, playlist_id, datetime.datetime.utcnow().isoformat(), datetime.datetime.utcnow().isoformat()))
    room_id = cursor.fetchone()['id']
    
    cursor.execute("INSERT INTO study_room_members (room_id, user_id, status, joined_at) VALUES (%s, %s, 'approved', %s)",
                  (room_id, user_id, datetime.datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()
    return {'status': 'success', 'message': 'Room created', 'room_id': room_id, 'code': 200}

def join_room(user_id, room_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM study_rooms WHERE id = %s AND status = 'active' AND is_deleted = FALSE", (room_id,))
    room = cursor.fetchone()
    if not room:
        conn.close()
        return {'status': 'error', 'message': 'Room not found or inactive', 'code': 404}
        
    cursor.execute("SELECT COUNT(*) as c FROM study_room_members WHERE room_id = %s AND is_deleted = FALSE", (room_id,))
    members_count = cursor.fetchone()['c']
    if members_count >= room['max_participants'] and room['host_id'] != user_id:
        conn.close()
        return {'status': 'error', 'message': 'Room is full', 'code': 400}
        
    status = 'pending' if room['require_approval'] and room['host_id'] != user_id else 'approved'
    
    cursor.execute('''
        INSERT INTO study_room_members (room_id, user_id, status, joined_at)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT(room_id, user_id) DO UPDATE SET status=excluded.status
    ''', (room_id, user_id, status, datetime.datetime.utcnow().isoformat()))
    
    conn.commit()
    conn.close()
    return {'status': 'success', 'message': 'Joined', 'room_status': status, 'code': 200}

def kick_user(user_id, room_id, target_user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT host_id FROM study_rooms WHERE id = %s AND is_deleted = FALSE", (room_id,))
    room = cursor.fetchone()
    if not room or room['host_id'] != user_id:
        conn.close()
        return {'status': 'error', 'message': 'Unauthorized', 'code': 403}
        
    cursor.execute("UPDATE study_room_members SET is_deleted = TRUE WHERE room_id = %s AND user_id = %s", (room_id, target_user_id))
    conn.commit()
    conn.close()
    return {'status': 'success', 'message': 'User kicked', 'code': 200}

def next_song(user_id, room_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM study_rooms WHERE id = %s AND is_deleted = FALSE", (room_id,))
    room = cursor.fetchone()
    if not room or room['host_id'] != user_id:
        conn.close()
        return {'status': 'error', 'message': 'Unauthorized', 'code': 403}
        
    new_index = room['current_song_index'] + 1
    cursor.execute("UPDATE study_rooms SET current_song_index = %s, music_start_time = %s WHERE id = %s",
                  (new_index, datetime.datetime.utcnow().isoformat(), room_id))
    conn.commit()
    conn.close()
    return {'status': 'success', 'message': 'Next song triggered', 'code': 200}

def leave_room(user_id, room_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT host_id FROM study_rooms WHERE id = %s AND is_deleted = FALSE', (room_id,))
    room = cursor.fetchone()
    if not room:
        conn.close()
        return {'status': 'error', 'message': 'Room not found', 'code': 404}
        
    if room['host_id'] == user_id:
        cursor.execute("UPDATE study_rooms SET status = 'closed' WHERE id = %s", (room_id,))
    else:
        cursor.execute("UPDATE study_room_members SET is_deleted = TRUE WHERE room_id = %s AND user_id = %s", (room_id, user_id))
        
    conn.commit()
    conn.close()
    return {'status': 'success', 'message': 'Left room successfully', 'code': 200}

def sync_room(user_id, room_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM study_rooms WHERE id = %s AND is_deleted = FALSE', (room_id,))
    room = cursor.fetchone()
    if not room:
        conn.close()
        return {'status': 'error', 'message': 'Room not found', 'code': 404}
        
    cursor.execute("SELECT status FROM study_room_members WHERE room_id = %s AND user_id = %s AND is_deleted = FALSE", (room_id, user_id))
    member = cursor.fetchone()
    if not member or member['status'] != 'approved':
        conn.close()
        return {'status': 'error', 'message': 'Not a member or pending', 'code': 403}

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
            WHERE pi.playlist_id = %s AND pi.is_deleted = FALSE AND ml.is_deleted = FALSE
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
        WHERE srm.room_id = %s AND srm.is_deleted = FALSE AND u.is_deleted = FALSE
    ''', (room_id,))
    members = cursor.fetchall()
    
    conn.close()
    
    return {'status': 'success', 'data': {'room': room_dict, 'members': [dict(m) for m in members]}, 'code': 200}

