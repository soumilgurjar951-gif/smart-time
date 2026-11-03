import apiClient from './api';

const listData = (data) => (Array.isArray(data) ? data : data.results || []);

function mapLecture(lecture) {
  const sectionName = `Section ${lecture.section}`;
  const typeNames = {
    THEORY: 'Theory',
    PRACTICAL: 'Practical',
    LAB: 'Lab',
    PROJECT: 'Project',
    ACTIVITY: 'Activity',
    TUTORIAL: 'Tutorial',
  };
  const statusNames = {
    SCHEDULED: 'Scheduled',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };
  return {
    id: String(lecture.id),
    subjectCode: lecture.subject_code,
    subjectName: lecture.subject_name,
    facultyId: String(lecture.assigned_faculty),
    facultyName: lecture.faculty_name,
    section: sectionName,
    sectionCode: lecture.section,
    date: lecture.date,
    day: new Date(`${lecture.date}T00:00:00`).toLocaleDateString('en', { weekday: 'long' }),
    startTime: lecture.start_time,
    endTime: lecture.end_time,
    timeSlot: `${lecture.start_time} - ${lecture.end_time}`,
    classroom: lecture.classroom,
    lectureType: typeNames[lecture.lecture_type] || lecture.lecture_type,
    topic: lecture.topic,
    status: statusNames[lecture.status] || lecture.status,
    timetableEntryId: lecture.timetable_entry,
  };
}

export const lectureService = {
  async getAllLectures(filters = {}) {
    const params = { ...filters };
    if (params.section?.startsWith('Section ')) params.section = params.section.slice(-1);
    if (params.facultyId) {
      params.assigned_faculty = params.facultyId;
      delete params.facultyId;
    }
    const { data } = await apiClient.get('/lectures/', { params });
    return listData(data).map(mapLecture);
  },

  async getLectureById(id) {
    const { data } = await apiClient.get(`/lectures/${id}/`);
    return mapLecture(data);
  },

  async createLecture(lectureData) {
    const { data } = await apiClient.post('/lectures/', lectureData);
    return mapLecture(data);
  },

  async updateLecture(id, updateData) {
    const { data } = await apiClient.patch(`/lectures/${id}/`, updateData);
    return mapLecture(data);
  },

  async deleteLecture(id) {
    await apiClient.delete(`/lectures/${id}/`);
    return { success: true };
  },
};

export default lectureService;
