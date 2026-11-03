import apiClient from './api';

const listData = (data) => (Array.isArray(data) ? data : data.results || []);
const statusToUi = { ACTIVE: 'Active', INACTIVE: 'Inactive', SUSPENDED: 'Suspended' };
const statusToApi = { Active: 'ACTIVE', Inactive: 'INACTIVE', Suspended: 'SUSPENDED' };
const profileStatusToUi = {
  INCOMPLETE: 'Incomplete',
  SUBMITTED: 'Submitted',
  VERIFIED: 'Verified',
  CHANGES_REQUESTED: 'Changes Requested',
};

function mapFaculty(profile) {
  return {
    id: String(profile.id),
    userId: profile.user_id,
    role: profile.role,
    name: profile.full_name || profile.faculty_code || 'Profile incomplete',
    fullName: profile.full_name || '',
    facultyCode: profile.faculty_code || '',
    employeeId: profile.employee_id || '',
    email: profile.email || '',
    designation: profile.designation || '',
    department: profile.department,
    contact: profile.contact_number || '',
    assignedSubjects: profile.assigned_subject_names || [],
    assignedSubjectIds: profile.assigned_subject_ids || [],
    assignedSections: (profile.assigned_sections || []).map((section) => `Section ${section}`),
    status: statusToUi[profile.account_status] || profile.account_status,
    accountStatus: profile.account_status,
    profileStatus: profileStatusToUi[profile.profile_status] || profile.profile_status || 'INCOMPLETE',
  };
}

async function toApiPayload(formData) {
  const payload = {};
  const fields = {
    full_name: 'name',
    faculty_code: 'facultyCode',
    employee_id: 'employeeId',
    email: 'email',
    designation: 'designation',
    contact_number: 'contact',
  };
  for (const [apiField, formField] of Object.entries(fields)) {
    if (formData[formField] !== undefined) payload[apiField] = formData[formField];
  }
  if (payload.faculty_code === '') payload.faculty_code = null;
  if (formData.status) payload.account_status = statusToApi[formData.status] || formData.status;
  if (formData.password) payload.password = formData.password;
  if (formData.assignedSections) {
    payload.assigned_sections = formData.assignedSections.map((section) => section.replace('Section ', ''));
  }
  if (formData.qualifications) payload.qualifications = formData.qualifications;
  if (formData.specialization) payload.specialization = formData.specialization;
  if (formData.dateOfJoining) payload.date_of_joining = formData.dateOfJoining;
  if (formData.assignedSubjects) {
    const { data } = await apiClient.get('/lectures/subjects/');
    const subjects = listData(data);
    const names = new Set(formData.assignedSubjects);
    payload.assigned_subject_ids = subjects
      .filter((subject) => names.has(subject.name) || names.has(subject.code))
      .map((subject) => subject.id);
  }
  return payload;
}

export const facultyService = {
  async getAllFaculty(filters = {}) {
    const params = { ...filters };
    if (params.status && params.status !== 'All') {
      params.account_status = statusToApi[params.status] || params.status;
      delete params.status;
    }
    if (params.section === 'All') delete params.section;
    const { data } = await apiClient.get('/faculty/', { params });
    const profiles = listData(data).map(mapFaculty);
    if (filters.section && filters.section !== 'All') {
      return profiles.filter((profile) => profile.assignedSections.includes(filters.section));
    }
    return profiles;
  },

  async getFacultyById(id) {
    const { data } = await apiClient.get(`/faculty/${id}/`);
    return mapFaculty(data);
  },

  async createFaculty(facultyData) {
    const payload = await toApiPayload(facultyData);
    const { data } = await apiClient.post('/faculty/', payload);
    return mapFaculty(data);
  },

  async updateFaculty(id, updateData) {
    const payload = await toApiPayload(updateData);
    if (!payload.password) delete payload.password;
    const { data } = await apiClient.patch(`/faculty/${id}/`, payload);
    return mapFaculty(data);
  },

  async deleteFaculty(id) {
    await apiClient.delete(`/faculty/${id}/`);
    return { success: true };
  },

  async reviewFaculty(id, action) {
    const { data } = await apiClient.post(`/faculty/${id}/review/`, { action });
    return mapFaculty(data);
  },
};

export default facultyService;
