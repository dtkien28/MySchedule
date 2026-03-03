const API_URL = window.location.origin + "/api";

const table_1 = document.getElementById("table-gd1").getElementsByTagName('tbody')[0]
const table_2 = document.getElementById("table-gd2").getElementsByTagName('tbody')[0]

const add_btn = document.getElementById('add_subject_btn')
const delete_btn = document.getElementById('delete_subject_btn')
const edit_btn = document.getElementById('edit_subject_btn')
const reload_btn = document.getElementById('reload_schedule_btn')

const class_code_input = document.getElementById('class_code')
const subject_name_input = document.getElementById('subject_name')
const stage_input = document.getElementById('stage')
const time_input = document.getElementById('time')
const place_input = document.getElementById('place')

add_btn.addEventListener('click', add_subject)
delete_btn.addEventListener('click', delete_subject)
edit_btn.addEventListener('click', edit_subject)
reload_btn.addEventListener('click', renderSchedule)

function getColumnIndex(dayText) {
    const days = ["T2", "T3", "T4", "T5", "T6", "T7", "Chủ nhật"];
    return days.findIndex(day => dayText.includes(day)) + 1; 
}

function getRowIndex(timeText) {
    const times = ["07:00 -09:00", "09:15 -11:15", "13:00 -15:00", "15:15 -17:15", "17:45 -20:45"];
    if (timeText=="07:00 -11:15" || timeText=="07:00 -10:30") {
        return [0, 1]
    }
    const index = times.findIndex(time => timeText.includes(time));
    return index !== -1 ? [index] : []
}

function preprocess_time(str) {
    let count = 0
    let have_cancel = false
    let study_time = ""
    let cancel = ""
    for (let i =0; i<str.length; i++) {
        count++
        if (str[i]=="u") {
            have_cancel=true
            break
        }
    }
    for (let i=0; i<count-2; i++) {
        study_time+=str[i]
    }
    if (have_cancel==true) {
        for (let i=count+8; i<str.length; i++) {
            cancel+=str[i]
        }
    }
    return { time: study_time.trim(), note: cancel }
}

function times(str) {
    let study_list = []
    for (let i=0; i<str.length; i++) {
        if (str[i]=="T" || str[i]=="C") {
            let temp_day = str[i]+str[i+1]
            let temp_time = ""
            for (let j = i+4; j<i+16; j++) {
                temp_time+=str[j]
            }
            study_list.push({ day: temp_day, time: temp_time })
        }
    }
    return study_list
}

async function renderSchedule() {
    const allTables = [table_1, table_2];
    allTables.forEach(table => {
        for (let r = 0; r < table.rows.length; r++) {
            for (let c = 1; c < table.rows[r].cells.length; c++) {
                table.rows[r].cells[c].innerHTML = "";
            }
        }
    });

    try {
        const response = await fetch(`${API_URL}/subjects`);
        const subject_list = await response.json();

        for (let i=0; i<subject_list.length; i++) {
            for (let j=0; j<subject_list[i].time.length; j++) {
                const col = getColumnIndex(subject_list[i].time[j].day)
                const row = getRowIndex(subject_list[i].time[j].time)

                for (let k=0; k<row.length; k++) {
                    let target_table = []
                    if (subject_list[i].stage==="1") target_table.push(table_1)
                    else if (subject_list[i].stage==="2") target_table.push(table_2)
                    else target_table.push(table_1, table_2)

                    for (let h =0; h<target_table.length; h++) {
                        const cell = target_table[h].rows[row[k]].cells[col]
                        cell.innerHTML = `
                        <div class="subject-item">
                            <strong>${subject_list[i].subject_name}</strong><br>
                            <small>${subject_list[i].class_code}</small><br>
                        </div>
                        `
                    }
                }            
            }
        }
    } catch (error) {
        console.error("Lỗi khi tải lịch:", error);
    }
}

async function add_subject() {
    const preprocessed = preprocess_time(time_input.value);
    const studies = times(preprocessed.time)

    const new_subject_data = {
        class_code: class_code_input.value.trim(),
        subject_name: subject_name_input.value.trim(),
        stage: stage_input.value,
        time: studies,
        cancel_week: preprocessed.note,
        place: place_input.value.trim()
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
            renderSchedule();
        }
    } catch(error) {
        alert("Không thể kết nối tới Server Python!");
    }
}

async function delete_subject() {
    const class_code = class_code_input.value.trim();
    if (!class_code) {
        alert("Vui lòng nhập mã lớp để xóa"); return;
    }

    try {
        const response = await fetch(`${API_URL}/subjects/delete/${class_code}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        
        alert(result.message);
        if (result.status === "Thành công") {
            renderSchedule();
        }
    } catch(error) {
        alert("Không thể kết nối tới Server Python!");
    }
}

async function edit_subject() {
    const preprocessed = preprocess_time(time_input.value);
    const studies = times(preprocessed.time)

    const edited_data = {
        class_code: class_code_input.value.trim(),
        subject_name: subject_name_input.value.trim(),
        stage: stage_input.value,
        time: studies,
        cancel_week: preprocessed.note,
        place: place_input.value.trim()
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
            renderSchedule();
        }
    } catch (error) {
        alert("Không thể kết nối tới Server Python!");
    }
}

renderSchedule();