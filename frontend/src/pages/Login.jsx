import React, { useState } from 'react';
import api from '../api';

export default function Login({ setToken }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [tempUserId, setTempUserId] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        const res = await api.post('/auth/login', { username, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('username', res.data.username);
        localStorage.setItem('userId', res.data.user_id);
        localStorage.setItem('displayName', res.data.display_name);
        localStorage.setItem('theme', res.data.theme || 'light');
        localStorage.setItem('bgImage', res.data.background_image || '');
        localStorage.setItem('streak', res.data.streak || 0);
        setToken(res.data.token);
      } else {
        if (password !== confirmPassword) {
            return alert('Mật khẩu xác nhận không khớp!');
        }
        const res = await api.post('/auth/register', { username, email, name: displayName, password });
        setTempUserId(res.data.user_id);
        setShowOTP(true);
        alert(res.data.message);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleVerifyOTP = async (e) => {
      e.preventDefault();
      try {
          const res = await api.post('/auth/verify', { user_id: tempUserId, code: otpCode });
          alert(res.data.message);
          setShowOTP(false);
          setIsLogin(true);
          setPassword('');
          setConfirmPassword('');
      } catch (error) {
          alert(error.response?.data?.message || 'Mã OTP sai hoặc đã hết hạn');
      }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary-color)' }}>
      <div className="card" style={{ width: '400px', background: 'white' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--primary-color)' }}>
          {showOTP ? 'Xác thực Email' : (isLogin ? 'Đăng nhập' : 'Đăng ký')}
        </h2>
        
        {showOTP ? (
            <form onSubmit={handleVerifyOTP} style={{ marginTop: '20px' }}>
              <input 
                type="text" 
                placeholder="Nhập mã OTP (6 số)" 
                className="input-field"
                value={otpCode}
                onChange={e => setOtpCode(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Xác nhận
              </button>
            </form>
        ) : (
            <>
            <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
              <input 
                type="text" 
                placeholder="Tên đăng nhập" 
                className="input-field"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
              {!isLogin && (
                <>
                <input 
                  type="text" 
                  placeholder="Tên hiển thị (Tùy chọn)" 
                  className="input-field"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                />
                <input 
                  type="email" 
                  placeholder="Email" 
                  className="input-field"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                </>
              )}
              <input 
                type="password" 
                placeholder="Mật khẩu" 
                className="input-field"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              {!isLogin && (
                <input 
                  type="password" 
                  placeholder="Xác nhận Mật khẩu" 
                  className="input-field"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
              )}
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                {isLogin ? 'Đăng nhập' : 'Đăng ký'}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: '15px', cursor: 'pointer', color: 'var(--secondary-color)' }} onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
            </p>
            </>
        )}
      </div>
    </div>
  );
}
