import apiClient from './api';

const listData = (data) => (Array.isArray(data) ? data : data.results || []);
const statusToUi = { PRESENT: 'Present', ABSENT: 'Absent', ON_LEAVE: 'On Leave' };
const statusToApi = { Present: 'PRESENT', Absent: 'ABSENT', 'On Leave': 'ON_LEAVE' };

function mapHistoryRecord(record) {
  return {
    id: record.id,
    lectureId: String(record.lecture),
    rollNo: record.roster_roll_number,
    name: record.roster_name,
    status: statusToUi[record.status] || record.status,
    remarks: record.remarks,
    date: record.lecture_date,
    subjectCode: record.subject_code || '',
    subjectName: record.subject_name || '',
    section: `Section ${record.section}`,
    facultyName: record.faculty_name || '',
  };
}

export const attendanceService = {
  async getAttendanceForLecture(lecture) {
    const sectionCode = lecture.sectionCode || lecture.section.slice(-1);
    const [attendanceResponse, rosterResponse] = await Promise.all([
      apiClient.get('/attendance/', { params: { lecture: lecture.id } }),
      apiClient.get('/attendance/roster/', { params: { section: sectionCode, is_active: true } }),
    ]);
    const marked = listData(attendanceResponse.data);
    const roster = listData(rosterResponse.data);
    const byRosterId = new Map(marked.map((record) => [record.roster, record]));
    const records = roster.map((student) => {
      const attendance = byRosterId.get(student.id);
      return {
        id: student.id,
        roster: student.id,
        rollNo: student.roll_number,
        name: student.full_name,
        section: lecture.section,
        status: attendance ? statusToUi[attendance.status] : '',
        remarks: attendance?.remarks || '',
      };
    });
    const presentCount = records.filter((record) => record.status === 'Present').length;
    const absentCount = records.filter((record) => record.status === 'Absent').length;
    const onLeaveCount = records.filter((record) => record.status === 'On Leave').length;
    return {
      lectureId: String(lecture.id),
      subjectCode: lecture.subjectCode,
      subjectName: lecture.subjectName,
      facultyName: lecture.facultyName,
      section: lecture.section,
      date: lecture.date,
      timeSlot: lecture.timeSlot,
      totalStudents: records.length,
      presentCount,
      absentCount,
      onLeaveCount,
      attendanceRate: records.length ? Number(((presentCount / records.length) * 100).toFixed(1)) : 0,
      records,
    };
  },

  async saveLectureAttendance(attendanceData) {
    const entries = attendanceData.records.map((record) => {
      const status = statusToApi[record.status];
      if (!status) throw new Error(`Select an attendance status for ${record.rollNo}.`);
      return {
        roster: Number(record.roster ?? record.id),
        status,
        remarks: record.remarks || '',
      };
    });
    const { data } = await apiClient.post('/attendance/bulk/', {
      lecture: Number(attendanceData.lectureId),
      entries,
    });
    return data;
  },

  async getAttendanceHistory(filters = {}) {
    const params = { ...filters };
    if (params.section?.startsWith('Section ')) params.section = params.section.slice(-1);
    const { data } = await apiClient.get('/attendance/', { params });
    return listData(data).map(mapHistoryRecord);
  },

  async getSectionSummary() {
    const { data } = await apiClient.get('/attendance/reports/');
    const rows = data.by_lecture || [];
    const summaryFor = (section) => {
      const lectures = rows.filter((row) => row['lecture__section'] === section);
      const present = lectures.reduce((sum, row) => sum + row.present, 0);
      const total = lectures.reduce((sum, row) => sum + row.total, 0);
      return {
        totalSessions: lectures.length,
        averageRate: total ? Number(((present / total) * 100).toFixed(1)) : 0,
      };
    };
    return {
      sectionA: summaryFor('A'),
      sectionB: summaryFor('B'),
      overallRate: data.summary?.present_percentage || 0,
    };
  },
};

export default attendanceService;
