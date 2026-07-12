from locust import HttpUser, task, between, events
import random

# Kịch bản Load/Stress test mô phỏng theo 7 Test Case
# Lệnh chạy: locust -f locustfile_module_4.py

class MyScheduleUser(HttpUser):
    wait_time = between(1, 5) # Chờ 1-5 giây giữa các thao tác để giống user thật
    
    def on_start(self):
        # Setup trước khi chạy kịch bản
        self.token = ""
        self.room_id = random.randint(1, 10) # Giả lập có sẵn 10 phòng (TC-PERF-02)
        
        # TC-PERF-03: Stress test Đăng nhập
        # Trong on_start, user sẽ đăng nhập. Việc này tự động ép tải chức năng Login
        response = self.client.post("/api/auth/login", json={
            "username": f"user_{random.randint(1, 10000)}", 
            "password": "password123"
        }, catch_response=True)
        
        if response.status_code == 200:
            self.token = response.json().get('access_token', '')
            response.success()
        else:
            # 503 duyên dáng sẽ không làm sập server, ta bắt lỗi ở đây
            response.failure(f"Login failed: {response.status_code}")

    # TC-PERF-01 & TC-PERF-06: Baseline & Soak Test (CRUD cơ bản)
    @task(3) # Trọng số 3: hay xảy ra
    def crud_tasks(self):
        headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        # Get list
        self.client.get("/api/tasks", headers=headers)
        # Create task
        self.client.post("/api/tasks", json={
            "title": "Task từ Locust",
            "date": "2026-07-12"
        }, headers=headers)

    # TC-PERF-02: Load Test cơ chế Polling /sync trong Study Room
    @task(10) # Trọng số 10: Xảy ra liên tục (mô phỏng polling)
    def polling_sync(self):
        headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        with self.client.get(f"/api/rooms/{self.room_id}/sync", headers=headers, catch_response=True) as response:
            if response.status_code in [200, 403, 404]: # 403/404 vì có thể user chưa join phòng thật
                response.success()
                
    # TC-PERF-04: Stress Test giới hạn tần suất (Rate Limiting)
    @task(1) # Ít gọi hơn nhưng gọi nhanh
    def rate_limiting_test(self):
        # Chức năng này trong kịch bản TC4 mô phỏng 1 IP bắn 120 req/phút
        # Ở đây ta bắn 5 request liên tiếp không wait_time để kích hoạt Rate Limit
        for _ in range(5):
            self.client.get("/api/tasks")

    # TC-PERF-05: Độ trễ API bên thứ 3 (Gemini Chatbot)
    @task(2)
    def chatbot_delay(self):
        headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        # API này có thể trễ < 5s
        self.client.post("/api/chatbot/chat", json={
            "message": "Kiểm tra hiệu năng Locust"
        }, headers=headers)

    # TC-PERF-07: Spike Test Tải đột biến khi đổi cấu hình thời tiết
    @task(1)
    def theme_spike(self):
        headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        self.client.get("/api/auth/ai-helper", headers=headers)

# Hook để theo dõi tỷ lệ lỗi và response time cho Baseline (TC-PERF-01)
@events.request.add_listener
def hook_request_success(request_type, name, response_time, response_length, **kw):
    pass
