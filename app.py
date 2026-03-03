from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json

from models.subject import Subject, add_subject, delete_subject, edit_subject, subject_list
from models.study_schedule import StudySchedule

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

@app.route('/')
def index():
    return send_from_directory('templates', 'index.html')


@app.route('/api/subjects', methods=['GET'])
def get_subjects():
    subjects_data = []
    for s in subject_list:
        subjects_data.append({
            "class_code": s.class_code,
            "subject_name": s.subject_name,
            "stage": s.stage,
            "cancel_week": s.cancel_week,
            "place": s.place,
            "time": [{"day": t.day, "time": t.time} for t in s.time]
        })
    return jsonify(subjects_data)

@app.route('/api/subjects/add', methods=['POST'])
def api_add_subject():
    data = request.json
    
    time_list = [StudySchedule(t['day'], t['time']) for t in data.get('time', [])]
    
    new_subject = Subject(
        class_code=data.get('class_code'),
        subject_name=data.get('subject_name'),
        stage=data.get('stage'),
        time=time_list,
        cancel_week=data.get('cancel_week', ''),
        place=data.get('place')
    )
    
    result_str = add_subject(new_subject)
    return jsonify(json.loads(result_str))

@app.route('/api/subjects/edit', methods=['PUT'])
def api_edit_subject():
    data = request.json
    time_list = [StudySchedule(t['day'], t['time']) for t in data.get('time', [])]
    
    edited_subject = Subject(
        class_code=data.get('class_code'),
        subject_name=data.get('subject_name'),
        stage=data.get('stage'),
        time=time_list,
        cancel_week=data.get('cancel_week', ''),
        place=data.get('place')
    )
    
    result_str = edit_subject(edited_subject)
    return jsonify(json.loads(result_str))

@app.route('/api/subjects/delete/<class_code>', methods=['DELETE'])
def api_delete_subject(class_code):
    result_str = delete_subject(class_code)
    return jsonify(json.loads(result_str))

if __name__ == '__main__':
    app.run(debug=True, port=5000)