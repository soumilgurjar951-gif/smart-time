// src/utils/constants.js

export const DEPARTMENT_INFO = {
  department: 'CSIT',
  departmentFullName: 'Computer Science & Information Technology',
  year: '3rd Year',
  semester: '5th Semester',
  sections: ['Section A', 'Section B'],
  college: 'Chameli Devi Group of Institutions',
  session: 'Academic Session 2026-27',
};

export const USER_ROLES = {
  HOD: 'HOD',
  FACULTY: 'Faculty',
};

export const CSIT_5TH_SEM_SUBJECTS = [
  {
    code: 'CSIT-501',
    name: 'Theory of Computation',
    shortName: 'TOC',
    credits: 4,
    type: 'Theory',
    defaultFacultyId: 'fac-1',
  },
  {
    code: 'CSIT-502',
    name: 'Database Management Systems',
    shortName: 'DBMS',
    credits: 4,
    type: 'Theory',
    defaultFacultyId: 'fac-2',
  },
  {
    code: 'CSIT-503',
    name: 'Design & Analysis of Algorithms',
    shortName: 'DAA',
    credits: 4,
    type: 'Theory',
    defaultFacultyId: 'fac-3',
  },
  {
    code: 'CSIT-504',
    name: 'Software Engineering & Agile',
    shortName: 'SE',
    credits: 3,
    type: 'Theory',
    defaultFacultyId: 'fac-4',
  },
  {
    code: 'CSIT-505',
    name: 'Web Technologies & Cloud Computing',
    shortName: 'WTC',
    credits: 3,
    type: 'Theory',
    defaultFacultyId: 'fac-5',
  },
  {
    code: 'CSIT-506',
    name: 'DBMS & SQL Laboratory',
    shortName: 'DBMS Lab',
    credits: 2,
    type: 'Lab',
    defaultFacultyId: 'fac-2',
  },
  {
    code: 'CSIT-507',
    name: 'Algorithms & Python Laboratory',
    shortName: 'DAA Lab',
    credits: 2,
    type: 'Lab',
    defaultFacultyId: 'fac-3',
  },
  {
    code: 'CSIT-508',
    name: 'Minor Project & Seminar Stage-I',
    shortName: 'Minor Project',
    credits: 2,
    type: 'Practical',
    defaultFacultyId: 'fac-6',
  },
];

export const TIME_SLOTS = [
  { id: 1, label: '09:00 AM - 10:00 AM', period: 1 },
  { id: 2, label: '10:00 AM - 11:00 AM', period: 2 },
  { id: 3, label: '11:15 AM - 12:15 PM', period: 3 },
  { id: 4, label: '12:15 PM - 01:15 PM', period: 4 },
  { id: 5, label: '02:00 PM - 03:00 PM', period: 5 },
  { id: 6, label: '03:00 PM - 04:00 PM', period: 6 },
];

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
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

