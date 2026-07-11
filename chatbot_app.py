import os
import json
import google.generativeai as genai
from flask import request, jsonify

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

@app.route('/api/chatbot/chat', methods=['POST'])
@token_required
def api_chatbot(current_user_id):
    data = request.json
    user_message = data.get('message', '')
    chat_history = data.get('history', [])
    page_context = data.get('page_context', {})

    try:
        # 1. Bơm luật chơi (System Prompt) - ÉP KIỂU JSON
        system_prompt = """
        Bạn là Ketib AI, trợ lý học tập thông minh. Nhiệm vụ của bạn là tư vấn, giải đáp lịch học và giúp người dùng thêm lịch học mới.
        BẠN BẮT BUỘC PHẢI TRẢ VỀ DỮ LIỆU ĐỊNH DẠNG JSON.
        - Nếu người dùng chỉ hỏi đáp bình thường:
          {"type": "chat", "message": "Câu trả lời của bạn", "schedule_data": null}
        - Nếu người dùng nhờ THÊM/TẠO một môn học mới (ví dụ: 'thêm môn Toán sáng mai 7h'):
          {"type": "action_add", "message": "Đã thêm môn Toán vào lịch!", "schedule_data": {"class_name": "...", "subject_name": "...", "day_of_week": "...", "start_time": "...", "end_time": "...", "room": "..."}}
        """

        model = genai.GenerativeModel(
            model_name='gemini-1.5-flash',
            system_instruction=system_prompt
        )

        # 2. Xử lý lịch sử (bỏ qua các tin nhắn bị lỗi cũ nếu có)
        formatted_history = []
        for msg in chat_history:
            formatted_history.append({
                "role": "user" if msg['sender'] == 'user' else "model",
                "parts": [msg['text']]
            })

        chat = model.start_chat(history=formatted_history)

        # 3. Bơm dữ liệu từ giao diện web (Context Injection)
        current_schedules = json.dumps(page_context.get('schedules', []), ensure_ascii=False)
        full_prompt = (
            f"[DỮ LIỆU LỊCH HỌC HIỆN TẠI TRÊN MÀN HÌNH]: {current_schedules}\n"
            f"----------------------------------------\n"
            f"Câu hỏi: {user_message}"
        )

        # 4. Yêu cầu Gemini sinh câu trả lời ở chế độ JSON
        response = chat.send_message(
            full_prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        
        # Parse JSON từ Gemini
        ai_result = json.loads(response.text)
        
        return jsonify({
            "status": "success",
            "type": ai_result.get("type", "chat"),
            "reply": ai_result.get("message", ""),
            "action_data": ai_result.get("schedule_data")
        })

    except Exception as e:
        print("Chatbot Error:", e)
        return jsonify({"status": "error", "reply": "Hệ thống đang bận, bạn thử lại xíu nhé!"})