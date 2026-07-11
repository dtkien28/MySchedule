const handleSendMessage = async (userText) => {
  // 1. Lấy dữ liệu lịch học đang hiển thị trên giao diện (ví dụ từ biến State 'schedules')
  const currentSchedules = schedules; 
  
  // 2. Gom gói hàng để gửi lên Render
  const payload = {
    message: userText,
    history: chatHistory, // Mảng State lưu các tin nhắn cũ
    page_context: {
      schedules: currentSchedules
    }
  };

  // 3. Gọi API
  const res = await fetch("https://backend-cua-ban.onrender.com/api/chatbot/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  
  const data = await res.json();
  handleAIResponse(data);
};