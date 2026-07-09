const API_URL = window.location.origin + "/api";

const table_schedule = document.getElementById("table-schedule").getElementsByTagName('tbody')[0]

const btn_parse_data = document.getElementById('btn_parse_data')
const smart_paste_box = document.getElementById('smart_paste_box')

const add_btn = document.getElementById('add_subject_btn')
const delete_btn = document.getElementById('delete_subject_btn')
const edit_btn = document.getElementById('edit_subject_btn')

const class_code_input = document.getElementById('class_code')
const subject_name_input = document.getElementById('subject_name')
const type_input = document.getElementById('type')
const start_week_input = document.getElementById('start_week')
const end_week_input = document.getElementById('end_week')

const btn_add_schedule_row = document.getElementById('btn_add_schedule_row')
const schedule_inputs_container = document.getElementById('schedule_inputs_container')

const btn_prev_week = document.getElementById('btn_prev_week')
const btn_next_week = document.getElementById('btn_next_week')
const current_week_label = document.getElementById('current_week_label')

let currentScheduleData = [];
let currentWeek = 43; // Default week, can be dynamic based on current date

// Init
btn_parse_data.addEventListener('click', parseData)
add_btn.addEventListener('click', add_subject)
delete_btn.addEventListener('click', delete_subject)
edit_btn.addEventListener('click', edit_subject)

btn_prev_week.addEventListener('click', () => { currentWeek--; updateWeekView(); })
btn_next_week.addEventListener('click', () => { currentWeek++; updateWeekView(); })

function updateWeekView() {
    current_week_label.textContent = `Tuần ${currentWeek}`;
    renderSchedule();
}

async function parseData() {
    const raw_text = smart_paste_box.value.trim();
    if (!raw_text) {
        alert("Vui lòng dán dữ liệu vào ô trống!");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/subjects/parse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ raw_text: raw_text })
        });
        const result = await response.json();
        
        if (result.status === "success") {
            preFillForm(result.data);
            alert("Đã phân tích thành công! Vui lòng kiểm tra lại thông tin bên dưới và bấm Lưu vào DB.");
        } else {
            alert(result.message || "Lỗi khi phân tích dữ liệu");
        }
    } catch(error) {
        alert("Không thể kết nối tới Server!");
    }
}

btn_add_schedule_row.addEventListener('click', () => {
    addScheduleRow();
    updateRemoveButtons();
});

function addScheduleRow(t = null) {
    const row = document.createElement('div');
    row.className = 'schedule-row';
    
    // Default values if not provided
    const day = t ? t.day : "T2";
    const timeStr = t ? t.time : "07:00 - 09:00";
    const room = t ? (t.room || "") : "";
    const cancelWeeksStr = t && t.cancel_weeks && t.cancel_weeks.length > 0 ? t.cancel_weeks.join(", ") : "";

    row.innerHTML = `
        <select class="day-select form-select">
            <option value="T2" ${day === 'T2' ? 'selected' : ''}>Thứ 2</option>
            <option value="T3" ${day === 'T3' ? 'selected' : ''}>Thứ 3</option>
            <option value="T4" ${day === 'T4' ? 'selected' : ''}>Thứ 4</option>
            <option value="T5" ${day === 'T5' ? 'selected' : ''}>Thứ 5</option>
            <option value="T6" ${day === 'T6' ? 'selected' : ''}>Thứ 6</option>
            <option value="T7" ${day === 'T7' ? 'selected' : ''}>Thứ 7</option>
            <option value="CN" ${day === 'CN' ? 'selected' : ''}>Chủ nhật</option>
        </select>
        <input type="text" class="time-select form-select" value="${timeStr}" placeholder="VD: 13:00 -16:15" style="flex:1;">
        <input type="text" class="room-input form-select" value="${room}" placeholder="Phòng học (VD: 201 Quang Trung)" style="flex:1;">
        <input type="text" class="cancel-weeks-input form-select" value="${cancelWeeksStr}" placeholder="Tuần hủy (VD: 43, 44)" style="flex:1;">
        <button type="button" class="btn-icon btn-remove-row" onclick="removeScheduleRow(this)" title="Xóa buổi học">✕</button>
    `;
    schedule_inputs_container.appendChild(row);
}

function removeScheduleRow(btn) {
    btn.parentElement.remove();
    updateRemoveButtons();
}

function updateRemoveButtons() {
    const rows = schedule_inputs_container.querySelectorAll('.schedule-row');
    rows.forEach((row) => {
        const btn = row.querySelector('.btn-remove-row');
        btn.style.display = rows.length === 1 ? 'none' : 'block';
    });
}

function getColumnIndex(dayText) {
    const days = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    return days.findIndex(day => dayText.includes(day)) + 1; 
}

function getRowIndex(timeText) {
    if (timeText.includes("07:00") || timeText.includes("07:30")) return 0;
    if (timeText.includes("09:15") || timeText.includes("09:30")) return 1;
    if (timeText.includes("13:00") || timeText.includes("13:30")) return 2;
    if (timeText.includes("15:15") || timeText.includes("15:30") || timeText.includes("15:00")) return 3;
    if (timeText.includes("17:45") || timeText.includes("18:00")) return 4;
    return 0; // default fallback
}

function getScheduleInputs() {
    const rows = schedule_inputs_container.querySelectorAll('.schedule-row');
    const studies = [];
    rows.forEach(row => {
        const day = row.querySelector('.day-select').value;
        const time = row.querySelector('.time-select').value;
        const room = row.querySelector('.room-input').value;
        
        const cancelWeeksStr = row.querySelector('.cancel-weeks-input').value;
        const cancel_weeks = cancelWeeksStr.split(',')
                                           .map(s => parseInt(s.trim()))
                                           .filter(n => !isNaN(n));

        studies.push({ day, time, room, cancel_weeks });
    });
    return studies;
}

