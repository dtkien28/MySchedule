from db import get_db_connection

def get_tasks(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM tasks WHERE user_id = %s AND is_deleted = FALSE', (user_id,))
    tasks = cursor.fetchall()
    conn.close()
    return {'status': 'success', 'data': [dict(t) for t in tasks], 'code': 200}

def create_task(user_id, data):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO tasks (user_id, title, status, scheduled_day, scheduled_time_start, scheduled_time_end)
        VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
    ''', (user_id, data['title'], data.get('status', 'todo'), data.get('scheduled_day'), data.get('time_start'), data.get('time_end')))
    task_id = cursor.fetchone()['id']
    conn.commit()
    conn.close()
    return {'status': 'success', 'message': 'Added', 'id': task_id, 'code': 200}

def update_task_status(user_id, task_id, status):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE tasks SET status = %s WHERE id = %s AND user_id = %s', (status, task_id, user_id))
    conn.commit()
    conn.close()
    return {'status': 'success', 'message': 'Updated', 'code': 200}

def delete_task(user_id, task_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE tasks SET is_deleted = TRUE WHERE id = %s AND user_id = %s', (task_id, user_id))
    conn.commit()
    conn.close()
    return {'status': 'success', 'message': 'Deleted', 'code': 200}
