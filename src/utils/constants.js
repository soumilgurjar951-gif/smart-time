// src/utils/constants.js

export const DEPARTMENT_INFO = {
  department: 'CSIT',
  departmentFullName: 'Computer Science & Information Technology',
  year: '3rd Year',
  semester: '5th Semester',
  sections: ['Section A', 'Section B'],
  college: 'Chameli Devi Group of Institutions',
  session: 'Academic session not configured',
};

export const USER_ROLES = {
  HOD: 'HOD',
  FACULTY: 'Faculty',
};

export const DESIGNATION_OPTIONS = [
  'Professor & HOD',
  'Professor',
  'Associate Professor',
  'Assistant Professor',
  'Lecturer',
];

export const OTHER_DESIGNATION = 'Other';

export const CSIT_5TH_SEM_SUBJECTS = [
  {
    code: 'CSIT501',
    name: 'Computer Networking',
    type: 'Theory',
  },
  {
    code: 'CSIT502',
    name: 'Operating System',
    type: 'Theory',
  },
  {
    code: 'CSIT503',
    name: 'Principles of Programming Language',
    type: 'Theory',
  },
  {
    code: 'CSIT504',
    name: 'Artificial Intelligence',
    type: 'Theory',
  },
  {
    code: 'CSIT505',
    name: 'Linux Lab',
    type: 'Lab',
  },
  {
    code: 'CSIT506',
    name: 'Open Source Software Lab',
    type: 'Lab',
  },
  {
    code: 'CSIT508',
    name: 'Minor Project-I',
    type: 'Project',
  },
  { code: 'CRT', name: 'CRT', type: 'Unspecified' },
  { code: 'Soft Skill', name: 'Soft Skill', type: 'Unspecified' },
  { code: 'Aptitude', name: 'Aptitude', type: 'Unspecified' },
];

export const TIME_SLOTS = [
  { id: 1, label: '08:40 AM - 09:25 AM', period: 1 },
  { id: 2, label: '09:25 AM - 10:10 AM', period: 2 },
  { id: 3, label: '10:10 AM - 10:55 AM', period: 3 },
  { id: 4, label: '10:55 AM - 11:40 AM', period: 4 },
  { id: 5, label: '11:40 AM - 12:20 PM', period: 5 },
  { id: 6, label: '01:00 PM - 01:40 PM', period: 6 },
  { id: 7, label: '01:40 PM - 02:20 PM', period: 7 },
  { id: 8, label: '02:20 PM - 03:00 PM', period: 8 },
];

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
];

export const RESOURCE_TYPES = [
  'Classroom',
  'Laboratory',
  'Projector',
  'Computer',
  'Seminar Hall',
  'Equipment',
];

export const TASK_PRIORITIES = ['High', 'Medium', 'Low'];

export const TASK_STATUSES = ['Pending', 'In Progress', 'Under Review', 'Completed'];

export const ACHIEVEMENT_CATEGORIES = [
  'Awards',
  'Certifications',
  'Publications',
  'Workshops',
  'FDPs',
  'Patents',
];

export const ATTENDANCE_STATUSES = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  ON_LEAVE: 'On Leave',
};

export const SECTIONS = ['Section A', 'Section B'];
