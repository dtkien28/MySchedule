import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Subjects from './pages/Subjects';
import Groups from './pages/Groups';
import Settings from './pages/Settings';
import Study from './pages/Study';
import Playlist from './pages/Playlist';
import AIChatbot from './components/AIChatbot';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    // Apply user theme and bg if logged in
    const bgImage = localStorage.getItem('bgImage');
    const theme = localStorage.getItem('theme');
    
    if (theme === 'dark') document.body.className = 'dark-theme';
    
    if (bgImage) {
      document.body.style.backgroundImage = `url('/images/${bgImage}')`;
    } else {
      // Fetch weather Da Nang
      fetch('https://api.open-meteo.com/v1/forecast?latitude=16.0678&longitude=108.2208&current_weather=true')
        .then(res => res.json())
        .then(data => {
          const code = data.current_weather.weathercode;
          let weatherBg = '';
          
          if (code === 0) {
            weatherBg = 'url("/Sunny.png")';
          } else if (code >= 1 && code <= 3) {
            weatherBg = 'url("/Cloudy.png")';
          } else if (code === 45 || code === 48) {
            weatherBg = 'url("/suongmu.png")';
          } else if (code >= 51 && code <= 57) {
            weatherBg = 'url("/Chill_Rain.png")';
          } else if ((code >= 61 && code <= 67) || (code >= 80 && code <= 99)) {
            weatherBg = 'url("/Rainy.png")';
          } else {
            weatherBg = 'url("/Cloudy.png")'; // default fallback
          }

          document.body.style.backgroundImage = weatherBg;
          document.body.style.backgroundSize = 'cover';
          document.body.style.backgroundPosition = 'center';
          document.body.style.backgroundAttachment = 'fixed';
        })
        .catch(err => console.error("Weather API Error:", err));
    }
  }, []);

  if (!token) {
    return (
      <>
        <Toaster position="top-right" />
        <Login setToken={setToken} />
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="app-container">
        <Sidebar setToken={setToken} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/subjects" element={<Subjects />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/study" element={<Study />} />
            <Route path="/playlist" element={<Playlist />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        <AIChatbot />
      </div>
    </>
  );
}

export default App;
