from db import get_db_connection

def get_works(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM work_schedules WHERE user_id = %s AND is_deleted = FALSE', (user_id,))
    works = cursor.fetchall()
    conn.close()
    return {'status': 'success', 'data': [dict(w) for w in works], 'code': 200}

def create_work(user_id, data):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO work_schedules (user_id, title, day, time_start, time_end)
        VALUES (%s, %s, %s, %s, %s)
    ''', (user_id, data.get('title'), data.get('day'), data.get('time_start'), data.get('time_end')))
    conn.commit()
    conn.close()
    return {'status': 'success', 'message': 'Added', 'code': 200}

def delete_work(user_id, work_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE work_schedules SET is_deleted = TRUE WHERE id = %s AND user_id = %s', (work_id, user_id))
    conn.commit()
    conn.close()
    return {'status': 'success', 'message': 'Deleted', 'code': 200}
