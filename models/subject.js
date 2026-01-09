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

    // for (let i=0; i<subject_list.length; i++)
    // {
    //     if (s.time===subject_list[i].time)
    //     {
    //         result["status"] = "Bị trùng"
    //         result["message"] = `Môn ${s.subject_name} bị trùng thời gian với môn ${subject_list[i].subject_name} \n Thời gian trùng ${s.time}`
    //         return JSON.stringify(result)
    //     }
    //     else if (s.class_code==subject_list[i].class_code)
    //     {
    //         result["status"] = "Bị trùng"
    //         result["message"] = `Môn ${s.subject_name} đã có trong lịch`
    //         return JSON.stringify(result)
    //     }
    // }
    subject_list.push(s)

    result["status"] = "Thành công"
    result["message"] = "Đã thêm môn học thành công"
    return JSON.stringify(result)
}

export function deleteSubject(s)
{
    let result = {
        "status": "",
        "message": ""
    }

    for (let i = 0; i<subject_list.length; i++)
    {
        if (s.class_code==subject_list[i].class_code)
        {
            subject_list.splice(i, 1)
            result["status"] = "Thành công"
            result["message"] = `Đã xóa môn ${s.class_code} khỏi lịch`
            return JSON.stringify(result)
        }
    }

    result["status"] = "Lỗi"
    result["message"] = `Không có mã môn ${s.class_code} trong lịch`
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
            subject_list[i].subject_name = s.subject_name
            subject_list[i].stage = s.stage
            subject_list[i].time = s.time
            subject_list[i].place = s.place

            result["status"] = "Thành công"
            result["message"]= `Sửa thành công. Thông tin sau khi sửa\nMã môn: ${subject_list[i].class_code}\nTên môn: ${subject_list[i].subject_name}\nGiai đoạn: ${subject_list[i].stage}\nThời gian: ${subject_list[i].time}\nĐịa điểm: ${subject_list[i].place}`
        }
    }

    result["status"] = "Lỗi"
    result["message"] = `Không có mã môn ${s.class_code} trong lịch`
    return JSON.stringify(result)
}

