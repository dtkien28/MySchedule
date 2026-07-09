import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    db_path = os.getenv('DB_PATH', 'schedule.db')
    conn = sqlite3.connect(db_path, timeout=20.0)
    conn.execute('PRAGMA journal_mode=WAL;')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    db_path = os.getenv('DB_PATH', 'schedule.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Users Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            display_name TEXT,
            password_hash TEXT NOT NULL,
            is_verified INTEGER DEFAULT 0,
            theme TEXT DEFAULT 'light',
            background_image TEXT,
            streak INTEGER DEFAULT 0,
            last_active_date DATE
        )
    ''')

    # OTPs Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS otps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            code TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    # Groups Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            owner_id INTEGER,
            FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    # Group Members Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS group_members (
            group_id INTEGER,
            user_id INTEGER,
            PRIMARY KEY (group_id, user_id),
            FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    # Music Links Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS music_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            type TEXT DEFAULT 'youtube',
            youtube_url TEXT,
            file_path TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    # Playlists Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS playlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    # Playlist Items Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS playlist_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            playlist_id INTEGER NOT NULL,
            music_id INTEGER NOT NULL,
            order_index INTEGER DEFAULT 0,
            FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
            FOREIGN KEY(music_id) REFERENCES music_links(id) ON DELETE CASCADE
        )
    ''')
    
    # Study Rooms Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS study_rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        )
    ''')

    # Study Room Members Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS study_room_members (
            room_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            status TEXT DEFAULT 'approved',
            joined_at TEXT,
            PRIMARY KEY (room_id, user_id),
            FOREIGN KEY(room_id) REFERENCES study_rooms(id) ON DELETE CASCADE,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    
    # Group Meetings Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS group_meetings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER,
            title TEXT NOT NULL,
            scheduled_day TEXT NOT NULL,
            time_start TEXT,
            time_end TEXT,
            FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE
        )
    ''')
    
    # Subjects Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            class_code TEXT NOT NULL,
            subject_name TEXT NOT NULL,
            type TEXT,
            start_week INTEGER,
            end_week INTEGER,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    # Study Times Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS study_times (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_id INTEGER NOT NULL,
            day TEXT NOT NULL,
            time_start TEXT NOT NULL,
            time_end TEXT NOT NULL,
            room TEXT,
            cancel_weeks TEXT,
            FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
        )
    ''')
    
    # Work Schedules Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS work_schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            day TEXT NOT NULL,
            time_start TEXT NOT NULL,
            time_end TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    # Habits / Daily Tracker
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS habits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            attended_class BOOLEAN DEFAULT 0,
            tasks_completed BOOLEAN DEFAULT 0,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, date)
        )
    ''')

    # Attendance (per-class)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            subject_id INTEGER NOT NULL,
            week INTEGER NOT NULL,
            day TEXT NOT NULL,
            attended BOOLEAN DEFAULT 0,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, subject_id, week, day)
        )
    ''')

    # AI Tasks (for auto-scheduling)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            duration_minutes INTEGER,
            status TEXT DEFAULT 'pending',
            scheduled_day TEXT,
            scheduled_time_start TEXT,
            scheduled_time_end TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized.")
