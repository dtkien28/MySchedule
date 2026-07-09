class StudySchedule:
    def __init__(self, day: str, time: str, room: str = "", cancel_weeks: list = None):
        self.day = day
        self.time = time
        self.room = room
        self.cancel_weeks = cancel_weeks if cancel_weeks is not None else []