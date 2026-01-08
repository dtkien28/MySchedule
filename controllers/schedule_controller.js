import { Subject, subject_list, addSubject, deleteSubject, editSubject } from "../models/subject.js"
import { TimeAndNote } from "../models/time_and_cancel.js"

const table_1 = document.getElementById("table-gd1").getElementsByTagName('tbody')[0]
const table_2 = document.getElementById("table-gd2").getElementsByTagName('tbody')[0]

const gd1_ca79 = table_1.rows[0]
const gd1_ca911 = table_1.rows[1]
const gd1_ca1315 = table_1.rows[2]
const gd1_ca1517 = table_1.rows[3]
const gd1_ca1721 = table_1.rows[4]

const gd2_ca79 = table_2.rows[0]
const gd2_ca911 = table_2.rows[1]
const gd2_ca1315 = table_2.rows[2]
const gd2_ca1517 = table_2.rows[3]
const gd2_ca1721 = table_2.rows[4]

const add_btn = document.getElementById('add_subject_btn')
const delete_btn = document.getElementById('delete_subject_btn')
const edit_btn = document.getElementById('edit_subject_btn')
const reload_btn = document.getElementById('reload_schedule_btn')

/** @type {HTMLInputElement} */
const class_code_input = document.getElementById('class_code')
/** @type {HTMLInputElement} */
const subject_name_input = document.getElementById('subject_name')
/** @type {HTMLInputElement} */
const stage_input = document.getElementById('stage')
/** @type {HTMLInputElement} */
const time_input = document.getElementById('time')
/** @type {HTMLInputElement} */
const place_input = document.getElementById('place')

add_btn.addEventListener('click', add_subject)
// delete_btn.addEventListener('click', )
// edit_btn.addEventListener('click', )
// reload_btn.addEventListener('click', )


function getColumnIndex(dayText) {
    const days = ["T2", "T3", "T4", "T5", "T6", "T7", "Chủ nhật"];
    return days.findIndex(day => dayText.includes(day)) + 1; 
}

function getRowIndex(timeText) {
    const times = ["7:00 -9:00", "9:15 -11:15", "13:00 -15:00", "15:15 -17:15", "17:45 -20:45"];
    return times.findIndex(time => timeText.includes(time));
}

function renderSchedule() {
    const clearTable = (tbody) => {
        for (let r = 0; r < tbody.rows.length; r++) {
            for (let c = 1; c < tbody.rows[r].cells.length; c++) {
                tbody.rows[r].cells[c].innerHTML = "";
            }
        }
    }

    clearTable(table_1);
    clearTable(table_2);

    subject_list.forEach(s => {
        const target_table = (s.stage === "1") ? table_1 : table_2;
        const schedules = s.time.split(";");

        schedules.forEach(scheduleStr => {
            const col = getColumnIndex(scheduleStr);
            const row = getRowIndex(scheduleStr);

            if (col !== -1 && row !== -1) {
                const cell = target_table.rows[row].cells[col];
                cell.innerHTML = `
                <div style="background-color: #7ea8f7ff; padding: 5px; border-radius: 4px; font-size: 11px;">
                    <strong>${s.subject_name}</strong><br>
                    ${s.class_code}<br>
                    ${s.place}
                </div>`;
            }
        });
    });
}

function preprocess_time(str)
{
    const parts = str.split("Tuần hủy: ")

    const time = parts[0].replace(/\s-/g, "-")
    const note = parts[1] ? parts[1]:""
    const time_note = new TimeAndNote(time, note)
    return time_note
}

function add_subject() {
    let new_subject = new Subject(
        class_code_input.value,
        subject_name_input.value,
        stage_input.value,
        time_input.value,
        place_input.value
    );

    

    const result = JSON.parse(addSubject(new_subject));
    alert(result["message"]);

    if (result["status"] === "Thành công") { // Sửa từ result["message"] thành result["status"]
        renderSchedule();
    }
}