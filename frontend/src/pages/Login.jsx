import React, { useState, useEffect, useMemo } from 'react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  const typedGreeting = useTypewriter(aiGreeting, 40);

  // Xác định thời gian thực tế tại Việt Nam để đổi màu nền phải
  const rightSideBackground = useMemo(() => {
    const vnTimeStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
    const vnHour = new Date(vnTimeStr).getHours();
    
    // Gradient thay đổi theo giờ (Kết hợp nhiều màu tạo hiệu ứng tuyến tính / neon)
    if (vnHour >= 5 && vnHour < 12) {
        // Buổi sáng: Trắng sáng kết hợp xanh lam nhạt (tươi mới)
        return 'linear-gradient(135deg, #ffffff 0%, #e0eafc 50%, #cfdef3 100%)';
    } else if (vnHour >= 12 && vnHour < 18) {
        // Buổi chiều: Vàng neon kết hợp cam nhạt
        return 'linear-gradient(135deg, #ffe259 0%, #ffa751 50%, #ff8235 100%)';
    } else {
        // Buổi tối / Đêm: Đen sâu kết hợp xanh lam bóng đêm (hiệu ứng bóng tối / neon ngầm)
        return 'linear-gradient(135deg, #000000 0%, #0f2027 50%, #2c5364 100%)';
    }
  }, []);

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
    setIsLoading(true);
    setLoadingText(formType === 'login' ? 'Đang xác thực thông tin...' : 'Đang tạo tài khoản...');
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
        
        setLoadingText('Đăng nhập thành công! Đang chuẩn bị không gian làm việc...');
        setTimeout(() => {
            setToken(res.data.token);
        }, 1200); // Thêm delay nhỏ để user thấy hiệu ứng mượt mà trước khi chuyển trang
      } else {
        if (password !== confirmPassword) {
            setIsLoading(false);
            return toast.error('Mật khẩu xác nhận không khớp!');
        }
        const res = await api.post('/auth/register', { username, email, name: displayName, password });
        setTempUserId(res.data.user_id);
        setShowOTP(true);
        toast.success(res.data.message);
        setIsLoading(false);
      }
    } catch (error) {
      setIsLoading(false);
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
      setIsLoading(true);
      setLoadingText('Đang xác thực mã OTP...');
      try {
          const res = await api.post('/auth/verify', { user_id: tempUserId, code: otpCode });
          toast.success(res.data.message);
          setShowOTP(false);
          setIsFlipped(false);
          setTimeout(() => setIsLogin(true), 150);
          setPassword('');
          setConfirmPassword('');
      } catch (error) {
          toast.error(error.response?.data?.message || 'Mã OTP sai hoặc đã hết hạn');
      } finally {
          setIsLoading(false);
      }
  }

  const handleSocialLogin = (provider) => {
      toast.error(`Tính năng đăng nhập bằng ${provider} đang được phát triển.\nVui lòng sử dụng tài khoản thường.`, { duration: 4000 });
  };

  const isDarkBackground = useMemo(() => {
    const vnTimeStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
    const vnHour = new Date(vnTimeStr).getHours();
    return vnHour >= 18 || vnHour < 5;
  }, []);

  const themeColors = {
      heading: isDarkBackground ? '#ffffff' : '#1a202c',
      subtitle: isDarkBackground ? '#e2e8f0' : '#718096',
      inputBg: isDarkBackground ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.4)',
      inputBorder: isDarkBackground ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
      inputText: isDarkBackground ? '#ffffff' : '#1a202c',
      formBg: isDarkBackground ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.35)',
      divider: isDarkBackground ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
      socialBg: isDarkBackground ? 'rgba(255, 255, 255, 0.1)' : 'white'
  };

  const primaryBtnStyle = { width: '100%', padding: '14px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginTop: '10px', transition: 'background 0.3s' };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', fontFamily: "'Inter', sans-serif", background: '#f5f7fa', overflow: 'hidden', position: 'relative' }}>
      
      {/* LOADING OVERLAY */}
      {isLoading && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: isDarkBackground ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(15px)',
          WebkitBackdropFilter: 'blur(15px)',
          zIndex: 9999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.4s ease'
        }}>
          <div className="modern-spinner"></div>
          <h3 style={{
             marginTop: '25px', 
             color: isDarkBackground ? '#fff' : '#1a202c', 
             fontSize: '1.2rem',
             fontWeight: '600',
             letterSpacing: '0.5px',
             animation: 'pulse 1.5s infinite',
             textAlign: 'center',
             maxWidth: '80%'
          }}>{loadingText}</h3>
        </div>
      )}

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
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: isDarkBackground ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)' }}></div>
          <div style={{ zIndex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', fontWeight: '900', marginBottom: '20px', letterSpacing: '2px', textShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>Ketib Schedule</div>
              <p style={{ fontSize: '1.2rem', maxWidth: '80%', margin: '0 auto', lineHeight: '1.6', opacity: 0.9 }}>
                  Sắp xếp lịch trình thông minh, nâng cao hiệu suất làm việc với sự trợ giúp từ AI.
              </p>
          </div>
      </div>

      {/* NỬA PHẢI: Form Container với background động và hiệu ứng Flip */}
      <div style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          perspective: '1000px',
          background: rightSideBackground // Đổi background dựa vào giờ VN
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
                background: themeColors.formBg, // Hiệu ứng kính mờ (cực trong suốt)
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                padding: '40px',
                borderRadius: '60px 16px 60px 16px', // Bo tròn góc trên trái và dưới phải
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
                border: `1px solid ${isDarkBackground ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
                boxSizing: 'border-box',
                display: !isFlipped ? 'block' : 'none' // Ẩn khi lật để tối ưu
            }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h2 style={{ color: themeColors.heading, fontSize: '28px', fontWeight: 'bold', margin: '0 0 10px 0' }}>
                        Ketib Schedule - Kính mời bạn Đăng nhập
                    </h2>
                    <p style={{ color: themeColors.subtitle, fontSize: '15px', margin: 0, minHeight: '45px' }}>
                        <>{typedGreeting}<span className="blink-cursor">|</span></>
                    </p>
                </div>

                <form onSubmit={(e) => handleSubmit(e, 'login')}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '15px' }}>
                            <input 
                                type="text" 
                                placeholder="Tên đăng nhập" 
                                style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: `1px solid ${themeColors.inputBorder}`, fontSize: '15px', outline: 'none', background: themeColors.inputBg, color: themeColors.inputText, boxSizing: 'border-box' }}
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                            />
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type="password" 
                                    placeholder="Mật khẩu" 
                                    style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: `1px solid ${aiTooltip ? '#ef4444' : themeColors.inputBorder}`, fontSize: '15px', outline: 'none', background: themeColors.inputBg, color: themeColors.inputText, boxSizing: 'border-box' }}
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

                        <button type="submit" style={primaryBtnStyle}>
                            Đăng nhập
                        </button>
                    </form>
                    
                    <div style={{ display: 'flex', alignItems: 'center', margin: '30px 0' }}>
                        <div style={{ flex: 1, height: '1px', background: themeColors.divider }}></div>
                        <span style={{ margin: '0 15px', color: themeColors.subtitle, fontSize: '14px' }}>hoặc đăng nhập qua</span>
                        <div style={{ flex: 1, height: '1px', background: themeColors.divider }}></div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '30px' }}>
                        <button onClick={() => handleSocialLogin('Google')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', background: themeColors.socialBg, border: `1px solid ${themeColors.divider}`, borderRadius: '12px', cursor: 'pointer', transition: 'background 0.2s' }}>
                            <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" style={{width: '20px'}}/>
                        </button>
                        <button onClick={() => handleSocialLogin('Facebook')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', background: themeColors.socialBg, border: `1px solid ${themeColors.divider}`, borderRadius: '12px', cursor: 'pointer', transition: 'background 0.2s' }}>
                            {/* Icon Facebook chuẩn SVG */}
                            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                              <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" fill="#1877F2"/>
                            </svg>
                        </button>
                        <button onClick={() => handleSocialLogin('GitHub')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', background: themeColors.socialBg, border: `1px solid ${themeColors.divider}`, borderRadius: '12px', cursor: 'pointer', transition: 'background 0.2s' }}>
                            <img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" alt="Github" style={{width: '20px', filter: isDarkBackground ? 'invert(1)' : 'none'}}/>
                        </button>
                    </div>

                    <p style={{ textAlign: 'center', margin: '0', fontSize: '15px', color: themeColors.subtitle }}>
                        Chưa có tài khoản?
                        <span style={{ marginLeft: '8px', color: '#4f46e5', fontWeight: '800', cursor: 'pointer' }} onClick={toggleFlip}>
                            Đăng ký ngay
                        </span>
                    </p>
            </div>

            {/* MẶT SAU: REGISTER */}
            <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backfaceVisibility: 'hidden',
                background: themeColors.formBg, // Hiệu ứng kính mờ (cực trong suốt)
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                padding: '40px',
                borderRadius: '16px 60px 16px 60px', // Bo tròn góc trên phải và dưới trái
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
                border: `1px solid ${isDarkBackground ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
                boxSizing: 'border-box',
                transform: 'rotateY(180deg)', // Mặt sau lộn ngược 180 độ
                display: isFlipped ? 'block' : 'none' // Ẩn khi chưa lật
            }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h2 style={{ color: themeColors.heading, fontSize: '28px', fontWeight: 'bold', margin: '0 0 10px 0' }}>
                        {showOTP ? 'Xác thực Email ✉️' : 'Tạo tài khoản mới ✨'}
                    </h2>
                    <p style={{ color: themeColors.subtitle, fontSize: '15px', margin: 0 }}>
                        {showOTP ? 'Vui lòng kiểm tra email của bạn để lấy mã OTP' : 'Bắt đầu hành trình quản lý thời gian ngay hôm nay.'}
                    </p>
                </div>

                {showOTP ? (
                    <form onSubmit={handleVerifyOTP}>
                    <div style={{ marginBottom: '20px' }}>
                        <input 
                        type="text" 
                        placeholder="Nhập mã OTP (6 số)" 
                        style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: `1px solid ${themeColors.inputBorder}`, fontSize: '16px', outline: 'none', background: themeColors.inputBg, color: themeColors.inputText, boxSizing: 'border-box' }}
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value)}
                        required
                        />
                    </div>
                    <button type="submit" style={primaryBtnStyle}>
                        Xác nhận OTP
                    </button>
                    </form>
                ) : (
                    <>
                    <form onSubmit={(e) => handleSubmit(e, 'register')}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
                        <input 
                            type="text" 
                            placeholder="Tên đăng nhập" 
                            style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: `1px solid ${themeColors.inputBorder}`, fontSize: '15px', outline: 'none', background: themeColors.inputBg, color: themeColors.inputText, boxSizing: 'border-box' }}
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            required
                        />
                        <input 
                            type="text" 
                            placeholder="Tên hiển thị (Tùy chọn)" 
                            style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: `1px solid ${themeColors.inputBorder}`, fontSize: '15px', outline: 'none', background: themeColors.inputBg, color: themeColors.inputText, boxSizing: 'border-box' }}
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                        />
                        <input 
                            type="email" 
                            placeholder="Email" 
                            style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: `1px solid ${themeColors.inputBorder}`, fontSize: '15px', outline: 'none', background: themeColors.inputBg, color: themeColors.inputText, boxSizing: 'border-box' }}
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                        <input 
                            type="password" 
                            placeholder="Mật khẩu" 
                            style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: `1px solid ${themeColors.inputBorder}`, fontSize: '15px', outline: 'none', background: themeColors.inputBg, color: themeColors.inputText, boxSizing: 'border-box' }}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                        <input 
                            type="password" 
                            placeholder="Xác nhận Mật khẩu" 
                            style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: `1px solid ${themeColors.inputBorder}`, fontSize: '15px', outline: 'none', background: themeColors.inputBg, color: themeColors.inputText, boxSizing: 'border-box' }}
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" style={primaryBtnStyle}>
                        Đăng ký tài khoản
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '30px', fontSize: '15px', color: themeColors.subtitle }}>
                    Đã có tài khoản?
                    <span style={{ marginLeft: '8px', color: '#4f46e5', fontWeight: '800', cursor: 'pointer' }} onClick={toggleFlip}>
                        Đăng nhập
                    </span>
                </p>
                </>
                )}
            </div>

        </div>
      </div>
      
      {/* Thêm CSS cho hiệu ứng nháy con trỏ của máy đánh chữ và placeholder color */}
      <style>{`
        .blink-cursor {
            animation: blink 1s step-start infinite;
            font-weight: normal;
        }
        @keyframes blink {
            50% { opacity: 0; }
        }
        ::placeholder {
            color: ${isDarkBackground ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'};
        }
        .modern-spinner {
            width: 60px;
            height: 60px;
            border: 4px solid ${isDarkBackground ? 'rgba(255,255,255,0.1)' : 'rgba(79, 70, 229, 0.2)'};
            border-radius: 50%;
            border-top-color: ${isDarkBackground ? '#fff' : '#4f46e5'};
            animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
