import React, { useState, useEffect } from 'react';
import api from '../api';
import TimeGrid from '../components/TimeGrid';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [newMemberUsername, setNewMemberUsername] = useState('');
  const [groupSchedule, setGroupSchedule] = useState([]);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [meetingStart, setMeetingStart] = useState('');
  const [meetingEnd, setMeetingEnd] = useState('');

  const getWeekNumber = (d) => {
    const date = new Date(d.getTime());
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    const weekNo = Math.ceil(( ( (date - yearStart) / 86400000) + 1)/7);
    const ACADEMIC_OFFSET = 20; 
    let uWeek = weekNo + ACADEMIC_OFFSET;
    if (uWeek > 52) uWeek -= 52;
    return uWeek;
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const res = await api.get('/groups');
      setGroups(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await api.post('/groups', { name: newGroupName });
      setNewGroupName('');
      loadGroups();
    } catch (e) {
      console.error(e);
    }
  };

  const addMember = async () => {
    if (!selectedGroup || !newMemberUsername.trim()) return;
    try {
      const res = await api.post(`/groups/${selectedGroup.id}/members`, { username: newMemberUsername });
      if (res.data.error) alert(res.data.error);
      else {
        alert('Đã thêm thành viên');
        setNewMemberUsername('');
        fetchGroupSchedule(selectedGroup.id);
      }
    } catch (e) {
      alert('Không tìm thấy user hoặc không có quyền');
    }
  };

  const fetchGroupSchedule = async (groupId) => {
    try {
      const res = await api.get(`/groups/${groupId}/schedule`);
      
      // Process schedule for the TimeGrid
      const evts = [];
      const currentWeek = getWeekNumber(new Date());
      
      res.data.forEach(item => {
        if (currentWeek >= item.start_week && currentWeek <= item.end_week) {
          if (!item.cancel_weeks.includes(currentWeek)) {
            evts.push({
              type: 'busy', // It's busy time for this user
              day: item.day,
              time_start: item.time_start,
              time_end: item.time_end,
              title: 'Bận',
              subtitle: item.username
            });
          }
        }
      });
      setGroupSchedule(evts);
    } catch (e) {
      console.error(e);
    }
  };

  const createMeeting = async () => {
      if (!meetingTitle || !meetingDate || !meetingStart || !meetingEnd || !selectedGroup) return;
      try {
          await api.post(`/groups/${selectedGroup.id}/meetings`, {
              title: meetingTitle,
              scheduled_day: meetingDate,
              time_start: meetingStart,
              time_end: meetingEnd
          });
          alert("Đã tạo lịch họp nhóm! Hãy kiểm tra Dashboard.");
          setMeetingTitle('');
          setMeetingStart('');
          setMeetingEnd('');
      } catch (e) {
          alert("Lỗi khi tạo lịch họp");
      }
  };

  return (
    <div style={{display: 'flex', gap: '20px'}}>
      <div style={{width: '300px'}}>
        <h2>Danh sách Nhóm</h2>
        <div className="card">
          <input className="input-field" placeholder="Tên nhóm mới" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
          <button className="btn btn-primary" onClick={createGroup} style={{width:'100%'}}>Tạo nhóm</button>
        </div>
        
        <div className="card" style={{padding:0, overflow:'hidden'}}>
          {groups.map(g => (
            <div 
              key={g.id} 
              style={{
                padding:'15px', 
                borderBottom:'1px solid var(--border-color)', 
                cursor:'pointer',
                background: selectedGroup?.id === g.id ? 'var(--bg-color)' : 'white'
              }}
              onClick={() => { setSelectedGroup(g); fetchGroupSchedule(g.id); }}
            >
              <strong>{g.name}</strong>
            </div>
          ))}
        </div>
      </div>
      
      <div style={{flex: 1}}>
        {selectedGroup ? (
          <>
            <div className="card" style={{display: 'flex', gap: '10px'}}>
              <input className="input-field" style={{marginBottom:0}} placeholder="Username thành viên" value={newMemberUsername} onChange={e => setNewMemberUsername(e.target.value)} />
              <button className="btn btn-secondary" onClick={addMember}>Thêm vào nhóm</button>
            </div>
            
            <div className="card" style={{display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap'}}>
              <h4 style={{width: '100%', margin: 0}}>Tạo lịch họp</h4>
              <input className="input-field" style={{marginBottom:0, flex: 1}} placeholder="Tiêu đề (VD: Họp báo cáo)" value={meetingTitle} onChange={e => setMeetingTitle(e.target.value)} />
              <input className="input-field" type="date" style={{marginBottom:0}} value={meetingDate} onChange={e => setMeetingDate(e.target.value)} />
              <input className="input-field" type="time" style={{marginBottom:0}} value={meetingStart} onChange={e => setMeetingStart(e.target.value)} />
              <input className="input-field" type="time" style={{marginBottom:0}} value={meetingEnd} onChange={e => setMeetingEnd(e.target.value)} />
              <button className="btn btn-primary" onClick={createMeeting}>Lên lịch</button>
            </div>
            
            <div className="card">
              <h3>Lịch rảnh/bận chung: {selectedGroup.name} (Tuần {getWeekNumber(new Date())})</h3>
              <p>Lịch hiển thị các khung giờ có người bận. Những ô trống màu trắng là thời gian cả nhóm đều rảnh.</p>
              <TimeGrid events={groupSchedule} />
            </div>
          </>
        ) : (
          <div className="card" style={{textAlign:'center', color:'var(--text-muted)'}}>
            <h3>Chọn một nhóm bên trái để xem lịch chung</h3>
          </div>
        )}
      </div>
    </div>
  );
}