async function loadData() {
    try {
        const response = await fetch(`${API_URL}/subjects`);
        currentScheduleData = await response.json();
        
        if (currentScheduleData.length > 0) {
            // Find minimum start week among all subjects to display first
            let minWeek = 52;
            for(let s of currentScheduleData) {
                if (s.start_week < minWeek) minWeek = s.start_week;
            }
            currentWeek = minWeek;
        }
        updateWeekView();
    } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
    }
}

function renderSchedule() {
    // Clear table
    for (let r = 0; r < table_schedule.rows.length; r++) {
        for (let c = 1; c < table_schedule.rows[r].cells.length; c++) {
            table_schedule.rows[r].cells[c].innerHTML = "";
        }
    }

    const subject_list = currentScheduleData;

    for (let i = 0; i < subject_list.length; i++) {
        const subject = subject_list[i];
        
        // Check if subject is active in current week
        if (currentWeek < subject.start_week || currentWeek > subject.end_week) {
            continue; 
        }

        for (let j = 0; j < subject.time.length; j++) {
            const timeSlot = subject.time[j];
            
            // Check if this specific session is cancelled this week
            if (timeSlot.cancel_weeks && timeSlot.cancel_weeks.includes(currentWeek)) {
                continue; // Do not render if cancelled
            }

            const col = getColumnIndex(timeSlot.day);
            const row = getRowIndex(timeSlot.time);

            if (col > 0) {
                const cell = table_schedule.rows[row].cells[col];
                
                const div = document.createElement('div');
                div.className = 'subject-item';
                div.innerHTML = `
                    <strong>${subject.subject_name}</strong>
                    <small>${subject.class_code}</small>
                    <small style="color:var(--primary-color); font-weight:600;">${timeSlot.time}</small>
                    ${timeSlot.room ? `<small class="place-text">${timeSlot.room}</small>` : ''}
                `;
                div.onclick = () => preFillForm(subject);
                cell.appendChild(div);
            }
        }
    }
}

function preFillForm(subject) {
    class_code_input.value = subject.class_code;
    subject_name_input.value = subject.subject_name;
    type_input.value = subject.type || '';
    start_week_input.value = subject.start_week || 1;
    end_week_input.value = subject.end_week || 52;

    // Clear current rows
    schedule_inputs_container.innerHTML = '';
    
    // Add rows from subject data
    if (subject.time && subject.time.length > 0) {
        subject.time.forEach(t => {
            addScheduleRow(t);
        });
    } else {
        addScheduleRow();
    }
    
    updateRemoveButtons();
    
    // Smooth scroll to form
    document.querySelector('.form-container:nth-of-type(2)').scrollIntoView({ behavior: 'smooth' });
}

function validateInput() {
    if (!class_code_input.value.trim()) {
        alert("Vui lòng nhập Mã lớp!");
        return false;
    }
    if (!subject_name_input.value.trim()) {
        alert("Vui lòng nhập Tên môn!");
        return false;
    }
    const studies = getScheduleInputs();
    if (studies.length === 0) {
        alert("Vui lòng thêm ít nhất một buổi học!");
        return false;
    }
    return true;
}

async function add_subject() {
    if (!validateInput()) return;

    const studies = getScheduleInputs();

    const new_subject_data = {
        class_code: class_code_input.value.trim(),
        subject_name: subject_name_input.value.trim(),
        type: type_input.value.trim(),
        start_week: parseInt(start_week_input.value) || 1,
        end_week: parseInt(end_week_input.value) || 52,
        time: studies
    };

    try {
        const response = await fetch(`${API_URL}/subjects/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(new_subject_data)
        });
        const result = await response.json();
        
        alert(result.message);
        if (result.status === "Thành công") {
            loadData(); // reload data and re-render
        }
    } catch(error) {
        alert("Không thể kết nối tới Server!");
    }
}

async function delete_subject() {
    const class_code = class_code_input.value.trim();
    if (!class_code) {
        alert("Vui lòng nhập mã lớp để xóa"); return;
    }

    if (!confirm(`Bạn có chắc muốn xóa môn có mã ${class_code}?`)) return;

    try {
        const response = await fetch(`${API_URL}/subjects/delete/${class_code}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        
        alert(result.message);
        if (result.status === "Thành công") {
            loadData();
            // Optional clear form
            class_code_input.value = '';
            subject_name_input.value = '';
            schedule_inputs_container.innerHTML = '';
            addScheduleRow();
            updateRemoveButtons();
        }
    } catch(error) {
        alert("Không thể kết nối tới Server!");
    }
}

async function edit_subject() {
    if (!validateInput()) return;
    
    const studies = getScheduleInputs();

    const edited_data = {
        class_code: class_code_input.value.trim(),
        subject_name: subject_name_input.value.trim(),
        type: type_input.value.trim(),
        start_week: parseInt(start_week_input.value) || 1,
        end_week: parseInt(end_week_input.value) || 52,
        time: studies
    };

    try {
        const response = await fetch(`${API_URL}/subjects/edit`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(edited_data)
        });
        const result = await response.json();
        
        alert(result.message);
        if (result.status === "Thành công") {
            loadData();
        }
    } catch (error) {
        alert("Không thể kết nối tới Server!");
    }
}

// Initial setup
addScheduleRow(); // add at least one empty row on load
updateRemoveButtons();
loadData();