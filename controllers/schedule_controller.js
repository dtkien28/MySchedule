import { Subject, subject_list, addSubject, deleteSubject, editSubject } from "../models/subject.js"
import { TimeAndNote } from "../models/time_and_cancel.js"
import { StudySchedule } from "../models/study_schedule.js"

const table_1 = document.getElementById("table-gd1").getElementsByTagName('tbody')[0]
const table_2 = document.getElementById("table-gd2").getElementsByTagName('tbody')[0]

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
    const times = ["07:00 -09:00", "09:15 -11:15", "13:00 -15:00", "15:15 -17:15", "17:45 -20:45"];
    if (timeText=="07:00 -11:15" || timeText=="07:00 -10:30")
    {
        return [0, 1]
    }
    const index = times.findIndex(time => timeText.includes(time));
    return index !== -1 ? [index] : []
}



function preprocess_time(str)
{
    let count = 0
    let have_cancel = false
    let study_time = ""
    let cancel = ""
    for (let i =0; i<str.length; i++)
    {
        count++
        if (str[i]=="u")
        {
            have_cancel=true
            break
        }
    }

    for (let i=0; i<count-2; i++)
    {
        study_time+=str[i]
    }

    if (have_cancel==true)
    {
        for (let i=count+8; i<str.length; i++)
        {
            cancel+=str[i]
        }
    }
    console.log(study_time)
    console.log(cancel)

    const time_and_note = new TimeAndNote(study_time.trim(), cancel)
    return time_and_note
}

function times(str)
{
    let study_list = []
    
    for (let i=0; i<str.length; i++)
    {
        if (str[i]=="T" || str[i]=="C")
        {
            let temp_day = str[i]+str[i+1]
            let temp_time = ""
            for (let j = i+4; j<i+16; j++)
            {
                temp_time+=str[j]
            }
            let temp_schedule = new StudySchedule(temp_day, temp_time)

            study_list.push(temp_schedule)
        }
    }
    return study_list
}


function renderSchedule()
{
    for (let i=0; i<subject_list.length; i++)
    {
        for (let j=0; j<subject_list[i].time.length; j++)
        {
            const col = getColumnIndex(subject_list[i].time[j].day)
            const row = getRowIndex(subject_list[i].time[j].time)

            for (let k=0; k<row.length; k++)
            {
                let target_table = []

                if (subject_list[i].stage==="1")
                {
                    target_table.push(table_1)
                }
                else if (subject_list[i].stage==="2")
                {
                    target_table.push(table_2)
                }
                else
                {
                    target_table.push(table_1, table_2)
                }

                for (let h =0; h<target_table.length; h++)
                {
                    const cell = target_table[h].rows[row[k]].cells[col]
                    cell.innerHTML = `
                    <div class="subject-item">
                        <strong>${subject_list[i].subject_name}</strong><br>
                        <small>${subject_list[i].class_code}</small><br>
                    </div>
                    `
                }
            
                
            }

            console.log("Row:", row, "Col:", col, "Time: ", subject_list[i].time[j].time, "Day: ", subject_list[i].time[j].day);

            
            
        }
    }
}

function add_subject() {
    const preprocessed = preprocess_time(time_input.value);
    const studies = times(preprocessed.time)

    let new_subject = new Subject(
        class_code_input.value.trim(),
        subject_name_input.value.trim(),
        stage_input.value,
        studies,
        preprocessed.note,
        place_input.value.trim()
    );

    const response = addSubject(new_subject);
    const result = (typeof response === 'string') ? JSON.parse(response) : response;

    alert(result.message);

    if (result.status === "Thành công") {
        renderSchedule();
    }

    console.log(subject_list)
    console.log(preprocessed)
    console.log(studies)
}
