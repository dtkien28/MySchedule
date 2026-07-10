import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Study() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('solo');
  const [isStarted, setIsStarted] = useState(false);
  const [now, setNow] = useState(new Date());
  
  // Audio state
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [currentMusic, setCurrentMusic] = useState(null); // object from room sync OR from local playlist
  
  // Solo state
  const [soloStudyTime, setSoloStudyTime] = useState(0);
  const [sessionTasks, setSessionTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  
  
  // Group state
  const [rooms, setRooms] = useState([]);
  const [inRoom, setInRoom] = useState(null);
  const [roomMembers, setRoomMembers] = useState([]);
  const [joinId, setJoinId] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create Room state
  const [newRoomMax, setNewRoomMax] = useState(10);
  const [newRoomApprove, setNewRoomApprove] = useState(false);
  const [newRoomPlaylistId, setNewRoomPlaylistId] = useState('');

  const syncInterval = useRef(null);

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => {
      setNow(new Date());
      if (activeTab === 'solo' && isStarted) {
        setSoloStudyTime(prev => prev + 1);
      }
    }, 1000);
  
  const doneCount = sessionTasks.filter(t => t.done).length;
  const totalCount = sessionTasks.length;
  const sessionProgress = totalCount === 0 ? -1 : Math.round((doneCount / totalCount) * 100);
  const sessionProgressText = totalCount === 0 ? 'Thêm nhiệm vụ để bắt đầu' : `${doneCount}/${totalCount} việc`;

  return () => clearInterval(t);
  }, [activeTab]);

  useEffect(() => {
    fetchPlaylists();
    fetchTasks();
  }, []);

  const fetchPlaylists = async () => {
    try {
      const res = await api.get('/playlists');
      setPlaylists(res.data);
      if (res.data.length > 0) {
        setNewRoomPlaylistId(res.data[0].id);
        setSelectedPlaylistId(res.data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTasks = async () => {
    try {
      const resTasks = await api.get('/tasks');
      const resWorks = await api.get('/works');
      const resAtt = await api.get('/attendance');
      
      const dayStr = new Date().toLocaleDateString('en-GB');
      const todayTasks = resTasks.data.filter(t => t.scheduled_day === dayStr);
      const todayWorks = resWorks.data.filter(w => w.work_day === dayStr);
      
      const total = todayTasks.length + todayWorks.length + resAtt.data.length;
      const done = todayTasks.filter(t => t.status === 'done').length + 
                   todayWorks.filter(w => w.status === 'done').length +
                   resAtt.data.length; // assuming attendance = done

      if (total === 0) {
        // removed global progress
      } else {
        // removed global progress
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSessionTask = () => {
    if (!newTaskTitle.trim()) return;
    setSessionTasks([...sessionTasks, { id: Date.now(), title: newTaskTitle, done: false }]);
    setNewTaskTitle('');
  };

  const toggleSessionTask = (id) => {
    setSessionTasks(sessionTasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const deleteSessionTask = (id) => {
    setSessionTasks(sessionTasks.filter(t => t.id !== id));
  };

  const extractYoutubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
  
  const doneCount = sessionTasks.filter(t => t.done).length;
  const totalCount = sessionTasks.length;
  const sessionProgress = totalCount === 0 ? -1 : Math.round((doneCount / totalCount) * 100);
  const sessionProgressText = totalCount === 0 ? 'Thêm nhiệm vụ để bắt đầu' : `${doneCount}/${totalCount} việc`;

  return (match && match[2].length === 11) ? match[2] : null;
  };

  // --- Music Playback Logic ---
  useEffect(() => {
    if (activeTab === 'solo' && playlists.length > 0 && selectedPlaylistId) {
        const pl = playlists.find(p => p.id == selectedPlaylistId);
        if (pl && pl.items && pl.items.length > 0) {
            const idx = currentSongIndex % pl.items.length;
            setCurrentMusic({ ...pl.items[idx], start_time: new Date().toISOString() });
        } else {
            setCurrentMusic(null);
        }
    }
  }, [activeTab, selectedPlaylistId, currentSongIndex, playlists]);

  const handleNextSong = async () => {
      if (activeTab === 'solo' && isStarted) {
          setCurrentSongIndex(prev => prev + 1);
      } else if (activeTab === 'group' && inRoom && inRoom.host_id === Number(localStorage.getItem('userId'))) {
          try {
              await api.post(`/rooms/${inRoom.id}/next_song`);
              syncRoom();
          } catch(e) {
              console.error('Lỗi chuyển bài');
          }
      }
  };

  // --- Group Logic ---
  useEffect(() => {
    if (activeTab === 'group' && !inRoom) {
      fetchRooms();
    }
    
    if (activeTab === 'group' && inRoom) {
      syncInterval.current = setInterval(syncRoom, 5000);
    }
    
  
  const doneCount = sessionTasks.filter(t => t.done).length;
  const totalCount = sessionTasks.length;
  const sessionProgress = totalCount === 0 ? -1 : Math.round((doneCount / totalCount) * 100);
  const sessionProgressText = totalCount === 0 ? 'Thêm nhiệm vụ để bắt đầu' : `${doneCount}/${totalCount} việc`;

  return () => clearInterval(syncInterval.current);
  }, [activeTab, inRoom]);

  const fetchRooms = async () => {
    try {
      const res = await api.get('/rooms');
      setRooms(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateRoom = async () => {
    try {
      const res = await api.post('/rooms', {
        max_participants: newRoomMax,
        require_approval: newRoomApprove,
        playlist_id: newRoomPlaylistId
      });
      setShowCreateModal(false);
      joinRoom(res.data.room_id);
    } catch (e) {
      alert('Lỗi tạo phòng');
    }
  };

  const joinRoom = async (id) => {
    try {
      const res = await api.post(`/rooms/${id}/join`);
      if (res.data.status === 'approved') {
        setInRoom({ id });
        syncRoom(id);
      } else {
        alert('Đã gửi yêu cầu tham gia. Vui lòng chờ duyệt.');
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Lỗi tham gia phòng');
    }
  };

  const syncRoom = async (roomId = inRoom?.id) => {
    if (!roomId) return;
    try {
      const res = await api.get(`/rooms/${roomId}/sync`);
      setInRoom(res.data.room);
      setRoomMembers(res.data.members);
      
      // Update music from room sync
      if (res.data.room.playlist_id && res.data.room.music_title) {
          setCurrentMusic({
              type: res.data.room.music_type,
              youtube_url: res.data.room.youtube_url,
              file_path: res.data.room.file_path,
              title: res.data.room.music_title,
              start_time: res.data.room.music_start_time
          });
      } else {
          setCurrentMusic(null);
      }
    } catch (e) {
      console.error(e);
      if (e.response?.status === 403 || e.response?.status === 404) {
          alert('Phòng đã đóng hoặc bạn bị kick.');
          setInRoom(null);
          setRoomMembers([]);
          clearInterval(syncInterval.current);
      }
    }
  };

  useEffect(() => {
      const currentRoom = inRoom;
    
  const doneCount = sessionTasks.filter(t => t.done).length;
  const totalCount = sessionTasks.length;
  const sessionProgress = totalCount === 0 ? -1 : Math.round((doneCount / totalCount) * 100);
  const sessionProgressText = totalCount === 0 ? 'Thêm nhiệm vụ để bắt đầu' : `${doneCount}/${totalCount} việc`;

  return () => {
          if (currentRoom) {
              api.post(`/rooms/${currentRoom.id}/leave`).catch(() => {});
          }
      };
  }, [inRoom]);

  const handleKick = async (userId) => {
    try {
      await api.post(`/rooms/${inRoom.id}/kick/${userId}`);
      syncRoom();
    } catch(e) {
      alert('Lỗi kick');
    }
  }

  const formatTime = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  };

  const getMusicStartTimeOffset = () => {
      if (!currentMusic || !currentMusic.start_time) return 0;
      const start = new Date(currentMusic.start_time + "Z").getTime();
      const nowMs = new Date().getTime();
      return Math.max(0, Math.floor((nowMs - start) / 1000));
  };

  const handleLeaveRoom = async () => {
    if (inRoom) {
      try {
        await api.post(`/rooms/${inRoom.id}/leave`);
      } catch (e) {
        console.error("Lỗi khi rời phòng", e);
      }
    }
    navigate('/');
  };


  const doneCount = sessionTasks.filter(t => t.done).length;
  const totalCount = sessionTasks.length;
  const sessionProgress = totalCount === 0 ? -1 : Math.round((doneCount / totalCount) * 100);
  const sessionProgressText = totalCount === 0 ? 'Thêm nhiệm vụ để bắt đầu' : `${doneCount}/${totalCount} việc`;

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'url("https://images.unsplash.com/photo-1519681393784-d120267933ba") center/cover no-repeat',
      zIndex: 1000, display: 'flex', flexDirection: 'column', color: 'white', overflow: 'hidden'
    }}>
      
      {!isStarted && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.7)', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)'
        }}>
          <button 
            onClick={() => setIsStarted(true)}
            style={{ padding: '20px 50px', fontSize: '2rem', borderRadius: '50px', background: 'var(--secondary-color)', color: 'var(--text-main)', border: 'none', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 0 20px var(--secondary-color)' }}>
            ▶ BẮT ĐẦU
          </button>
        </div>
      )}

      {/* HEADER */}
      <div style={{ padding: '20px', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <button className="btn" onClick={handleLeaveRoom}>← Dashboard</button>
          <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.1)', padding: '5px', borderRadius: '8px' }}>
            <button className={`btn ${activeTab === 'solo' ? 'btn-primary' : ''}`} style={{ border: 'none', background: activeTab === 'solo' ? 'var(--primary-color)' : 'transparent', color: 'white' }} onClick={() => setActiveTab('solo')}>Tự học</button>
            <button className={`btn ${activeTab === 'group' ? 'btn-primary' : ''}`} style={{ border: 'none', background: activeTab === 'group' ? 'var(--primary-color)' : 'transparent', color: 'white' }} onClick={() => setActiveTab('group')}>Học nhóm</button>
          </div>
        </div>
        
        {/* Progress Bar (Solo only) */}
        {activeTab === 'solo' && true && (
          <div style={{ width: '300px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '5px' }}>
              <span>Tiến độ ngày:</span>
              <span>{sessionProgress === -1 ? '' : `${sessionProgress}% (${sessionProgressText})`}</span>
            </div>
            {sessionProgress !== -1 ? (
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${sessionProgress}%`, height: '100%', background: 'var(--primary-color)', transition: 'width 0.3s' }}></div>
                </div>
            ) : (
                <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#fbbf24' }}>{sessionProgressText}</div>
            )}
          </div>
        )}
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: 'flex', padding: '20px', gap: '20px' }}>
        
        {/* LEFT: MUSIC (Show in Solo or inside Room) */}
        {(activeTab === 'solo' || (activeTab === 'group' && inRoom)) && (
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)', borderRadius: '12px', padding: '20px', backdropFilter: 'blur(10px)' }}>
            <h3>🎵 Danh sách phát</h3>
            {activeTab === 'solo' && playlists.length > 0 && (
              <select 
                onChange={(e) => { setSelectedPlaylistId(e.target.value); setCurrentSongIndex(0); }} 
                value={selectedPlaylistId}
                style={{ padding: '10px', width: '100%', borderRadius: '8px', border: 'none', marginBottom: '20px' }}
              >
                {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            
            {currentMusic && (
              <div style={{ marginBottom: '20px', padding: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                Đang phát: <strong>{currentMusic.title}</strong>
              </div>
            )}

            {currentMusic?.type === 'youtube' && isStarted && (
              <iframe 
                width="100%" height="200" 
                src={`https://www.youtube.com/embed/${extractYoutubeId(currentMusic.youtube_url)}?autoplay=1&start=${getMusicStartTimeOffset()}`} 
                frameBorder="0" allow="autoplay; encrypted-media" allowFullScreen
                style={{ borderRadius: '8px' }}
              ></iframe>
            )}
            
            {currentMusic?.type === 'mp3' && isStarted && (
              <audio 
                controls autoPlay style={{ width: '100%', marginTop: '20px' }}
                src={`${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://127.0.0.1:5000'}/static/uploads/music/${currentMusic.file_path}`}
                onEnded={handleNextSong}
                onTimeUpdate={(e) => {
                    if (activeTab === 'group' && inRoom) {
                        const targetTime = getMusicStartTimeOffset();
                        if (Math.abs(e.target.currentTime - targetTime) > 5) {
                            e.target.currentTime = targetTime;
                        }
                    }
                }}
              />
            )}
            
            {/* YouTube hack for Next Song detection: host needs to manually click or we use YouTube Player API. For simplicity we add a manual next button for Host/Solo */}
            {currentMusic && (activeTab === 'solo' || (activeTab === 'group' && inRoom?.host_id === Number(localStorage.getItem('userId')))) && (
                <button className="btn btn-primary" style={{ marginTop: '15px', width: '100%' }} onClick={handleNextSong}>⏭ Chuyển bài</button>
            )}
          </div>
        )}

        {/* CENTER: CLOCK */}
        {(activeTab === 'solo' || (activeTab === 'group' && inRoom)) && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '6rem', fontWeight: 'bold', textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
              {now.toLocaleTimeString('en-GB')}
            </div>
            <div style={{ fontSize: '2rem', marginTop: '20px', background: 'rgba(0,0,0,0.4)', padding: '10px 30px', borderRadius: '30px' }}>
              ⏳ {formatTime(activeTab === 'solo' ? soloStudyTime : (inRoom?.created_at ? Math.floor((new Date().getTime() - new Date(inRoom.created_at + 'Z').getTime())/1000) : 0))}
            </div>
          </div>
        )}

        {/* RIGHT: SOLO TASKS */}
        {activeTab === 'solo' && (
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)', borderRadius: '12px', padding: '20px', backdropFilter: 'blur(10px)', overflowY: 'auto' }}>
            <h3>📝 Nhiệm vụ phiên học này</h3>
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <input 
                className="input-field" 
                style={{ marginBottom: 0, flex: 1, background: 'rgba(255,255,255,0.9)', color: 'black' }} 
                placeholder="Thêm nhiệm vụ mới..." 
                value={newTaskTitle} 
                onChange={e => setNewTaskTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddSessionTask()}
              />
              <button className="btn btn-primary" onClick={handleAddSessionTask}>Thêm</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
              {sessionTasks.length === 0 ? <p style={{color: 'var(--text-muted)'}}>Chưa có nhiệm vụ nào!</p> : sessionTasks.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '8px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" checked={t.done} onChange={() => toggleSessionTask(t.id)} />
                    <span style={{ textDecoration: t.done ? 'line-through' : 'none', color: t.done ? '#aaa' : 'white' }}>{t.title}</span>
                  </div>
                  <button className="btn" style={{ padding: '2px 8px', fontSize: '12px', background: 'red', color: 'white' }} onClick={() => deleteSessionTask(t.id)}>Xóa</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RIGHT: GROUP PARTICIPANTS */}
        {activeTab === 'group' && inRoom && (
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)', borderRadius: '12px', padding: '20px', backdropFilter: 'blur(10px)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3>👥 Thành viên ({roomMembers.length}/{inRoom.max_participants})</h3>
                <button className="btn" style={{background: 'red', color: 'white'}} onClick={() => {setInRoom(null); clearInterval(syncInterval.current);}}>Rời phòng</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {roomMembers.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {m.display_name.charAt(0).toUpperCase()}
                    </div>
                    <span>{m.display_name} {inRoom.host_id === m.id ? '(Host)' : ''}</span>
                  </div>
                  {inRoom.host_id === Number(localStorage.getItem('userId') || 0) && m.id !== inRoom.host_id && (
                    <button className="btn" style={{ padding: '5px', fontSize: '12px', background: 'red', color: 'white' }} onClick={() => handleKick(m.id)}>Kick</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GROUP LOBBY */}
        {activeTab === 'group' && !inRoom && (
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)', borderRadius: '12px', padding: '20px', backdropFilter: 'blur(10px)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2>Phòng Học Nhóm</h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input className="input-field" style={{ marginBottom: 0 }} placeholder="Nhập ID Phòng..." value={joinId} onChange={e => setJoinId(e.target.value)} />
                <button className="btn btn-primary" onClick={() => joinRoom(joinId)}>Tìm & Tham gia</button>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>+ Tạo Phòng</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
              {rooms.length === 0 ? <p>Chưa có phòng nào hoạt động.</p> : rooms.map(r => (
                <div key={r.id} style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '12px', width: '250px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                      {r.host_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 style={{ margin: 0 }}>Phòng của {r.host_name}</h4>
                      <div style={{ fontSize: '12px', color: '#ccc' }}>ID: {r.id}</div>
                    </div>
                  </div>
                  <div style={{ marginBottom: '15px', fontSize: '14px' }}>
                    <p>👥 {r.current_participants}/{r.max_participants} người</p>
                    <p>⏳ Bắt đầu: {new Date(r.created_at + 'Z').toLocaleTimeString()}</p>
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => joinRoom(r.id)}>Tham gia</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CREATE ROOM MODAL */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'rgba(20,20,20,0.95)', color: 'white', padding: '30px', borderRadius: '12px', width: '400px', border: '1px solid #444' }}>
            <h2>Tạo phòng học</h2>
            <div style={{ marginTop: '20px' }}>
              <label>Giới hạn người tham gia:</label>
              <input type="number" className="input-field" style={{background: 'white', color: 'black'}} value={newRoomMax} onChange={e => setNewRoomMax(e.target.value)} />
            </div>
            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" id="require_approval" checked={newRoomApprove} onChange={e => setNewRoomApprove(e.target.checked)} />
              <label htmlFor="require_approval">Yêu cầu xác nhận khi tham gia</label>
            </div>
            <div style={{ marginTop: '20px' }}>
              <label>Chọn Playlist:</label>
              <select className="input-field" style={{background: 'white', color: 'black'}} value={newRoomPlaylistId} onChange={e => setNewRoomPlaylistId(e.target.value)}>
                <option value="">-- Không phát nhạc --</option>
                {playlists.map(p => <option key={p.id} value={p.id}>{p.name} ({p.items?.length || 0} bài)</option>)}
              </select>
            </div>
            <div style={{ marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn" style={{background: '#555', color: 'white'}} onClick={() => setShowCreateModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleCreateRoom}>Tạo & Vào phòng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
