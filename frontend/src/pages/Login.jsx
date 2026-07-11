import React, { useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Github, Facebook } from 'lucide-react';

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
        toast.success("Đăng nhập thành công!");
      } else {
        if (password !== confirmPassword) {
            return toast.error('Mật khẩu xác nhận không khớp!');
        }
        const res = await api.post('/auth/register', { username, email, name: displayName, password });
        setTempUserId(res.data.user_id);
        setShowOTP(true);
        toast.success(res.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleVerifyOTP = async (e) => {
      e.preventDefault();
      try {
          const res = await api.post('/auth/verify', { user_id: tempUserId, code: otpCode });
          toast.success(res.data.message);
          setShowOTP(false);
          setIsLogin(true);
          setPassword('');
          setConfirmPassword('');
      } catch (error) {
          toast.error(error.response?.data?.message || 'Mã OTP sai hoặc đã hết hạn');
      }
  }

  const handleSocialLogin = (provider) => {
      toast.error(`Tính năng đăng nhập bằng ${provider} đang được phát triển.\nVui lòng sử dụng tài khoản thường.`, { duration: 4000 });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ width: '400px', maxWidth: '100%', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', padding: '40px 30px', boxSizing: 'border-box' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ color: '#333', fontSize: '28px', fontWeight: 'bold', margin: '0 0 10px 0' }}>
            {showOTP ? 'Xác thực Email' : (isLogin ? 'Chào mừng trở lại! 👋' : 'Tạo tài khoản mới ✨')}
          </h2>
          <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
             {showOTP ? 'Vui lòng kiểm tra email của bạn để lấy mã OTP' : (isLogin ? 'Vui lòng đăng nhập để tiếp tục' : 'Bắt đầu quản lý lịch học của bạn ngay hôm nay')}
          </p>
        </div>
        
        {showOTP ? (
            <form onSubmit={handleVerifyOTP}>
              <div style={{ marginBottom: '20px' }}>
                <input 
                  type="text" 
                  placeholder="Nhập mã OTP (6 số)" 
                  style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '16px', outline: 'none', transition: 'border-color 0.3s', boxSizing: 'border-box' }}
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                  required
                />
              </div>
              <button type="submit" style={{ width: '100%', padding: '14px', background: '#667eea', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'transform 0.2s, background 0.3s' }}>
                Xác nhận OTP
              </button>
            </form>
        ) : (
            <>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
                <input 
                  type="text" 
                  placeholder="Tên đăng nhập" 
                  style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
                {!isLogin && (
                  <>
                  <input 
                    type="text" 
                    placeholder="Tên hiển thị (Tùy chọn)" 
                    style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                  />
                  <input 
                    type="email" 
                    placeholder="Email" 
                    style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                  </>
                )}
                <input 
                  type="password" 
                  placeholder="Mật khẩu" 
                  style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                {!isLogin && (
                  <input 
                    type="password" 
                    placeholder="Xác nhận Mật khẩu" 
                    style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                )}
              </div>

              <button type="submit" style={{ width: '100%', padding: '14px', background: 'linear-gradient(to right, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'opacity 0.3s' }}>
                {isLogin ? 'Đăng nhập' : 'Đăng ký'}
              </button>
            </form>
            
            <div style={{ display: 'flex', alignItems: 'center', margin: '25px 0' }}>
               <div style={{ flex: 1, height: '1px', background: '#ddd' }}></div>
               <span style={{ margin: '0 15px', color: '#999', fontSize: '14px' }}>hoặc tiếp tục với</span>
               <div style={{ flex: 1, height: '1px', background: '#ddd' }}></div>
            </div>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '25px' }}>
                <button onClick={() => handleSocialLogin('Google')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', background: 'white', border: '1px solid #ddd', borderRadius: '12px', cursor: 'pointer', color: '#333', transition: 'background 0.2s' }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                </button>
                <button onClick={() => handleSocialLogin('Facebook')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', background: 'white', border: '1px solid #ddd', borderRadius: '12px', cursor: 'pointer', color: '#1877F2', transition: 'background 0.2s' }}>
                    <Facebook size={20} />
                </button>
                <button onClick={() => handleSocialLogin('GitHub')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', background: 'white', border: '1px solid #ddd', borderRadius: '12px', cursor: 'pointer', color: '#333', transition: 'background 0.2s' }}>
                    <Github size={20} />
                </button>
            </div>

            <p style={{ textAlign: 'center', margin: '0', fontSize: '14px', color: '#666' }}>
              {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
              <span 
                style={{ marginLeft: '5px', color: '#667eea', fontWeight: 'bold', cursor: 'pointer' }} 
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
              </span>
            </p>
            </>
        )}
      </div>
    </div>
  );
}
