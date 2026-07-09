import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api';

const getCaIndex = (timeStart) => {
  if (!timeStart) return 0;
  if (timeStart.includes("07:")) return 0;
  if (timeStart.includes("09:")) return 1;
  if (timeStart.includes("13:")) return 2;
  if (timeStart.includes("15:")) return 3;
  if (timeStart.includes("17:") || timeStart.includes("18:")) return 4;
  return 0;
};

const getDayIndex = (day) => {
  const map = { "T2": 0, "T3": 1, "T4": 2, "T5": 3, "T6": 4, "T7": 5, "CN": 6 };
  return map[day] !== undefined ? map[day] : 0;
};

export default function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [rawText, setRawText] = useState('');
  const [formData, setFormData] = useState({ class_code: '', subject_name: '', type: '', start_week: '', end_week: '', time: [] });
  const [editId, setEditId] = useState(null);
  
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

  const [currentView, setCurrentView] = useState('week'); // week, month, stage
  const [currentWeek, setCurrentWeek] = useState(() => getWeekNumber(new Date()));
  const [currentMonth, setCurrentMonth] = useState(11);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await api.get('/subjects');
      setSubjects(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const parseData = async () => {
    try {
      const res = await api.post('/subjects/parse', { raw_text: rawText });
      if (res.data.status === 'success') {
        setFormData(res.data.data);
        toast.success('Phân tích tự động thành công!');
      } else {
        toast.error(res.data.message);
      }
    } catch (e) {
      toast.error('Lỗi khi phân tích dữ liệu!');
      console.error(e);
    }
  };

  const addTimeRow = () => {
    setFormData({ ...formData, time: [...formData.time, { day: 'T2', time: '07:00 - 09:00', room: '', cancel_weeks: [] }] });
  };

  const handleTimeChange = (idx, field, val) => {
    const newTime = [...formData.time];
    if (field === 'cancel_weeks') {
      newTime[idx][field] = val.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    } else {
      newTime[idx][field] = val;
    }
    setFormData({ ...formData, time: newTime });
  };

  const removeTimeRow = (idx) => {
    const newTime = [...formData.time];
    newTime.splice(idx, 1);
    setFormData({ ...formData, time: newTime });
  };

  const saveSubject = async () => {
    try {
      if (editId) {
        await api.put('/subjects', { ...formData, id: editId });
        toast.success('Đã cập nhật!');
        setEditId(null);
      } else {
        await api.post('/subjects', formData);
        toast.success('Đã lưu thành công!');
      }
      setFormData({ class_code: '', subject_name: '', type: '', start_week: '', end_week: '', time: [] });
      loadData();
    } catch (e) {
      toast.error('Lỗi khi lưu!');
      console.error(e);
    }
  };

  const handleEdit = (subject) => {
    setEditId(subject.id);
    setFormData({
      class_code: subject.class_code,
      subject_name: subject.subject_name,
      type: subject.type || '',
      start_week: subject.start_week,
      end_week: subject.end_week,
      time: subject.time.map(t => ({ ...t, cancel_weeks: [...t.cancel_weeks] }))
    });
  };

  const deleteSubject = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa?')) return;
    try {
      await api.delete(`/subjects/${id}`);
      toast.success('Đã xóa thành công!');
      loadData();
    } catch (e) {
      toast.error('Lỗi khi xóa!');
      console.error(e);
    }
  };

  // --- Rendering Helpers ---
  const caLabels = [
    "Ca 1 (07:00 - 09:00)",
    "Ca 2 (09:15 - 11:15)",
    "Ca 3 (13:00 - 15:00)",
    "Ca 4 (15:15 - 17:15)",
    "Ca 5 (17:45 - 20:45)"
  ];
  
  const getSubjectBlocks = (filterFn) => {
    const grid = Array(5).fill(null).map(() => Array(7).fill(null));
    subjects.forEach(s => {
      s.time.forEach(t => {
        if (filterFn(s, t)) {
          const r = getCaIndex(t.time.split('-')[0]);
          const c = getDayIndex(t.day);
          if (!grid[r][c]) grid[r][c] = [];
          grid[r][c].push({ ...s, room: t.room, timeStr: t.time });
        }
      });
    });
    return grid;
  };

  const renderCaTable = (grid) => (
    <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '10px'}} border="1">
      <thead>
        <tr style={{background: 'var(--bg-color)'}}>
          <th style={{padding: '10px'}}>Ca học</th>
          <th>Thứ 2</th><th>Thứ 3</th><th>Thứ 4</th><th>Thứ 5</th><th>Thứ 6</th><th>Thứ 7</th><th>CN</th>
        </tr>
      </thead>
      <tbody>
        {caLabels.map((label, r) => (
          <tr key={r}>
            <td style={{padding: '10px', fontWeight: 'bold'}}>{label}</td>
            {Array(7).fill(null).map((_, c) => (
              <td key={c} style={{padding: '5px', verticalAlign: 'top', width: '12%'}}>
                {grid[r][c]?.map((item, idx) => (
                  <div key={idx} style={{background: 'var(--primary-color)', color: 'white', padding: '5px', borderRadius: '4px', marginBottom: '5px', fontSize: '0.8rem'}}>
                    <strong>{item.subject_name}</strong><br/>
                    {item.class_code}<br/>
                    {item.room}
                  </div>
                ))}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderMonthTable = () => {
    const startW = (currentMonth - 1) * 4 + 1;
    const grid = Array(4).fill(null).map(() => Array(7).fill(null));
    
    for (let r = 0; r < 4; r++) {
      const w = startW + r;
      subjects.forEach(s => {
        if (w >= s.start_week && w <= s.end_week) {
          s.time.forEach(t => {
            if (!t.cancel_weeks.includes(w)) {
              const c = getDayIndex(t.day);
              if (!grid[r][c]) grid[r][c] = [];
              grid[r][c].push({ ...s, timeStr: t.time });
            }
          });
        }
      });
    }

    return (
      <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '10px'}} border="1">
        <thead>
          <tr style={{background: 'var(--bg-color)'}}>
            <th style={{padding: '10px'}}>Tuần</th>
            <th>Thứ 2</th><th>Thứ 3</th><th>Thứ 4</th><th>Thứ 5</th><th>Thứ 6</th><th>Thứ 7</th><th>CN</th>
          </tr>
        </thead>
        <tbody>
          {Array(4).fill(null).map((_, r) => (
            <tr key={r}>
              <td style={{padding: '10px', fontWeight: 'bold'}}>Tuần {startW + r}</td>
              {Array(7).fill(null).map((_, c) => (
                <td key={c} style={{padding: '5px', verticalAlign: 'top', width: '12%'}}>
                  {grid[r][c]?.map((item, idx) => (
                    <div key={idx} style={{background: 'var(--primary-color)', color: 'white', padding: '5px', borderRadius: '4px', marginBottom: '5px', fontSize: '0.8rem'}}>
                      <strong>{item.subject_name}</strong><br/>
                      {item.timeStr}
                    </div>
                  ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div>
      <h2>Quản lý Lịch Học</h2>
      
      <div style={{display: 'flex', gap: '20px'}}>
        {/* Form bên trái */}
        <div style={{flex: 1}}>
          <div className="card">
            <h3>Smart Paste (Dán dữ liệu từ DTU)</h3>
            <textarea 
              className="input-field" 
              rows="4" 
              placeholder="Dán dữ liệu môn học vào đây..."
              value={rawText}
              onChange={e => setRawText(e.target.value)}
            />
            <button className="btn btn-secondary" onClick={parseData}>Phân tích tự động</button>
          </div>

          <div className="card">
            <h3>Form Thông tin Môn học</h3>
            <div style={{display:'flex', gap:'10px', marginBottom: '10px'}}>
              <div style={{flex: 1}}>
                <input className="input-field" style={{marginBottom: 0}} placeholder="Mã lớp" value={formData.class_code} onChange={e => setFormData({...formData, class_code: e.target.value})} />
              </div>
              <div style={{flex: 2}}>
                <input className="input-field" style={{marginBottom: 0}} placeholder="Tên môn" value={formData.subject_name} onChange={e => setFormData({...formData, subject_name: e.target.value})} />
              </div>
              <div style={{flex: 1}}>
                <input className="input-field" style={{marginBottom: 0}} placeholder="Loại (VD: LEC)" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} />
              </div>
            </div>
            <div style={{display:'flex', gap:'10px'}}>
              <input className="input-field" type="number" placeholder="Bắt đầu từ tuần (1-52)" value={formData.start_week} onChange={e => setFormData({...formData, start_week: e.target.value})} title="Tuần học đầu tiên của môn học trong năm" />
              <input className="input-field" type="number" placeholder="Kết thúc ở tuần (1-52)" value={formData.end_week} onChange={e => setFormData({...formData, end_week: e.target.value})} title="Tuần học cuối cùng của môn học trong năm" />
            </div>
            
            <h4>Các buổi học trong tuần</h4>
            <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px'}}>
              * Chú thích: Bạn có thể nhập chi tiết phòng học và địa điểm (VD: "201 Hòa Khánh Nam") hoặc copy từ chuỗi gốc để hệ thống tự điền. Những phòng bị trùng sẽ được nhân bản.
            </p>
            {formData.time.map((t, idx) => (
              <div key={idx} style={{display:'flex', gap:'10px', alignItems:'center', background:'var(--bg-color)', padding:'10px', borderRadius:'8px', marginBottom:'10px'}}>
                <select className="form-select" style={{width:'80px', marginBottom:0}} value={t.day} onChange={e => handleTimeChange(idx, 'day', e.target.value)}>
                  <option value="T2">T2</option><option value="T3">T3</option><option value="T4">T4</option>
                  <option value="T5">T5</option><option value="T6">T6</option><option value="T7">T7</option><option value="CN">CN</option>
                </select>
                <input className="input-field" style={{marginBottom:0}} placeholder="Ca" value={t.time} onChange={e => handleTimeChange(idx, 'time', e.target.value)} />
                <input className="input-field" style={{marginBottom:0, flex:1}} placeholder="Phòng/Địa điểm" value={t.room} onChange={e => handleTimeChange(idx, 'room', e.target.value)} />
                <input className="input-field" style={{marginBottom:0, width:'80px'}} placeholder="Tuần Hủy" value={t.cancel_weeks.join(', ')} onChange={e => handleTimeChange(idx, 'cancel_weeks', e.target.value)} />
                <button className="btn" style={{background:'red', color:'white', padding:'8px'}} onClick={() => removeTimeRow(idx)}>✕</button>
              </div>
            ))}
            <button className="btn btn-secondary" onClick={addTimeRow}>+ Thêm buổi</button>
            <button className={editId ? "btn btn-primary" : "btn btn-primary"} style={{marginLeft:'10px', background: editId ? 'var(--secondary-color)' : 'var(--primary-color)'}} onClick={saveSubject}>
              {editId ? "Cập nhật DB" : "Lưu vào DB"}
            </button>
            {editId && <button className="btn btn-outline" style={{marginLeft:'10px'}} onClick={() => {setEditId(null); setFormData({ class_code: '', subject_name: '', type: '', start_week: '', end_week: '', time: [] });}}>Hủy sửa</button>}
          </div>
          
          <div className="card">
            <h3>Danh sách đã lưu</h3>
            <ul style={{paddingLeft: '20px'}}>
              {subjects.map(s => (
                <li key={s.id} style={{marginBottom:'10px'}}>
                  <strong>{s.subject_name}</strong> ({s.class_code}) 
                  <button className="btn" style={{background:'#f59e0b', color:'white', padding:'2px 8px', marginLeft:'10px', fontSize:'0.8rem'}} onClick={() => handleEdit(s)}>Sửa</button>
                  <button className="btn" style={{background:'red', color:'white', padding:'2px 8px', marginLeft:'5px', fontSize:'0.8rem'}} onClick={() => deleteSubject(s.id)}>Xóa</button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Lịch bên phải */}
        <div style={{flex: 1.5}}>
          <div className="card">
            <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
              <button className={`btn ${currentView === 'week' ? 'btn-primary' : 'btn-outline'}`} style={{border: '1px solid var(--primary-color)'}} onClick={() => setCurrentView('week')}>Lịch Tuần</button>
              <button className={`btn ${currentView === 'month' ? 'btn-primary' : 'btn-outline'}`} style={{border: '1px solid var(--primary-color)'}} onClick={() => setCurrentView('month')}>Lịch Tháng</button>
              <button className={`btn ${currentView === 'stage' ? 'btn-primary' : 'btn-outline'}`} style={{border: '1px solid var(--primary-color)'}} onClick={() => setCurrentView('stage')}>Lịch Giai đoạn</button>
            </div>

            {currentView === 'week' && (
              <div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                  <button className="btn btn-outline" style={{border: '1px solid var(--border-color)'}} onClick={() => setCurrentWeek(c => Math.max(1, c - 1))}>&lt; Tuần trước</button>
                  <h3 style={{margin: 0}}>Tuần {currentWeek}</h3>
                  <button className="btn btn-outline" style={{border: '1px solid var(--border-color)'}} onClick={() => setCurrentWeek(c => Math.min(52, c + 1))}>Tuần sau &gt;</button>
                </div>
                {renderCaTable(getSubjectBlocks((s, t) => currentWeek >= s.start_week && currentWeek <= s.end_week && !t.cancel_weeks.includes(currentWeek)))}
              </div>
            )}

            {currentView === 'month' && (
              <div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                  <button className="btn btn-outline" style={{border: '1px solid var(--border-color)'}} onClick={() => setCurrentMonth(c => Math.max(1, c - 1))}>&lt; Tháng trước</button>
                  <h3 style={{margin: 0}}>Tháng {currentMonth} (Tuần {(currentMonth-1)*4+1} - {currentMonth*4})</h3>
                  <button className="btn btn-outline" style={{border: '1px solid var(--border-color)'}} onClick={() => setCurrentMonth(c => Math.min(13, c + 1))}>Tháng sau &gt;</button>
                </div>
                {renderMonthTable()}
              </div>
            )}

            {currentView === 'stage' && (
              <div style={{maxHeight: '800px', overflowY: 'auto'}}>
                <h3 style={{color: 'var(--secondary-color)', marginTop: '0'}}>Học kỳ 1</h3>
                <h4 style={{marginBottom: '5px'}}>Giai đoạn 1 (Tuần 1 - 8)</h4>
                {renderCaTable(getSubjectBlocks((s, t) => s.start_week <= 8))}
                
                <h4 style={{marginBottom: '5px', marginTop: '20px'}}>Giai đoạn 2 (Tuần 11 - 18)</h4>
                {renderCaTable(getSubjectBlocks((s, t) => s.start_week <= 18 && s.end_week >= 11))}

                <h3 style={{color: 'var(--secondary-color)', marginTop: '30px'}}>Học kỳ 2</h3>
                <h4 style={{marginBottom: '5px'}}>Giai đoạn 1 (Tuần 21 - 30)</h4>
                {renderCaTable(getSubjectBlocks((s, t) => s.start_week <= 30 && s.end_week >= 21))}

                <h4 style={{marginBottom: '5px', marginTop: '20px'}}>Giai đoạn 2 (Tuần 33 - 40)</h4>
                {renderCaTable(getSubjectBlocks((s, t) => s.start_week <= 40 && s.end_week >= 33))}

                <h3 style={{color: 'var(--secondary-color)', marginTop: '30px'}}>Học kỳ Hè</h3>
                <h4 style={{marginBottom: '5px'}}>Duy nhất (Tuần 41 - 49)</h4>
                {renderCaTable(getSubjectBlocks((s, t) => s.start_week <= 49 && s.end_week >= 41))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
