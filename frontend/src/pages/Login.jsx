import React, { useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Github, Facebook, Chrome } from 'lucide-react';

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
                    <Chrome size={20} color="#EA4335" />
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
