import os
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import json
from dotenv import load_dotenv

load_dotenv()

from models.subject import Subject, add_subject, delete_subject, edit_subject, get_all_subjects, parse_dtu_string
from models.study_schedule import StudySchedule

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5000", "http://127.0.0.1:5000"]}})

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/subjects', methods=['GET'])
def get_subjects():
    subjects_data = [s.to_dict() for s in get_all_subjects()]
    return jsonify(subjects_data)

@app.route('/api/subjects/parse', methods=['POST'])
def api_parse_subject():
    data = request.json
    raw_text = data.get('raw_text', '')
    if not raw_text:
        return jsonify({"status": "error", "message": "Chuỗi rỗng"}), 400
        
    result = parse_dtu_string(raw_text)
    return jsonify(result)

@app.route('/api/subjects/add', methods=['POST'])
def api_add_subject():
    data = request.json
    
    if not data.get('class_code') or not data.get('subject_name') or not data.get('time'):
        return jsonify({"status": "Lỗi", "message": "Thiếu thông tin bắt buộc"}), 400
    
    time_list = [StudySchedule(t['day'], t['time'], t.get('room', ''), t.get('cancel_weeks', [])) for t in data.get('time', [])]
    
    new_subject = Subject(
        class_code=data.get('class_code'),
        subject_name=data.get('subject_name'),
        type=data.get('type', ''),
        start_week=int(data.get('start_week', 1)),
        end_week=int(data.get('end_week', 52)),
        time=time_list
    )
    
    result_str = add_subject(new_subject)
    return jsonify(json.loads(result_str))

@app.route('/api/subjects/edit', methods=['PUT'])
def api_edit_subject():
    data = request.json

    if not data.get('class_code') or not data.get('subject_name') or not data.get('time'):
        return jsonify({"status": "Lỗi", "message": "Thiếu thông tin bắt buộc"}), 400

    time_list = [StudySchedule(t['day'], t['time'], t.get('room', ''), t.get('cancel_weeks', [])) for t in data.get('time', [])]
    
    edited_subject = Subject(
        class_code=data.get('class_code'),
        subject_name=data.get('subject_name'),
        type=data.get('type', ''),
        start_week=int(data.get('start_week', 1)),
        end_week=int(data.get('end_week', 52)),
        time=time_list
    )
    
    result_str = edit_subject(edited_subject)
    return jsonify(json.loads(result_str))

@app.route('/api/subjects/delete/<class_code>', methods=['DELETE'])
def api_delete_subject(class_code):
    result_str = delete_subject(class_code)
    return jsonify(json.loads(result_str))

if __name__ == '__main__':
    if os.environ.get("FLASK_ENV") == "development":
        app.run(debug=True, port=5000)
    else:
        app.run(port=5000)