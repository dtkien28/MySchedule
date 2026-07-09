import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, Users, LogOut, CheckSquare, Headphones, Settings, Music } from 'lucide-react';

export default function Sidebar({ setToken }) {
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        Ketib<span style={{ color: 'white' }}>Schedule</span>
      </div>
      <div className="sidebar-nav">
        <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
          <Home size={20} /> Dashboard
        </Link>
        <Link to="/subjects" className={`nav-item ${location.pathname === '/subjects' ? 'active' : ''}`}>
          <BookOpen size={20} /> QL Lịch Học
        </Link>
        <Link to="/groups" className={`nav-item ${location.pathname === '/groups' ? 'active' : ''}`}>
          <Users size={20} /> Lịch Nhóm
        </Link>
        <Link to="/study" className={`nav-item ${location.pathname === '/study' ? 'active' : ''}`}>
          <Headphones size={20} /> Học tập
        </Link>
        <Link to="/playlist" className={`nav-item ${location.pathname === '/playlist' ? 'active' : ''}`}>
          <Music size={20} /> Playlist
        </Link>
      </div>
      <div className="sidebar-footer">
        <Link to="/settings" className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`} style={{ marginBottom: '10px' }}>
          <Settings size={20} /> Cài đặt
        </Link>
        <button onClick={handleLogout} className="btn" style={{ width: '100%', background: 'transparent', color: 'white', border: '1px solid white' }}>
          <LogOut size={16} /> Đăng xuất
        </button>
      </div>
    </div>
  );
}
