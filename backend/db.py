import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    db_url = os.getenv('DATABASE_URL')
    # Kết nối tới Postgres với cursor_factory mặc định là RealDictCursor để giống SQLite Row
    conn = psycopg2.connect(db_url, cursor_factory=RealDictCursor)
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Tạo các bảng
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            display_name TEXT,
            password_hash TEXT NOT NULL,
            is_verified INTEGER DEFAULT 0,
            theme TEXT DEFAULT 'light',
            background_image TEXT,
            streak INTEGER DEFAULT 0,
            last_active_date DATE
        );
        
        CREATE TABLE IF NOT EXISTS otps (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            code TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS groups (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            owner_id INTEGER,
            FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS group_members (
            group_id INTEGER,
            user_id INTEGER,
            PRIMARY KEY (group_id, user_id),
            FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS music_links (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            type TEXT DEFAULT 'youtube',
            youtube_url TEXT,
            file_path TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS playlists (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS playlist_items (
            id SERIAL PRIMARY KEY,
            playlist_id INTEGER NOT NULL,
            music_id INTEGER NOT NULL,
            order_index INTEGER DEFAULT 0,
            FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
            FOREIGN KEY(music_id) REFERENCES music_links(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS study_rooms (
            id SERIAL PRIMARY KEY,
            host_id INTEGER NOT NULL,
            max_participants INTEGER DEFAULT 10,
            require_approval INTEGER DEFAULT 0,
            playlist_id INTEGER,
            current_song_index INTEGER DEFAULT 0,
            music_start_time TEXT,
            status TEXT DEFAULT 'active',
            created_at TEXT NOT NULL,
            FOREIGN KEY(host_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS study_room_members (
            room_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            status TEXT DEFAULT 'approved',
            joined_at TEXT,
            PRIMARY KEY (room_id, user_id),
            FOREIGN KEY(room_id) REFERENCES study_rooms(id) ON DELETE CASCADE,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS group_meetings (
            id SERIAL PRIMARY KEY,
            group_id INTEGER,
            title TEXT NOT NULL,
            scheduled_day TEXT NOT NULL,
            time_start TEXT,
            time_end TEXT,
            FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS subjects (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            class_code TEXT NOT NULL,
            subject_name TEXT NOT NULL,
            type TEXT,
            start_week INTEGER,
            end_week INTEGER,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS study_times (
            id SERIAL PRIMARY KEY,
            subject_id INTEGER NOT NULL,
            day TEXT NOT NULL,
            time_start TEXT NOT NULL,
            time_end TEXT NOT NULL,
            room TEXT,
            cancel_weeks TEXT,
            FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS work_schedules (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            day TEXT NOT NULL,
            time_start TEXT NOT NULL,
            time_end TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS habits (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            attended_class BOOLEAN DEFAULT FALSE,
            tasks_completed BOOLEAN DEFAULT FALSE,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, date)
        );

        CREATE TABLE IF NOT EXISTS attendance (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            subject_id INTEGER NOT NULL,
            week INTEGER NOT NULL,
            day TEXT NOT NULL,
            attended BOOLEAN DEFAULT FALSE,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, subject_id, week, day)
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            duration_minutes INTEGER,
            status TEXT DEFAULT 'pending',
            scheduled_day TEXT,
            scheduled_time_start TEXT,
            scheduled_time_end TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    ''')
    
    conn.commit()
    
    # Bổ sung cột is_deleted cho xóa mềm vào các bảng
    tables = [
        'users', 'groups', 'group_members', 'music_links', 'playlists', 
        'playlist_items', 'study_rooms', 'study_room_members', 'group_meetings', 
        'subjects', 'study_times', 'work_schedules', 'tasks'
    ]
    for t in tables:
        try:
            cursor.execute(f"ALTER TABLE {t} ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;")
        except Exception as e:
            print(f"Error adding is_deleted to {t}: {e}")
            conn.rollback()
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized on PostgreSQL.")