export class Subject
{
    constructor(class_code, subject_name, stage, time, cancel_week, place)
    {
        this.class_code = class_code
        this.subject_name = subject_name
        this.stage = stage
        this.time = time
        this.cancel_week = cancel_week
        this.place = place
    }
}

export const subject_list = []


export function addSubject(s)
{
    let result = {
        "status": "",
        "message": ""
    }

    //Lỗi trùng môn
    for (let i=0; i<subject_list.length; i++)
    {
        if (s.class_code==subject_list[i].class_code)
        {
            result["status"] = "Lỗi"
            result["message"] = "Môn học đã có trong lịch, không thể thêm"
            return JSON.stringify(result)
        }
    }
    //Lỗi trùng thời gian
    for (let i=0; i<subject_list.length; i++)
    {
        for (let j=0; j<subject_list[i].time.length; j++)
        {
            if (s.time[j].day==subject_list[i].time[j].day && s.time[j].time==subject_list[i].time[j].time)
            {
                result["status"] = "Lỗi"
                result["message"] = "Môn học đã bị trùng"
                return JSON.stringify(result)
            }
        }
    }

    subject_list.push(s)

    result["status"] = "Thành công"
    result["message"] = "Đã thêm môn học thành công"
    return JSON.stringify(result)
}

export function deleteSubject(class_code_text)
{
    let result = {
        "status": "",
        "message": ""
    }

    for (let i = 0; i<subject_list.length; i++)
    {
        if (class_code_text==subject_list[i].class_code)
        {
            subject_list.splice(i, 1)
            result["status"] = "Thành công"
            result["message"] = `Đã xóa môn ${class_code_text} khỏi lịch`
            return JSON.stringify(result)
        }
    }

    result["status"] = "Lỗi"
    result["message"] = `Không có mã môn ${class_code_text} trong lịch`
    return JSON.stringify(result)
}

export function editSubject(s)
{
    let result = {
        "status": "",
        "message": ""
    }

    for (let i = 0; i<subject_list.length; i++)
    {
        if (s.class_code==subject_list[i].class_code)
        {
            console.log("có môn")
            subject_list[i].subject_name = s.subject_name
            subject_list[i].stage = s.stage
            subject_list[i].time = s.time
            subject_list[i].place = s.place

            result["status"] = "Thành công"
            result["message"]= `Sửa thành công. Thông tin sau khi sửa\nMã môn: ${subject_list[i].class_code}\nTên môn: ${subject_list[i].subject_name}`
            return JSON.stringify(result)
        }
    }

    result["status"] = "Lỗi"
    result["message"] = `Không có mã môn ${s.class_code} trong lịch`
    return JSON.stringify(result)
}

