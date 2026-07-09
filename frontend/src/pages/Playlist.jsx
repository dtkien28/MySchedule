import React, { useState, useEffect } from 'react';
import api from '../api';
import { Trash2, Plus, Music, PlayCircle } from 'lucide-react';

export default function Playlist() {
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    try {
      const res = await api.get('/playlists');
      setPlaylists(res.data);
      if (res.data.length > 0 && !selectedPlaylistId) {
        setSelectedPlaylistId(res.data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      await api.post('/playlists', { name: newPlaylistName });
      setNewPlaylistName('');
      fetchPlaylists();
    } catch (e) {
      alert('Lỗi tạo Playlist');
    }
  };

  const handleDeletePlaylist = async (id) => {
    if (!window.confirm('Xóa playlist này?')) return;
    try {
      await api.delete(`/playlists/${id}`);
      if (selectedPlaylistId === id) setSelectedPlaylistId(null);
      fetchPlaylists();
    } catch (e) {
      alert('Lỗi xóa Playlist');
    }
  };

  const handleAddYoutube = async () => {
    if (!newTitle || !newUrl || !selectedPlaylistId) return;
    try {
      const res = await api.post('/music', { title: newTitle, youtube_url: newUrl });
      await api.post(`/playlists/${selectedPlaylistId}/items`, { music_id: res.data.id });
      setNewTitle('');
      setNewUrl('');
      fetchPlaylists();
    } catch (e) {
      alert('Lỗi thêm nhạc');
    }
  };

  const handleUploadMp3 = async () => {
    if (!file || !selectedPlaylistId) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', newTitle || file.name);

    try {
      const res = await api.post('/music/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await api.post(`/playlists/${selectedPlaylistId}/items`, { music_id: res.data.id });
      setFile(null);
      setNewTitle('');
      fetchPlaylists();
    } catch (e) {
      alert('Lỗi upload nhạc');
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await api.delete(`/playlists/items/${itemId}`);
      fetchPlaylists();
    } catch (e) {
      alert('Lỗi xóa nhạc khỏi playlist');
    }
  };

  const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', gap: '20px', height: '100%' }}>
      {/* LEFT: PLAYLISTS */}
      <div className="card" style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
        <h2>Danh sách Playlist</h2>
        <div style={{ display: 'flex', gap: '10px', marginTop: '15px', marginBottom: '20px' }}>
          <input className="input-field" style={{ marginBottom: 0, flex: 1 }} placeholder="Tên Playlist mới..." value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreatePlaylist()} />
          <button className="btn btn-primary" onClick={handleCreatePlaylist}><Plus size={16} /></button>
        </div>
        
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {playlists.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Chưa có Playlist nào.</p> : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {playlists.map(p => (
                <li key={p.id} 
                    style={{ 
                      padding: '15px', 
                      borderRadius: '8px', 
                      background: selectedPlaylistId === p.id ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                      color: selectedPlaylistId === p.id ? 'white' : 'var(--text-color)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onClick={() => setSelectedPlaylistId(p.id)}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '16px' }}>{p.name}</strong>
                    <span style={{ fontSize: '12px', opacity: 0.8 }}>{p.items?.length || 0} bài nhạc</span>
                  </div>
                  <button className="btn" style={{ padding: '5px', background: 'transparent', color: selectedPlaylistId === p.id ? 'white' : 'red', border: 'none' }} onClick={(e) => { e.stopPropagation(); handleDeletePlaylist(p.id); }}>
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* RIGHT: PLAYLIST DETAILS */}
      <div className="card" style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
        {selectedPlaylist ? (
          <>
            <h2>{selectedPlaylist.name}</h2>
            
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', marginTop: '20px' }}>
              <h3>Thêm nhạc vào Playlist</h3>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px', alignItems: 'center' }}>
                <PlayCircle size={24} style={{ color: '#ef4444' }} />
                <input className="input-field" style={{ marginBottom: 0, flex: 1 }} placeholder="Tên bài hát" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                <input className="input-field" style={{ marginBottom: 0, flex: 2 }} placeholder="Link Youtube" value={newUrl} onChange={e => setNewUrl(e.target.value)} />
                <button className="btn btn-primary" onClick={handleAddYoutube}>Thêm YT</button>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px', alignItems: 'center' }}>
                <Music size={24} style={{ color: '#3b82f6' }} />
                <input className="input-field" style={{ marginBottom: 0, flex: 1 }} placeholder="Tên bài hát (để trống lấy tên file)" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                <input type="file" accept=".mp3" onChange={e => setFile(e.target.files[0])} />
                <button className="btn btn-primary" onClick={handleUploadMp3}>Tải MP3</button>
              </div>
            </div>

            <h3 style={{ marginTop: '30px' }}>Danh sách phát ({selectedPlaylist.items?.length || 0})</h3>
            <div style={{ overflowY: 'auto', flex: 1, marginTop: '10px' }}>
              {selectedPlaylist.items?.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>Playlist này đang trống.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedPlaylist.items?.map((item, index) => (
                    <li key={item.item_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {index + 1}
                        </div>
                        <div>
                          <strong>{item.title}</strong>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {item.type === 'youtube' ? '📺 Youtube' : '🎵 MP3 Local'}
                          </div>
                        </div>
                      </div>
                      <button className="btn btn-secondary" style={{ background: '#ef4444', color: 'white', border: 'none', padding: '5px 10px' }} onClick={() => handleDeleteItem(item.item_id)}>Xóa</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            <p>Chọn một Playlist ở bên trái để xem chi tiết.</p>
          </div>
        )}
      </div>
    </div>
  );
}
