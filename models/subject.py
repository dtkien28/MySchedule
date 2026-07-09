import sqlite3
import json
import os
import re
from dotenv import load_dotenv
from .study_schedule import StudySchedule

load_dotenv()
DB_FILE = os.getenv("DATABASE_URL", "schedule.db")

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS subjects (
            class_code TEXT PRIMARY KEY,
            subject_name TEXT NOT NULL,
            type TEXT,
            start_week INTEGER,
            end_week INTEGER
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS study_times (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_code TEXT,
            day TEXT NOT NULL,
            time TEXT NOT NULL,
            room TEXT,
            cancel_weeks TEXT,
            FOREIGN KEY(class_code) REFERENCES subjects(class_code) ON DELETE CASCADE
        )
    ''')
    conn.commit()
    conn.close()

init_db()

class Subject:
    def __init__(self, class_code: str, subject_name: str, type: str, start_week: int, end_week: int, time: list):
        self.class_code = class_code
        self.subject_name = subject_name
        self.type = type
        self.start_week = start_week
        self.end_week = end_week
        self.time = time

    def to_dict(self):
        return {
            "class_code": self.class_code,
            "subject_name": self.subject_name,
            "type": self.type,
            "start_week": self.start_week,
            "end_week": self.end_week,
            "time": [
                {
                    "day": t.day,
                    "time": t.time,
                    "room": t.room,
                    "cancel_weeks": t.cancel_weeks
                } for t in self.time
            ]
        }

def get_all_subjects() -> list:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('SELECT class_code, subject_name, type, start_week, end_week FROM subjects')
    rows = cursor.fetchall()
    
    subjects = []
    for row in rows:
        class_code, subject_name, type_val, start_week, end_week = row
        cursor.execute('SELECT day, time, room, cancel_weeks FROM study_times WHERE class_code = ?', (class_code,))
        time_rows = cursor.fetchall()
        
        time_list = []
        for tr in time_rows:
            day, time, room, cancel_weeks_str = tr
            cancel_weeks = json.loads(cancel_weeks_str) if cancel_weeks_str else []
            time_list.append(StudySchedule(day, time, room, cancel_weeks))
            
        subjects.append(Subject(class_code, subject_name, type_val, start_week, end_week, time_list))
        
    conn.close()
    return subjects

def add_subject(s: Subject) -> str:
    result = {"status": "", "message": ""}
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    cursor.execute('SELECT class_code FROM subjects WHERE class_code = ?', (s.class_code,))
    if cursor.fetchone():
        conn.close()
        result["status"] = "Lỗi"
        result["message"] = f"Môn học {s.class_code} đã có trong lịch"
        return json.dumps(result, ensure_ascii=False)
        
    cursor.execute('''
        INSERT INTO subjects (class_code, subject_name, type, start_week, end_week)
        VALUES (?, ?, ?, ?, ?)
    ''', (s.class_code, s.subject_name, s.type, s.start_week, s.end_week))
    
    for t in s.time:
        cursor.execute('''
            INSERT INTO study_times (class_code, day, time, room, cancel_weeks)
            VALUES (?, ?, ?, ?, ?)
        ''', (s.class_code, t.day, t.time, t.room, json.dumps(t.cancel_weeks)))
        
    conn.commit()
    conn.close()
    result["status"] = "Thành công"
    result["message"] = "Đã thêm môn học thành công"
    return json.dumps(result, ensure_ascii=False)

def delete_subject(class_code_text: str) -> str:
    result = {"status": "", "message": ""}
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('PRAGMA foreign_keys = ON')
    
    cursor.execute('SELECT class_code FROM subjects WHERE class_code = ?', (class_code_text,))
    if not cursor.fetchone():
        conn.close()
        result["status"] = "Lỗi"
        result["message"] = f"Không tìm thấy môn {class_code_text}"
        return json.dumps(result, ensure_ascii=False)
        
    cursor.execute('DELETE FROM subjects WHERE class_code = ?', (class_code_text,))
    conn.commit()
    conn.close()
    
    result["status"] = "Thành công"
    result["message"] = f"Đã xóa môn {class_code_text}"
    return json.dumps(result, ensure_ascii=False)

def edit_subject(s: Subject) -> str:
    result = {"status": "", "message": ""}
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('PRAGMA foreign_keys = ON')
    
    cursor.execute('SELECT class_code FROM subjects WHERE class_code = ?', (s.class_code,))
    if not cursor.fetchone():
        conn.close()
        result["status"] = "Lỗi"
        result["message"] = f"Không tìm thấy môn {s.class_code}"
        return json.dumps(result, ensure_ascii=False)
        
    cursor.execute('''
        UPDATE subjects 
        SET subject_name = ?, type = ?, start_week = ?, end_week = ?
        WHERE class_code = ?
    ''', (s.subject_name, s.type, s.start_week, s.end_week, s.class_code))
    
    cursor.execute('DELETE FROM study_times WHERE class_code = ?', (s.class_code,))
    for t in s.time:
        cursor.execute('''
            INSERT INTO study_times (class_code, day, time, room, cancel_weeks)
            VALUES (?, ?, ?, ?, ?)
        ''', (s.class_code, t.day, t.time, t.room, json.dumps(t.cancel_weeks)))
        
    conn.commit()
    conn.close()
    result["status"] = "Thành công"
    result["message"] = "Cập nhật thành công"
    return json.dumps(result, ensure_ascii=False)

def parse_dtu_string(raw_text: str) -> dict:
    try:
        lines = [line.strip() for line in raw_text.split('\n') if line.strip()]
        if not lines:
            raise ValueError("Dữ liệu rỗng")
            
        first_line = lines[0]
        parts = first_line.split('\t')
        
        if len(parts) >= 6:
            class_code = parts[0].strip()
            subject_name = parts[1].strip()
            type_val = parts[2].strip()
            
            weeks_str = parts[3].strip()
            start_week, end_week = 1, 52
            week_match = re.search(r'(\d+)--(\d+)', weeks_str)
            if week_match:
                start_week = int(week_match.group(1))
                end_week = int(week_match.group(2))
                
            time_slots = []
            
            time_regex = r'(T[2-7]|CN):\s*(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2})'
            match = re.search(time_regex, parts[5])
            if match:
                time_slots.append({"day": match.group(1), "time": match.group(2).replace(" ", ""), "room": "", "cancel_weeks": []})
                
            cancel_mode = False
            rooms = []
            
            for line in lines[1:]:
                if "Tuần hủy:" in line:
                    cancel_mode = True
                    continue
                    
                if not cancel_mode:
                    match = re.search(time_regex, line)
                    if match:
                        time_slots.append({"day": match.group(1), "time": match.group(2).replace(" ", ""), "room": "", "cancel_weeks": []})
                else:
                    cancel_match = re.search(r'(T[2-7]|CN):\s*Hủy\s*([\d,\s]+)', line)
                    if cancel_match:
                        day = cancel_match.group(1)
                        weeks = [int(w.strip()) for w in cancel_match.group(2).split(',') if w.strip().isdigit()]
                        for ts in time_slots:
                            if ts['day'] == day:
                                ts['cancel_weeks'].extend(weeks)
                    else:
                        rooms.append(line)
                        
            # Map rooms sequentially based on lines, but handle case where rooms list might be slightly different.
            for i, ts in enumerate(time_slots):
                if i < len(rooms):
                    # the first room line often has extra data like "201 201 211\tHòa Khánh Nam", take the last tab part
                    room_parts = rooms[i].split('\t')
                    ts['room'] = room_parts[-1].strip()
                    
            return {
                "status": "success",
                "data": {
                    "class_code": class_code,
                    "subject_name": subject_name,
                    "type": type_val,
                    "start_week": start_week,
                    "end_week": end_week,
                    "time": time_slots
                }
            }
        else:
            raise ValueError("Không đúng định dạng mong đợi của DTU (cần phân cách bằng phím tab).")
            
    except Exception as e:
        return {
            "status": "error",
            "message": f"Lỗi bóc tách: {str(e)}"
        }