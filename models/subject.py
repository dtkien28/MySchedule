import json
import os
from .study_schedule import StudySchedule

DATA_FILE = "subjects.json"

class Subject:
    def __init__(self, class_code: str, subject_name: str, stage: str, time: list, cancel_week: str, place: str):
        self.class_code = class_code
        self.subject_name = subject_name
        self.stage = stage
        self.time = time
        self.cancel_week = cancel_week
        self.place = place

    def to_dict(self):
        """Hàm hỗ trợ chuyển đối tượng Subject thành dạng từ điển (dictionary) để lưu vào JSON"""
        return {
            "class_code": self.class_code,
            "subject_name": self.subject_name,
            "stage": self.stage,
            "cancel_week": self.cancel_week,
            "place": self.place,
            "time": [{"day": t.day, "time": t.time} for t in self.time]
        }

def load_from_json() -> list:
    """Đọc dữ liệu từ file JSON và chuyển thành danh sách các đối tượng Subject"""
    if not os.path.exists(DATA_FILE):
        return []
    
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            loaded_subjects = []
            for item in data:
                time_list = [StudySchedule(t['day'], t['time']) for t in item.get('time', [])]
                
                loaded_subjects.append(Subject(
                    class_code=item.get('class_code'),
                    subject_name=item.get('subject_name'),
                    stage=item.get('stage'),
                    time=time_list,
                    cancel_week=item.get('cancel_week', ''),
                    place=item.get('place')
                ))
            return loaded_subjects
    except Exception as e:
        print(f"Có lỗi khi đọc file: {e}")
        return []

def save_to_json():
    """Lưu danh sách subject_list hiện tại vào file JSON"""
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump([s.to_dict() for s in subject_list], f, ensure_ascii=False, indent=4)


subject_list = load_from_json()


def add_subject(s: Subject) -> str:
    result = {"status": "", "message": ""}

    for existing_subject in subject_list:
        if s.class_code == existing_subject.class_code:
            result["status"] = "Lỗi"
            result["message"] = "Môn học đã có trong lịch, không thể thêm"
            return json.dumps(result, ensure_ascii=False)
    for existing_subject in subject_list:
        if existing_subject.stage == s.stage:
            for new_time in s.time:
                for existing_time in existing_subject.time:
                    if new_time.day == existing_time.day and new_time.time == existing_time.time:
                        result["status"] = "Lỗi"
                        result["message"] = "Bị trùng thời gian, không thể thêm"
                        return json.dumps(result, ensure_ascii=False)

    subject_list.append(s)
    save_to_json()

    result["status"] = "Thành công"
    result["message"] = "Đã thêm môn học thành công"
    return json.dumps(result, ensure_ascii=False)


def delete_subject(class_code_text: str) -> str:
    result = {"status": "", "message": ""}

    for i, existing_subject in enumerate(subject_list):
        if existing_subject.class_code == class_code_text:
            subject_list.pop(i)
            save_to_json()
            
            result["status"] = "Thành công"
            result["message"] = f"Đã xóa môn {class_code_text} khỏi lịch"
            return json.dumps(result, ensure_ascii=False)

    result["status"] = "Lỗi"
    result["message"] = f"Không có mã môn {class_code_text} trong lịch"
    return json.dumps(result, ensure_ascii=False)


def edit_subject(s: Subject) -> str:
    result = {"status": "", "message": ""}

    for existing_subject in subject_list:
        if existing_subject.stage == s.stage and existing_subject.class_code != s.class_code:
            for new_time in s.time:
                for existing_time in existing_subject.time:
                    if new_time.day == existing_time.day and new_time.time == existing_time.time:
                        result["status"] = "Lỗi"
                        result["message"] = "Bị trùng thời gian, không thể sửa"
                        return json.dumps(result, ensure_ascii=False)

    for existing_subject in subject_list:
        if existing_subject.class_code == s.class_code:
            existing_subject.subject_name = s.subject_name
            existing_subject.stage = s.stage
            existing_subject.time = s.time
            existing_subject.place = s.place

            save_to_json()

            result["status"] = "Thành công"
            result["message"] = f"Sửa thành công.\nMã môn: {existing_subject.class_code}\nTên môn: {existing_subject.subject_name}"
            return json.dumps(result, ensure_ascii=False)

    result["status"] = "Lỗi"
    result["message"] = f"Không có mã môn {s.class_code} trong lịch"
    return json.dumps(result, ensure_ascii=False)