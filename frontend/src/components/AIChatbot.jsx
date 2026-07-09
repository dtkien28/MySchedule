import React, { useState } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Chào bạn! Tôi là trợ lý AI. Tôi có thể giúp bạn sắp xếp thời gian hoặc giải đáp thắc mắc.", sender: "ai" }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { text: input, sender: "user" }]);
    setInput('');
    
    // Fake AI response for now
    setTimeout(() => {
      setMessages(prev => [...prev, { text: "Tính năng này đang được phát triển để tích hợp mô hình AI bạn chọn.", sender: "ai" }]);
    }, 1000);
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
