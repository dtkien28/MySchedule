import os
import datetime
from werkzeug.utils import secure_filename
from db import get_db_connection

def get_music_links(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM music_links WHERE user_id = %s AND is_deleted = FALSE", (user_id,))
    links = cursor.fetchall()
    conn.close()
    return {'status': 'success', 'data': [dict(row) for row in links], 'code': 200}

def add_music_link(user_id, data):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO music_links (user_id, title, youtube_url) VALUES (%s, %s, %s) RETURNING id", 
                  (user_id, data['title'], data['youtube_url']))
    link_id = cursor.fetchone()['id']
    conn.commit()
    conn.close()
    return {'status': 'success', 'message': 'Music added', 'id': link_id, 'code': 200}

def delete_music_link(user_id, music_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE music_links SET is_deleted = TRUE WHERE id = %s AND user_id = %s", (music_id, user_id))
    conn.commit()
    conn.close()
    return {'status': 'success', 'message': 'Music deleted', 'code': 200}

def upload_music_file(user_id, file, title, upload_folder):
    filename = secure_filename(f"{user_id}_{int(datetime.datetime.now().timestamp())}_{file.filename}")
    file.save(os.path.join(upload_folder, filename))
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO music_links (user_id, title, type, file_path) VALUES (%s, %s, 'mp3', %s) RETURNING id", 
                  (user_id, title, filename))
    link_id = cursor.fetchone()['id']
    conn.commit()
    conn.close()
    return {'status': 'success', 'message': 'File uploaded', 'id': link_id, 'code': 200}

def get_playlists(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM playlists WHERE user_id = %s AND is_deleted = FALSE", (user_id,))
    playlists = cursor.fetchall()
    result = []
    for p in playlists:
        cursor.execute('''
            SELECT pi.id as item_id, pi.order_index, ml.*
            FROM playlist_items pi
            JOIN music_links ml ON pi.music_id = ml.id
            WHERE pi.playlist_id = %s AND pi.is_deleted = FALSE AND ml.is_deleted = FALSE
            ORDER BY pi.order_index ASC
        ''', (p['id'],))
        items = cursor.fetchall()
        d = dict(p)
        d['items'] = [dict(i) for i in items]
        result.append(d)
    conn.close()
    return {'status': 'success', 'data': result, 'code': 200}

def create_playlist(user_id, name):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO playlists (user_id, name) VALUES (%s, %s) RETURNING id", (user_id, name))
    pid = cursor.fetchone()['id']
    conn.commit()
    conn.close()
    return {'status': 'success', 'message': 'Playlist created', 'id': pid, 'code': 200}

def delete_playlist(user_id, playlist_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE playlists SET is_deleted = TRUE WHERE id = %s AND user_id = %s", (playlist_id, user_id))
    conn.commit()
    conn.close()
    return {'status': 'success', 'message': 'Playlist deleted', 'code': 200}

def add_playlist_item(user_id, playlist_id, music_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM playlists WHERE id = %s AND user_id = %s AND is_deleted = FALSE", (playlist_id, user_id))
    p = cursor.fetchone()
    if not p:
        conn.close()
        return {'status': 'error', 'message': 'Not found', 'code': 404}
        
    cursor.execute("SELECT MAX(order_index) as m FROM playlist_items WHERE playlist_id = %s AND is_deleted = FALSE", (playlist_id,))
    max_order = cursor.fetchone()['m']
    next_order = (max_order or 0) + 1
    
    cursor.execute("INSERT INTO playlist_items (playlist_id, music_id, order_index) VALUES (%s, %s, %s) RETURNING id", (playlist_id, music_id, next_order))
    item_id = cursor.fetchone()['id']
    conn.commit()
    conn.close()
    return {'status': 'success', 'message': 'Item added', 'id': item_id, 'code': 200}

def delete_playlist_item(user_id, item_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE playlist_items SET is_deleted = TRUE 
        WHERE id = %s AND playlist_id IN (SELECT id FROM playlists WHERE user_id = %s AND is_deleted = FALSE)
    ''', (item_id, user_id))
    conn.commit()
    conn.close()
    return {'status': 'success', 'message': 'Item deleted', 'code': 200}
