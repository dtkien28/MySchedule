import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

// Typewriter hook
function useTypewriter(text, speed = 50) {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let i = 0;
    setDisplayedText('');
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.substring(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return displayedText;
}

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
  
  const [aiGreeting, setAiGreeting] = useState('Chào mừng bạn quay trở lại!');
  const [aiTooltip, setAiTooltip] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);

  const typedGreeting = useTypewriter(aiGreeting, 40);

  useEffect(() => {
    // Gọi AI lấy câu chào
    api.post('/auth/ai-helper', { action: 'greeting' })
      .then(res => setAiGreeting(res.data.message))
      .catch(err => console.error("Lỗi lấy câu chào AI:", err));
  }, []);

  const toggleFlip = () => {
    setIsFlipped(!isFlipped);
    setTimeout(() => {
        setIsLogin(!isLogin);
        setShowOTP(false);
    }, 150); // Đổi state giữa lúc lật (150ms là nửa thời gian transition 0.3s)
  };

  const handleSubmit = async (e, formType) => {
    e.preventDefault();
    setAiTooltip(''); // Reset tooltip
    try {
      if (formType === 'login') {
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
      if (formType === 'login' && error.response?.status === 401) {
          // Báo lỗi sai mật khẩu qua AI
          api.post('/auth/ai-helper', { action: 'login_error' })
            .then(res => setAiTooltip(res.data.message))
            .catch(() => setAiTooltip('Mật khẩu chưa đúng rồi, bạn kiểm tra lại nha.'));
      } else {
          toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
      }
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
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', fontFamily: "'Inter', sans-serif", background: '#f5f7fa', overflow: 'hidden' }}>
      
      {/* NỬA TRÁI: Visual & Slogan */}
      <div style={{ 
          flex: 1, 
          background: 'url("/background_welcome.png") center/cover no-repeat, linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center', 
          color: 'white',
          padding: '40px',
          position: 'relative'
      }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.4)' }}></div>
          <div style={{ zIndex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', fontWeight: '900', marginBottom: '20px', letterSpacing: '2px', textShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>Ketib Schedule</div>
              <p style={{ fontSize: '1.2rem', maxWidth: '80%', margin: '0 auto', lineHeight: '1.6', opacity: 0.9 }}>
                  Sắp xếp lịch trình thông minh, nâng cao hiệu suất làm việc với sự trợ giúp từ AI.
              </p>
          </div>
      </div>

      {/* NỬA PHẢI: Form Container với hiệu ứng Flip */}
      <div style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          perspective: '1000px',
          background: 'white'
      }}>
        
        {/* Flip Card Inner */}
        <div style={{
            width: '450px',
            maxWidth: '90%',
            transition: 'transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)',
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            position: 'relative',
            height: showOTP ? '350px' : (isLogin ? '600px' : '700px')
        }}>

            {/* MẶT TRƯỚC: LOGIN HOẶC OTP */}
            <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backfaceVisibility: 'hidden',
                background: 'white',
                padding: '40px',
                borderRadius: '24px',
                boxSizing: 'border-box',
                display: !isFlipped ? 'block' : 'none' // Ẩn khi lật để tối ưu
            }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h2 style={{ color: '#1a202c', fontSize: '28px', fontWeight: 'bold', margin: '0 0 10px 0' }}>
                        {showOTP ? 'Xác thực Email ✉️' : 'Đăng nhập vào Ketib 👋'}
                    </h2>
                    <p style={{ color: '#718096', fontSize: '15px', margin: 0, minHeight: '45px' }}>
                        {showOTP ? 'Vui lòng kiểm tra email của bạn để lấy mã OTP' : <>{typedGreeting}<span className="blink-cursor">|</span></>}
                    </p>
                </div>

                {showOTP ? (
                    <form onSubmit={handleVerifyOTP}>
                    <div style={{ marginBottom: '20px' }}>
                        <input 
                        type="text" 
                        placeholder="Nhập mã OTP (6 số)" 
                        style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '16px', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value)}
                        required
                        />
                    </div>
                    <button type="submit" style={{ width: '100%', padding: '14px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.3s' }}>
                        Xác nhận OTP
                    </button>
                    </form>
                ) : (
                    <>
                    <form onSubmit={(e) => handleSubmit(e, 'login')}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '15px' }}>
                            <input 
                                type="text" 
                                placeholder="Tên đăng nhập" 
                                style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '15px', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                            />
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type="password" 
                                    placeholder="Mật khẩu" 
                                    style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: `1px solid ${aiTooltip ? '#ef4444' : '#e2e8f0'}`, fontSize: '15px', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                />
                                {aiTooltip && (
                                    <div style={{ position: 'absolute', top: '100%', left: '0', background: '#fee2e2', color: '#b91c1c', padding: '10px 15px', borderRadius: '8px', fontSize: '13px', marginTop: '5px', zIndex: 10, width: '100%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: '1px solid #fca5a5' }}>
                                        🤖 <b>AI:</b> {aiTooltip}
                                    </div>
                                )}
                            </div>
                        </div>

                        <button type="submit" style={{ width: '100%', padding: '14px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginTop: '10px', transition: 'background 0.3s' }}>
                            Đăng nhập
                        </button>
                    </form>
                    
                    <div style={{ display: 'flex', alignItems: 'center', margin: '30px 0' }}>
                        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                        <span style={{ margin: '0 15px', color: '#a0aec0', fontSize: '14px' }}>hoặc đăng nhập qua</span>
                        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '30px' }}>
                        <button onClick={() => handleSocialLogin('Google')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.2s' }}>
                            <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" style={{width: '20px'}}/>
                        </button>
                        <button onClick={() => handleSocialLogin('Facebook')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.2s' }}>
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/1024px-Facebook_Logo_%282019%29.png" alt="Facebook" style={{width: '20px'}}/>
                        </button>
                        <button onClick={() => handleSocialLogin('GitHub')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.2s' }}>
                            <img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" alt="Github" style={{width: '20px'}}/>
                        </button>
                    </div>

                    <p style={{ textAlign: 'center', margin: '0', fontSize: '15px', color: '#718096' }}>
                        Chưa có tài khoản?
                        <span style={{ marginLeft: '8px', color: '#4f46e5', fontWeight: '600', cursor: 'pointer' }} onClick={toggleFlip}>
                            Đăng ký ngay
                        </span>
                    </p>
                    </>
                )}
            </div>

            {/* MẶT SAU: REGISTER */}
            <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backfaceVisibility: 'hidden',
                background: 'white',
                padding: '40px',
                borderRadius: '24px',
                boxSizing: 'border-box',
                transform: 'rotateY(180deg)', // Mặt sau lộn ngược 180 độ
                display: isFlipped ? 'block' : 'none' // Ẩn khi chưa lật
            }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h2 style={{ color: '#1a202c', fontSize: '28px', fontWeight: 'bold', margin: '0 0 10px 0' }}>
                        Tạo tài khoản mới ✨
                    </h2>
                    <p style={{ color: '#718096', fontSize: '15px', margin: 0 }}>
                        Bắt đầu hành trình quản lý thời gian ngay hôm nay.
                    </p>
                </div>

                <form onSubmit={(e) => handleSubmit(e, 'register')}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
                        <input 
                            type="text" 
                            placeholder="Tên đăng nhập" 
                            style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '15px', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            required
                        />
                        <input 
                            type="text" 
                            placeholder="Tên hiển thị (Tùy chọn)" 
                            style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '15px', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                        />
                        <input 
                            type="email" 
                            placeholder="Email" 
                            style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '15px', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                        <input 
                            type="password" 
                            placeholder="Mật khẩu" 
                            style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '15px', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                        <input 
                            type="password" 
                            placeholder="Xác nhận Mật khẩu" 
                            style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '15px', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" style={{ width: '100%', padding: '14px', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.3s' }}>
                        Đăng ký tài khoản
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '30px', fontSize: '15px', color: '#718096' }}>
                    Đã có tài khoản?
                    <span style={{ marginLeft: '8px', color: '#10b981', fontWeight: '600', cursor: 'pointer' }} onClick={toggleFlip}>
                        Đăng nhập
                    </span>
                </p>
            </div>

        </div>
      </div>
      
      {/* Thêm CSS cho hiệu ứng nháy con trỏ của máy đánh chữ */}
      <style>{`
        .blink-cursor {
            animation: blink 1s step-start infinite;
            font-weight: normal;
        }
        @keyframes blink {
            50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
