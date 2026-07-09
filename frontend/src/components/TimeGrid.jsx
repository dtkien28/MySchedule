import React from 'react';

const timeToHours = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h + (m / 60);
};

export default function TimeGrid({ events, onToggleAttendance, weekDates = [] }) {
  const days = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const startHour = 6;
  const endHour = 21;
  const hours = Array.from({length: endHour - startHour + 1}, (_, i) => startHour + i);
  const hourHeight = 60;

  const renderBlocks = (day) => {
    return events.filter(e => e.day === day).map((e, idx) => {
      const top = (timeToHours(e.time_start) - startHour) * hourHeight;
      const height = (timeToHours(e.time_end) - timeToHours(e.time_start)) * hourHeight;
      
      let className = "block-item ";
      if (e.type === 'study') className += 'block-study';
      else if (e.type === 'work') className += 'block-work';
      else if (e.type === 'task-todo') className += 'block-task-todo';
      else if (e.type === 'task-doing') className += 'block-task-doing';
      else if (e.type === 'task-done') className += 'block-task-done';
      else className += 'block-busy';

      return (
        <div 
          key={idx} 
          className={className} 
          style={{ top: `${top}px`, height: `${height}px`, display: 'flex', flexDirection: 'column' }}
          title={`${e.title} (${e.time_start} - ${e.time_end})`}
        >
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
            <strong>{e.title}</strong>
            {e.type === 'study' && (
              <input 
                type="checkbox" 
                checked={e.attended || false}
                onChange={(ev) => {
                  ev.stopPropagation();
                  onToggleAttendance(e.subject_id, day, !e.attended);
                }}
                style={{cursor: 'pointer', transform: 'scale(1.2)'}}
                title="Đánh dấu đã đi học"
              />
            )}
          </div>
          <div>{e.time_start} - {e.time_end}</div>
          {e.subtitle && <div style={{marginTop: '4px', fontSize: '0.7rem', opacity: 0.9}}>{e.subtitle}</div>}
        </div>
      );
    });
  };

  return (
    <div className="time-grid-container">
      <div className="time-grid-hours">
        <div className="day-header" style={{borderRight: '1px solid var(--border-color)'}}></div>
        {hours.map(h => (
          <div key={h} className="hour-label">
            <span>{h}:00</span>
          </div>
        ))}
      </div>
      <div className="time-grid-days">
        {days.map((day, idx) => (
          <div key={day} className="day-col">
            <div className="day-header">
              {day} {weekDates[idx] ? `(${weekDates[idx]})` : ''}
            </div>
            <div className="day-body">
              {renderBlocks(day)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
