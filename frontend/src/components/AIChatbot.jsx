import React, { useState } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Chào bạn! Tôi là Ketib AI. Tôi có thể giúp bạn sắp xếp thời gian hoặc giải đáp thắc mắc về lịch học.", sender: "ai" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userText = input;
    const newMessages = [...messages, { text: userText, sender: "user" }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    
    try {
      // 1. Lấy dữ liệu lịch học đang hiển thị trên giao diện
      const subjRes = await api.get('/subjects');
      const currentSchedules = subjRes.data;
      
      // 2. Gom gói hàng để gửi lên Render
      const payload = {
        message: userText,
        history: messages,
        page_context: {
          schedules: currentSchedules
        }
      };

      // 3. Gọi API Chatbot
      const res = await api.post('/chatbot/chat', payload);
      const data = res.data;

      if (data.status === "success") {
        setMessages([...newMessages, { sender: 'ai', text: data.reply }]);

        // Kiểm tra xem AI có "ra lệnh" thêm lịch không
        if (data.type === "action_add" && data.action_data) {
          try {
            await api.post('/subjects', data.action_data);
            toast.success("AI đã thêm môn học mới thành công!");
            window.dispatchEvent(new Event('reloadSubjects'));
          } catch (e) {
            toast.error("AI tạo môn học thất bại!");
            console.error(e);
          }
        }
      } else {
        setMessages([...newMessages, { sender: 'ai', text: data.reply || 'Hệ thống AI đang bận.' }]);
      }
    } catch (e) {
      console.error(e);
      setMessages([...newMessages, { sender: 'ai', text: 'Không thể kết nối đến server. Vui lòng thử lại.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="chatbot-bubble" onClick={() => setIsOpen(true)}>
        <MessageSquare size={28} />
      </div>
    );
  }

  return (
    <div className="chatbot-window">
      <div className="chatbot-header">
        <span>Ketib AI Assistant</span>
        <X size={20} style={{cursor:'pointer'}} onClick={() => setIsOpen(false)} />
      </div>
      <div className="chatbot-body">
        {messages.map((m, idx) => (
          <div key={idx} style={{
            background: m.sender === 'ai' ? '#e2e8f0' : 'var(--primary-color)',
            color: m.sender === 'ai' ? '#1E293B' : 'white',
            padding: '10px 15px',
            borderRadius: '12px',
            marginBottom: '10px',
            alignSelf: m.sender === 'ai' ? 'flex-start' : 'flex-end',
            maxWidth: '80%',
            marginLeft: m.sender === 'ai' ? '0' : 'auto',
            marginRight: m.sender === 'ai' ? 'auto' : '0'
          }}>
            {m.text}
          </div>
        ))}
        {isLoading && (
          <div style={{
            background: '#e2e8f0', color: '#1E293B', padding: '10px 15px',
            borderRadius: '12px', marginBottom: '10px', alignSelf: 'flex-start',
            maxWidth: '80%', fontStyle: 'italic'
          }}>
            Đang suy nghĩ...
          </div>
        )}
      </div>
      <div className="chatbot-footer">
        <input 
          className="input-field" 
          style={{marginBottom:0}} 
          placeholder="Nhập tin nhắn..." 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button className="btn btn-secondary" style={{padding:'10px'}} onClick={handleSend}><Send size={18} /></button>
      </div>
    </div>
  );
}
