const handleAIResponse = (data) => {
  if (data.status === "success") {
    // 1. Thêm câu nói của AI vào khung chat
    setChatHistory(prev => [...prev, { sender: 'assistant', text: data.reply }]);

    // 2. Kiểm tra xem AI có "ra lệnh" thêm lịch không
    if (data.type === "action_add" && data.action_data) {
      // Gọi luôn hàm thêm môn học vào UI của bạn (giống hệt lúc bấm nút Lưu bằng tay)
      const newSubject = data.action_data;
      
      // Ví dụ: setSchedules([...schedules, newSubject]);
      console.log("Chuẩn bị chèn môn học này vào UI: ", newSubject);
    }
  }
};