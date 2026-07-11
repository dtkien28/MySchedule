import React, { useState, useEffect } from 'react';
import api from '../api';
import TimeGrid from '../components/TimeGrid';

export default function Dashboard() {
  const ACADEMIC_OFFSET = 20;

  const getWeekNumber = (d) => {
    const date = new Date(d.getTime());
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    const isoWeek = Math.ceil((((date - yearStart) / 86400000) + 1)/7);
    let uniWeek = isoWeek + ACADEMIC_OFFSET;
    if (uniWeek > 52) uniWeek -= 52;
    return uniWeek;
  };

  const getDatesOfWeek = (uniWeek, year = new Date().getFullYear()) => {
    let isoWeek = uniWeek - ACADEMIC_OFFSET;
    let targetYear = year;
    if (isoWeek <= 0) {
      isoWeek += 52;
      targetYear -= 1;
    } else if (isoWeek > 52) {
      isoWeek -= 52;
      targetYear += 1;
    }

    const simple = new Date(Date.UTC(targetYear, 0, 1 + (isoWeek - 1) * 7));
    const dow = simple.getUTCDay() || 7;
    const ISOweekStart = new Date(simple);
    if (dow <= 4) {
      ISOweekStart.setUTCDate(simple.getUTCDate() - dow + 1);
    } else {
      ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - dow);
    }
    const dates = [];
    for(let i=0; i<7; i++) {
       const d = new Date(ISOweekStart);
       d.setUTCDate(d.getUTCDate() + i);
       dates.push(`${d.getUTCDate()}/${d.getUTCMonth()+1}`);
    }
    return dates;
  };

  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [progress, setProgress] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(() => getWeekNumber(new Date()));
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTaskTimeStart, setNewTaskTimeStart] = useState('');
  const [newTaskTimeEnd, setNewTaskTimeEnd] = useState('');
  const username = localStorage.getItem('username');

  useEffect(() => {
    fetchData();
    const handleReload = () => fetchData();
    window.addEventListener('reloadSubjects', handleReload);
    window.addEventListener('reloadTasks', handleReload);
    return () => {
      window.removeEventListener('reloadSubjects', handleReload);
      window.removeEventListener('reloadTasks', handleReload);
    };
  }, [currentWeek]);

  const fetchData = async () => {
    try {
      const [sRes, attRes, wRes, tRes, mRes] = await Promise.all([
        api.get('/subjects'),
        api.get('/attendance'),
        api.get('/works'),
        api.get('/tasks'),
        api.get('/meetings')
      ]);
      
      const attMap = {}; // "subjectId_week_day" -> true/false
      attRes.data.forEach(a => {
        attMap[`${a.subject_id}_${a.week}_${a.day}`] = a.attended;
      });

      const evts = [];
      sRes.data.forEach(s => {
        if (currentWeek >= s.start_week && currentWeek <= s.end_week) {
          s.time.forEach(t => {
            if (!t.cancel_weeks.includes(currentWeek)) {
              evts.push({
                type: 'study',
                subject_id: s.id,
                day: t.day,
                time_start: t.time.split('-')[0],
                time_end: t.time.split('-')[1],
                title: s.subject_name,
                subtitle: t.room,
                attended: attMap[`${s.id}_${currentWeek}_${t.day}`] || false
              });
            }
          });
        }
      });
      
      wRes.data.forEach(w => {
        evts.push({
          type: 'work',
          day: w.day,
          time_start: w.time_start,
          time_end: w.time_end,
          title: w.title
        });
      });
      
      tRes.data.forEach(t => {
        if (t.scheduled_day && t.scheduled_time_start && t.scheduled_time_end) {
          const tDate = new Date(t.scheduled_day);
          if (getWeekNumber(tDate) === currentWeek) {
            const daysMap = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
            evts.push({
              type: t.status === 'done' ? 'task-done' : (t.status === 'doing' ? 'task-doing' : 'task-todo'),
              day: daysMap[tDate.getDay()],
              time_start: t.scheduled_time_start,
              time_end: t.scheduled_time_end,
              title: t.title
            });
          }
        }
      });
      
      mRes.data.forEach(m => {
        if (m.scheduled_day && m.time_start && m.time_end) {
          const mDate = new Date(m.scheduled_day);
          if (getWeekNumber(mDate) === currentWeek) {
            const daysMap = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
            evts.push({
              type: 'group-meeting',
              day: daysMap[mDate.getDay()],
              time_start: m.time_start,
              time_end: m.time_end,
              title: m.title,
              subtitle: m.group_name
            });
          }
        }
      });

      setEvents(evts);
      setTasks(tRes.data);
      
      // Calculate Daily Progress
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
      const daysMap = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
      const todayDow = daysMap[today.getDay()];
      const todayWeek = getWeekNumber(today);
      
      let totalItems = 0;
      let doneItems = 0;
      
      // Check studies today
      sRes.data.forEach(s => {
        if (todayWeek >= s.start_week && todayWeek <= s.end_week) {
          s.time.forEach(t => {
             if (t.day === todayDow && !t.cancel_weeks.includes(todayWeek)) {
                totalItems++;
                if (attMap[`${s.id}_${todayWeek}_${t.day}`]) doneItems++;
             }
          });
        }
      });
      
      // Check tasks today
      tRes.data.forEach(t => {
         if (t.scheduled_day === todayStr) {
             totalItems++;
             if (t.status === 'done') doneItems++;
         }
      });
      
      if (totalItems === 0) {
          setProgress({ percent: -1, text: "Quả là 1 ngày rảnh rỗi, hãy dành thời gian để relax hoặc cải thiện bản thân!" });
      } else {
          setProgress({ percent: Math.round((doneItems / totalItems) * 100), text: `${doneItems}/${totalItems} hoàn thành` });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleAttendance = async (subject_id, day, attended) => {
    // Optimistic update
    setEvents(events.map(e => (e.subject_id === subject_id && e.day === day) ? {...e, attended} : e));
    try {
      await api.post('/attendance', { subject_id, week: currentWeek, day, attended });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;

    if (newTaskDate && newTaskTimeStart && newTaskTimeEnd) {
      const tDate = new Date(newTaskDate);
      const daysMap = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
      const dayStr = daysMap[tDate.getDay()];
      
      const overlap = events.find(e => 
        e.type === 'study' && 
        e.day === dayStr &&
        ((newTaskTimeStart >= e.time_start && newTaskTimeStart < e.time_end) ||
         (newTaskTimeEnd > e.time_start && newTaskTimeEnd <= e.time_end) ||
         (newTaskTimeStart <= e.time_start && newTaskTimeEnd >= e.time_end))
      );

      if (overlap) {
        if (!window.confirm(`⚠️ Cảnh báo: Công việc này bị trùng giờ với môn học [${overlap.title}] từ ${overlap.time_start} - ${overlap.time_end}!\nBạn có chắc chắn muốn thêm không?`)) {
          return;
        }
      }
    }

    try {
      await api.post('/tasks', { 
        title: newTaskTitle, 
        status: 'todo',
        scheduled_day: newTaskDate,
        time_start: newTaskTimeStart,
        time_end: newTaskTimeEnd 
      });
      setNewTaskTitle('');
      setNewTaskTimeStart('');
      setNewTaskTimeEnd('');
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const updateTaskStatus = async (id, status) => {
    // Optimistic
    setTasks(tasks.map(t => t.id === id ? {...t, status} : t));
    try {
      await api.put(`/tasks/${id}`, { status });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteTask = async (id) => {
    setTasks(tasks.filter(t => t.id !== id));
    try {
      await api.delete(`/tasks/${id}`);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const renderKanbanCol = (statusTitle, statusValue) => {
    const cols = tasks.filter(t => t.status === statusValue);
    
    let bgColor = 'var(--bg-color)';
    if (statusValue === 'todo') bgColor = 'var(--todo-bg)';
    if (statusValue === 'doing') bgColor = 'var(--doing-bg)';
    if (statusValue === 'done') bgColor = 'var(--done-bg)';

    return (
      <div style={{flex: 1, background: bgColor, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)'}}>
        <h4 style={{marginTop: 0, textAlign: 'center', color: 'var(--kanban-header)'}}>{statusTitle} ({cols.length})</h4>
        {cols.map(t => (
          <div key={t.id} style={{background: 'var(--surface-bg)', padding: '10px', borderRadius: '6px', marginBottom: '10px', border: '1px solid var(--border-color)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <div>
                <strong style={{textDecoration: statusValue==='done' ? 'line-through' : 'none', display: 'block'}}>{t.title}</strong>
                {(t.scheduled_time_start || t.scheduled_time_end || t.scheduled_day) && (
                  <span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>
                    {t.scheduled_day && `📅 ${t.scheduled_day} `}
                    {(t.scheduled_time_start || t.scheduled_time_end) && `⏰ ${t.scheduled_time_start || '?'} - ${t.scheduled_time_end || '?'}`}
                  </span>
                )}
              </div>
              <input 
                type="checkbox" 
                checked={statusValue === 'done'}
                onChange={() => updateTaskStatus(t.id, statusValue === 'done' ? 'todo' : 'done')}
              />
            </div>
            <div style={{marginTop: '10px', display: 'flex', gap: '5px'}}>
              {statusValue !== 'todo' && <button className="btn" style={{padding:'2px 5px', fontSize:'0.7rem', background:'#e2e8f0'}} onClick={() => updateTaskStatus(t.id, 'todo')}>&lt; Todo</button>}
              {statusValue !== 'doing' && <button className="btn" style={{padding:'2px 5px', fontSize:'0.7rem', background:'#e2e8f0'}} onClick={() => updateTaskStatus(t.id, 'doing')}>Doing</button>}
              {statusValue !== 'done' && <button className="btn" style={{padding:'2px 5px', fontSize:'0.7rem', background:'#e2e8f0'}} onClick={() => updateTaskStatus(t.id, 'done')}>Done &gt;</button>}
              <button className="btn" style={{padding:'2px 5px', fontSize:'0.7rem', background:'red', color:'white', marginLeft:'auto'}} onClick={() => deleteTask(t.id)}>Xóa</button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
            <h1 style={{ marginBottom: '5px' }}>Chào mừng, {localStorage.getItem('displayName') || username}!</h1>
            <p style={{ color: 'var(--primary-color)', fontWeight: 'bold', margin: '0 0 10px 0', fontSize: '1.1rem' }}>
              🔥 Chuỗi Streak: {localStorage.getItem('streak') || 0} ngày
            </p>
            {progress && progress.percent === -1 ? (
                <p style={{ color: 'var(--secondary-color)', fontStyle: 'italic', marginTop: '5px' }}>{progress.text}</p>
            ) : progress ? (
                <div style={{ marginTop: '10px', width: '300px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '5px' }}>
                        <span>Tiến độ hôm nay</span>
                        <strong>{progress.percent}% ({progress.text})</strong>
                    </div>
                    <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'var(--primary-color)', width: `${progress.percent}%`, transition: 'width 0.3s' }}></div>
                    </div>
                </div>
            ) : null}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}></div>
      </div>
      
      <div style={{display: 'flex', gap: '20px', height: 'calc(100vh - 120px)'}}>
        {/* TIMEGRID SECTION (70%) */}
        <div className="card" style={{flex: '0 0 65%', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
            <h3>Lịch tuần {currentWeek}</h3>
            <div>
              <button className="btn btn-outline" style={{border: '1px solid var(--border-color)', marginRight: '10px'}} onClick={() => setCurrentWeek(c => Math.max(1, c - 1))}>&lt; Tuần trước</button>
              <button className="btn btn-outline" style={{border: '1px solid var(--border-color)'}} onClick={() => setCurrentWeek(c => Math.min(52, c + 1))}>Tuần sau &gt;</button>
            </div>
          </div>
          <div style={{flex: 1, overflowY: 'auto'}}>
            <TimeGrid events={events} onToggleAttendance={toggleAttendance} weekDates={getDatesOfWeek(currentWeek)} />
          </div>
        </div>

        {/* KANBAN SECTION (35%) */}
        <div className="card" style={{flex: '1', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', overflowY: 'auto'}}>
          <h3>Kanban Công việc</h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px'}}>
            <input 
              className="input-field" 
              style={{marginBottom: 0}} 
              placeholder="Tên công việc..." 
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
            />
            <div style={{display: 'flex', gap: '10px'}}>
              <input 
                type="date"
                className="input-field" 
                style={{marginBottom: 0, flex: 1}} 
                value={newTaskDate}
                onChange={e => setNewTaskDate(e.target.value)}
              />
            </div>
            <div style={{display: 'flex', gap: '10px'}}>
              <input 
                type="time"
                className="input-field" 
                style={{marginBottom: 0}} 
                value={newTaskTimeStart}
                onChange={e => setNewTaskTimeStart(e.target.value)}
              />
              <span style={{display: 'flex', alignItems: 'center'}}>-</span>
              <input 
                type="time"
                className="input-field" 
                style={{marginBottom: 0}} 
                value={newTaskTimeEnd}
                onChange={e => setNewTaskTimeEnd(e.target.value)}
              />
              <button className="btn btn-primary" onClick={addTask}>Thêm</button>
            </div>
          </div>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '15px', flex: 1}}>
            {renderKanbanCol('Cần làm', 'todo')}
            {renderKanbanCol('Đang làm', 'doing')}
            {renderKanbanCol('Hoàn thành', 'done')}
          </div>
        </div>
      </div>
    </div>
  );
}
