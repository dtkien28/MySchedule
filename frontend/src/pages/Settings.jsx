import React, { useState, useEffect } from 'react';
import api from '../api';

export default function Settings() {
  const [displayName, setDisplayName] = useState(localStorage.getItem('displayName') || '');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [bgImage, setBgImage] = useState(localStorage.getItem('bgImage') || '');
  const [streak, setStreak] = useState(parseInt(localStorage.getItem('streak')) || 0);
  
  const [musicLinks, setMusicLinks] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');

  // Example themes
  const backgrounds = [
    { id: '', name: 'Mặc định (Theo thời tiết)', requiredStreak: 0 },
    { id: 'bg1.jpg', name: 'Thành phố về đêm', requiredStreak: 3 },
    { id: 'bg2.jpg', name: 'Hoàng hôn biển', requiredStreak: 7 },
    { id: 'bg3.jpg', name: 'Khu rừng huyền bí', requiredStreak: 14 },
    { id: 'bg4.jpg', name: 'Không gian vũ trụ', requiredStreak: 30 }
  ];

  useEffect(() => {
    fetchMusic();
  }, []);

  const fetchMusic = async () => {
    try {
      const res = await api.get('/music');
      setMusicLinks(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await api.put('/settings', { display_name: displayName, theme, background_image: bgImage });
      localStorage.setItem('displayName', displayName);
      localStorage.setItem('theme', theme);
      localStorage.setItem('bgImage', bgImage);
      
      // Apply theme and bg immediately
      document.body.className = theme === 'dark' ? 'dark-theme' : '';
      if (bgImage) {
        document.body.style.backgroundImage = `url('/images/${bgImage}')`;
      } else {
        // Leave it for weather logic to pick up next reload
        document.body.style.backgroundImage = 'none';
        window.location.reload(); // Quick way to trigger weather bg
      }
      
      alert('Đã lưu cài đặt!');
    } catch (e) {
      alert('Lỗi khi lưu cài đặt');
    }
  };

  const handleAddMusic = async () => {
    if (!newTitle || !newUrl) return;
    try {
      await api.post('/music', { title: newTitle, youtube_url: newUrl });
      setNewTitle('');
      setNewUrl('');
      fetchMusic();
    } catch (e) {
      alert('Lỗi thêm nhạc');
    }
  };

  const handleDeleteMusic = async (id) => {
    try {
      await api.delete(`/music/${id}`);
      fetchMusic();
    } catch (e) {
      alert('Lỗi xóa nhạc');
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h1>Cài đặt cá nhân</h1>
      
      <div className="card">
        <h3>Hồ sơ & Giao diện</h3>
        <p>Chuỗi Streak hiện tại: <strong style={{ color: 'var(--primary-color)', fontSize: '18px' }}>🔥 {streak} ngày</strong></p>
        
        <div style={{ marginTop: '15px' }}>
          <label>Tên hiển thị:</label>
          <input className="input-field" value={displayName} onChange={e => setDisplayName(e.target.value)} />
        </div>
        
        <div style={{ marginTop: '15px' }}>
          <label>Chế độ Sáng/Tối:</label>
          <select className="input-field" value={theme} onChange={e => setTheme(e.target.value)}>
            <option value="light">Sáng (Light)</option>
            <option value="dark">Tối (Dark)</option>
          </select>
        </div>
        
        <div style={{ marginTop: '15px' }}>
          <label>Hình nền (Mở khóa theo Streak):</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', marginTop: '10px' }}>
            {backgrounds.map(bg => {
              const isLocked = streak < bg.requiredStreak;
              return (
                <div 
                  key={bg.id} 
                  style={{ 
                    padding: '10px', 
                    border: bgImage === bg.id ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                    borderRadius: '8px',
                    opacity: isLocked ? 0.5 : 1,
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    background: isLocked ? 'var(--bg-color)' : 'var(--card-bg)',
                    color: isLocked ? 'var(--text-muted)' : 'inherit'
                  }}
                  onClick={() => !isLocked && setBgImage(bg.id)}
                >
                  <div style={{ fontWeight: 'bold' }}>{bg.name}</div>
                  <div style={{ fontSize: '12px' }}>
                    {isLocked ? `🔒 Cần ${bg.requiredStreak} ngày streak` : (bgImage === bg.id ? '✅ Đang chọn' : 'Mở khóa')}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        
        <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={handleSaveSettings}>Lưu thay đổi</button>
      </div>

    </div>
  );
}
