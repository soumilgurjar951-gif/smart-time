import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, Download, Plus, Save, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import timetableService from '../services/timetableService';

const WEEKDAYS = [
  ['MONDAY', 'Monday'],
  ['TUESDAY', 'Tuesday'],
  ['WEDNESDAY', 'Wednesday'],
  ['THURSDAY', 'Thursday'],
  ['FRIDAY', 'Friday'],
];

const LECTURE_TYPES = ['THEORY', 'PRACTICAL', 'LAB', 'PROJECT', 'ACTIVITY'];
const EMPTY_FORM = {
  weekday: 'MONDAY',
  section: '',
  subject: '',
  faculty: '',
  time_slot: '',
  classroom: '',
  lecture_type: 'THEORY',
  topic: '',
  academic_year: '',
};

function formatTime(value) {
  if (!value) return '';
  return value.slice(0, 5);
}

function displayTime(value) {
  if (!value) return '';
  const [hours, minutes] = value.split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  return `${String(hours % 12 || 12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function getErrorMessage(error) {
  const details = error.response?.data?.error?.details || error.response?.data;
  if (!details) return error.message || 'The timetable request failed.';
  if (typeof details === 'string') return details;
  return Object.entries(details)
    .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
    .join(' · ');
}

export default function TimetableManagement() {
  const { isHod, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [data, setData] = useState({
    slots: [],
    sections: [],
    subjects: [],
    faculty: [],
    years: [],
    assignments: [],
    entries: [],
    history: [],
    notifications: [],
  });
  const [sectionCode, setSectionCode] = useState('A');
  const [facultyFilter, setFacultyFilter] = useState('');
  const [viewMode, setViewMode] = useState('weekly');
  const [selectedDay, setSelectedDay] = useState('MONDAY');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [allocation, setAllocation] = useState({ faculty: '', subject: '', section: '', academic_year: '' });
  const [slotEdits, setSlotEdits] = useState({});
  const [attendanceDate, setAttendanceDate] = useState('');
  const [profileEdit, setProfileEdit] = useState(null);
  const [profileForm, setProfileForm] = useState({});
  const [todayDay] = useState(() => new Date().getDay());

  const loadData = useCallback(async () => {
    try {
      const [slots, sections, subjects, faculty, years, assignments, entries, history, notifications] = await Promise.all([
        timetableService.getSlots(),
        timetableService.getSections(),
        timetableService.getSubjects(),
        timetableService.getFaculty(),
        timetableService.getAcademicYears(),
        timetableService.getAssignments(),
        timetableService.getEntries(),
        isHod ? timetableService.getHistory() : Promise.resolve([]),
        timetableService.getNotifications(),
      ]);
      setError('');
      setData({ slots, sections, subjects, faculty, years, assignments, entries, history, notifications });
      setAllocation((current) => ({
        faculty: current.faculty || String(faculty[0]?.id || ''),
        subject: current.subject || String(subjects[0]?.id || ''),
        section: current.section,
        academic_year: current.academic_year || String(years[0]?.id || ''),
      }));
      setForm((current) => ({
        ...current,
        section: current.section || String(sections.find((section) => section.code === 'A')?.id || ''),
        subject: current.subject || String(subjects[0]?.id || ''),
        faculty: current.faculty || String(faculty[0]?.id || ''),
        time_slot: current.time_slot || String(slots.find((slot) => !slot.is_break)?.id || ''),
        academic_year: current.academic_year || String(years[0]?.id || ''),
      }));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [isHod]);

  // The effect starts API synchronization; state updates follow the asynchronous responses.
  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    loadData();
  }, [loadData]);

  const sections = useMemo(() => data.sections.filter((section) => ['A', 'B'].includes(section.code)), [data.sections]);
  const periods = useMemo(() => data.slots.filter((slot) => !slot.is_break), [data.slots]);
  const sectionId = sections.find((section) => section.code === sectionCode)?.id;
  const visibleEntries = useMemo(
    () => data.entries.filter((entry) => (
      entry.section_code === sectionCode && (!facultyFilter || String(entry.faculty) === facultyFilter)
    )),
    [data.entries, sectionCode, facultyFilter],
  );
  const verifiedAssignmentKeys = useMemo(
    () => new Set(data.assignments.filter((item) => item.is_verified).map((item) => `${item.faculty}-${item.subject}`)),
    [data.assignments],
  );
  const workload = useMemo(
    () => data.faculty.map((member) => ({
      ...member,
      weeklyLectures: data.entries.filter((entry) => entry.faculty === member.id).length,
    })),
    [data.entries, data.faculty],
  );
  const myFacultyProfile = useMemo(
    () => data.faculty.find((member) => member.user_id === user?.id),
    [data.faculty, user?.id],
  );
  const upcomingEntries = useMemo(() => {
    const dayIndex = todayDay === 0 || todayDay === 6 ? 0 : todayDay - 1;
    return data.entries
      .filter((entry) => WEEKDAYS.findIndex(([weekday]) => weekday === entry.weekday) >= dayIndex)
      .sort((left, right) => {
        const dayDiff = WEEKDAYS.findIndex(([weekday]) => weekday === left.weekday) - WEEKDAYS.findIndex(([weekday]) => weekday === right.weekday);
        return dayDiff || left.period_number - right.period_number;
      })
      .slice(0, 5);
  }, [data.entries, todayDay]);

  const openNewEntry = (weekday, slot) => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      weekday,
      section: String(sectionId || ''),
      subject: String(data.subjects[0]?.id || ''),
      faculty: String(data.faculty[0]?.id || ''),
      time_slot: String(slot.id),
      academic_year: String(data.years[0]?.id || ''),
    });
    setShowForm(true);
    setNotice('');
  };

  const openEditEntry = (entry) => {
    setEditingId(entry.id);
    setForm({
      weekday: entry.weekday,
      section: String(entry.section),
      subject: String(entry.subject),
      faculty: String(entry.faculty),
      time_slot: String(entry.time_slot),
      classroom: entry.classroom,
      lecture_type: entry.lecture_type,
      topic: entry.topic || '',
      academic_year: entry.academic_year ? String(entry.academic_year) : '',
    });
    setShowForm(true);
    setNotice('');
  };

  const saveEntry = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    const payload = {
      ...form,
      section: Number(form.section),
      subject: Number(form.subject),
      faculty: Number(form.faculty),
      time_slot: Number(form.time_slot),
      academic_year: form.academic_year ? Number(form.academic_year) : null,
    };
    try {
      if (editingId) await timetableService.updateEntry(editingId, payload);
      else await timetableService.createEntry(payload);
      setShowForm(false);
      setNotice(editingId ? 'Timetable entry updated.' : 'Timetable entry added.');
      await loadData();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    }
  };

  const deleteEntry = async (entry) => {
    if (!window.confirm(`Remove ${entry.subject_name} on ${entry.weekday} for Section ${entry.section_code}?`)) return;
    setError('');
    try {
      await timetableService.deleteEntry(entry.id);
      setNotice('Timetable entry removed. The change is recorded in history.');
      await loadData();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    }
  };

  const saveAllocation = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await timetableService.saveAssignment(null, {
        faculty: Number(allocation.faculty),
        subject: Number(allocation.subject),
        section: allocation.section ? Number(allocation.section) : null,
        academic_year: allocation.academic_year ? Number(allocation.academic_year) : null,
        is_verified: false,
      });
      setNotice('Subject allocation created as unverified. Confirm the faculty profile before enabling it.');
      await loadData();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    }
  };

  const toggleVerification = async (assignment) => {
    setError('');
    try {
      await timetableService.saveAssignment(assignment.id, { is_verified: !assignment.is_verified });
      setNotice(`Allocation ${assignment.is_verified ? 'marked unverified' : 'verified'}.`);
      await loadData();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    }
  };

  const deleteAssignment = async (assignment) => {
    if (!window.confirm(`Remove ${assignment.subject_code} allocation for ${assignment.faculty_code || assignment.faculty_name}?`)) return;
    setError('');
    try {
      await timetableService.deleteAssignment(assignment.id);
      setNotice('Subject allocation removed.');
      await loadData();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    }
  };

  const saveSlot = async (slot) => {
    setError('');
    try {
      await timetableService.saveTimeSlot(slot.id, {
        start_time: slotEdits[slot.id]?.start_time || formatTime(slot.start_time),
        end_time: slotEdits[slot.id]?.end_time || formatTime(slot.end_time),
      });
      setNotice(`Period ${slot.period_number} timing saved.`);
      await loadData();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const payload = { ...profileForm };
      if (!payload.password) delete payload.password;
      if (payload.faculty_code === '') payload.faculty_code = null;
      await timetableService.updateFaculty(profileEdit.id, payload);
      setProfileEdit(null);
      setNotice('Faculty profile saved.');
      await loadData();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    }
  };

  const prepareAttendance = async (entry) => {
    setError('');
    setNotice('');
    try {
      const lecture = await timetableService.createOccurrence(entry.id, attendanceDate);
      navigate(`/attendance?lecture=${lecture.id}`);
    } catch (attendanceError) {
      setError(getErrorMessage(attendanceError));
    }
  };

  const downloadReport = () => {
    const rows = [
      ['Day', 'Section', 'Period', 'Start', 'End', 'Subject', 'Faculty', 'Room', 'Type'],
      ...data.entries.map((entry) => [
        entry.weekday,
        entry.section_code,
        entry.period_number,
        entry.start_time,
        entry.end_time,
        entry.subject_name,
        entry.faculty_name,
        entry.classroom,
        entry.lecture_type,
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = 'csit-timetable-report.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (loading) return <p className="p-6 text-sm text-slate-500">Loading timetable data…</p>;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-electric-700">
            <CalendarDays className="h-5 w-5" />
            <h1 className="text-2xl font-bold text-slate-900">CSIT 5th Semester Timetable</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">Sections A and B · Monday to Friday · periods and room allocations from the database</p>
        </div>
        <div className="flex items-center gap-2">
          {isHod && (
            <>
              <button onClick={downloadReport} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-offwhite">
                <Download className="h-4 w-4" /> Export report
              </button>
              <button onClick={() => openNewEntry('MONDAY', periods[0])} disabled={!periods.length} className="inline-flex items-center gap-2 rounded-lg bg-electric-600 px-3 py-2 text-sm font-semibold text-white hover:bg-electric-700 disabled:opacity-50">
                <Plus className="h-4 w-4" /> Add lecture
              </button>
            </>
          )}
        </div>
      </header>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}

      <div className="flex flex-wrap items-center gap-2">
        {sections.map((section) => (
          <button key={section.id} onClick={() => setSectionCode(section.code)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${sectionCode === section.code ? 'bg-electric-600 text-white' : 'border bg-white text-slate-600'}`}>
            Section {section.code}
          </button>
        ))}
        {!isHod && <span className="ml-auto text-sm text-slate-500">Signed in as {user?.name || user?.email}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border bg-white p-1">
          <button onClick={() => setViewMode('weekly')} className={`rounded px-3 py-1.5 text-sm ${viewMode === 'weekly' ? 'bg-electric-600 text-white' : 'text-slate-600'}`}>Weekly</button>
          <button onClick={() => setViewMode('daily')} className={`rounded px-3 py-1.5 text-sm ${viewMode === 'daily' ? 'bg-electric-600 text-white' : 'text-slate-600'}`}>Daily</button>
        </div>
        {viewMode === 'daily' && <select value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm">{WEEKDAYS.map(([day, label]) => <option key={day} value={day}>{label}</option>)}</select>}
        {isHod && <select value={facultyFilter} onChange={(event) => setFacultyFilter(event.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm"><option value="">All faculty · Section {sectionCode}</option>{data.faculty.map((member) => <option key={member.id} value={member.id}>{member.full_name || member.faculty_code || 'Profile incomplete'}</option>)}</select>}
      </div>

      {!visibleEntries.length && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No weekly lecture slots have been assigned to Section {sectionCode} yet. The initial reference did not include a day/period schedule; add verified assignments before scheduling.
        </div>
      )}

      {!isHod && <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <h2 className="mb-2 font-semibold">My assigned subjects and sections</h2>
          <div className="flex flex-wrap gap-2">
            {data.assignments.length ? data.assignments.map((assignment) => (
              <span key={assignment.id} className="rounded-full bg-electric-50 px-3 py-1 text-xs font-medium text-electric-800">
                {assignment.subject_code} {assignment.section_code ? `· Section ${assignment.section_code}` : '· Section to be confirmed'}
              </span>
            )) : <p className="text-sm text-slate-500">No subject allocations are available yet.</p>}
          </div>
          {myFacultyProfile?.assigned_sections?.length > 0 && <p className="mt-3 text-xs text-slate-500">Assigned profile sections: {myFacultyProfile.assigned_sections.join(', ')}</p>}
        </div>
        <div className="rounded-xl border bg-white p-4">
          <h2 className="mb-2 font-semibold">Upcoming lectures</h2>
          {upcomingEntries.length ? <ul className="space-y-2 text-sm">{upcomingEntries.map((entry) => (
            <li key={entry.id} className="flex flex-wrap justify-between gap-2 border-b pb-2 last:border-0">
              <span>{WEEKDAYS.find(([value]) => value === entry.weekday)?.[1]} · {entry.subject_name} · Section {entry.section_code}</span>
              <span className="text-slate-500">{displayTime(entry.start_time)} · {entry.classroom}</span>
            </li>
          ))}</ul> : <p className="text-sm text-slate-500">There are no upcoming lecture assignments.</p>}
        </div>
      </section>}

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
          <thead className="bg-offwhite text-xs uppercase text-slate-500">
            <tr>
              <th className="sticky left-0 z-10 border-b bg-offwhite px-3 py-3">Day</th>
              {data.slots.map((slot) => (
                <th key={slot.id} className="min-w-36 border-b border-l px-3 py-3">
                  <div className="font-bold text-electric-700">{slot.is_break ? 'Lunch' : `Period ${slot.period_number}`}</div>
                  <div className="mt-1 whitespace-nowrap font-normal normal-case text-slate-500">
                    {displayTime(slot.start_time)} – {displayTime(slot.end_time)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKDAYS.filter(([day]) => viewMode === 'weekly' || day === selectedDay).map(([day, label]) => (
              <tr key={day} className="border-b last:border-b-0">
                <th className="sticky left-0 z-10 bg-white px-3 py-3 font-semibold">{label}</th>
                {data.slots.map((slot) => {
                  if (slot.is_break) {
                    return <td key={slot.id} className="border-l bg-offwhite px-2 py-3 text-center text-xs text-slate-400">Lunch</td>;
                  }
                  const entry = visibleEntries.find((item) => item.weekday === day && Number(item.time_slot) === slot.id);
                  return (
                    <td key={slot.id} className="h-32 border-l p-2 align-top">
                      {entry ? (
                        <div className="flex h-full flex-col justify-between rounded-lg border border-electric-100 bg-electric-50/60 p-2">
                          <div>
                            <div className="font-semibold text-slate-900">{entry.subject_code} · {entry.subject_name}</div>
                            <div className="mt-1 text-xs text-slate-600">{entry.faculty_name} {entry.faculty_code ? `(${entry.faculty_code})` : ''}</div>
                            <div className="text-xs text-slate-600">{entry.classroom} · {entry.lecture_type}</div>
                            {entry.topic && <div className="mt-1 truncate text-xs text-slate-500">{entry.topic}</div>}
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <button onClick={() => { setAttendanceDate(''); setForm((current) => ({ ...current, attendance_entry_id: entry.id })); setAttendanceDate(new Date().toISOString().slice(0, 10)); }} className="text-xs font-medium text-electric-700 hover:underline">
                              Attendance
                            </button>
                            {isHod && (
                              <div className="flex gap-1">
                                <button onClick={() => openEditEntry(entry)} title="Edit entry" className="rounded p-1 text-slate-500 hover:bg-white">Edit</button>
                                <button onClick={() => deleteEntry(entry)} title="Remove entry" className="rounded p-1 text-rose-600 hover:bg-white"><Trash2 className="h-3.5 w-3.5" /></button>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : isHod ? (
                        <button onClick={() => openNewEntry(day, slot)} className="flex h-full w-full items-center justify-center rounded-lg border border-dashed text-xs text-slate-400 hover:border-electric-300 hover:bg-electric-50/40 hover:text-electric-600">
                          <Plus className="mr-1 h-3.5 w-3.5" /> Assign
                        </button>
                      ) : <div className="flex h-full items-center justify-center text-slate-300">—</div>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Clock3 className="h-4 w-4 text-electric-600" /> Faculty workload</h2>
          {workload.length ? <div className="space-y-2">{workload.map((member) => (
            <div key={member.id} className="flex flex-wrap justify-between gap-2 border-b pb-2 text-sm last:border-0">
              <span>{member.full_name || member.faculty_code || 'Profile incomplete'} {(!member.full_name || !member.email || !member.employee_id || !member.designation) && <span className="text-amber-700">· incomplete</span>}</span>
              <span className="flex items-center gap-3"><span className="font-semibold">{member.weeklyLectures} lectures/week</span>{isHod && <button onClick={() => { setProfileEdit(member); setProfileForm({ full_name: member.full_name || '', faculty_code: member.faculty_code || '', employee_id: member.employee_id || '', email: member.email || '', designation: member.designation || '', account_status: member.account_status || 'INACTIVE', password: '' }); }} className="text-xs font-semibold text-electric-700 hover:underline">Complete profile</button>}</span>
            </div>
          ))}</div> : <p className="text-sm text-slate-500">No faculty profiles are available.</p>}
        </section>
        {isHod && <section className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 font-semibold">Configure lecture periods</h2>
          <div className="space-y-2">
            {periods.map((slot) => (
              <div key={slot.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-20">Period {slot.period_number}</span>
                <input aria-label={`Period ${slot.period_number} start time`} type="time" value={slotEdits[slot.id]?.start_time ?? formatTime(slot.start_time)} onChange={(event) => setSlotEdits({ ...slotEdits, [slot.id]: { ...slotEdits[slot.id], start_time: event.target.value } })} className="rounded border px-2 py-1" />
                <span>to</span>
                <input aria-label={`Period ${slot.period_number} end time`} type="time" value={slotEdits[slot.id]?.end_time ?? formatTime(slot.end_time)} onChange={(event) => setSlotEdits({ ...slotEdits, [slot.id]: { ...slotEdits[slot.id], end_time: event.target.value } })} className="rounded border px-2 py-1" />
                <button onClick={() => saveSlot(slot)} title={`Save Period ${slot.period_number}`} className="rounded p-2 text-electric-700 hover:bg-electric-50"><Save className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </section>}
      </div>

      {isHod && <>
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">Scheduled weekly lectures</div><div className="mt-1 text-2xl font-bold">{data.entries.length}</div></div>
          <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">Unverified subject allocations</div><div className="mt-1 text-2xl font-bold">{data.assignments.filter((assignment) => !assignment.is_verified).length}</div></div>
          <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">Current scheduling conflicts</div><div className="mt-1 text-2xl font-bold text-emerald-700">0</div><div className="mt-1 text-xs text-slate-500">Conflicting changes are rejected by the API.</div></div>
        </section>
        <section className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 font-semibold">Subject allocation · verify profile data before scheduling</h2>
          <form onSubmit={saveAllocation} className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <select required value={allocation.subject} onChange={(event) => setAllocation({ ...allocation, subject: event.target.value })} className="rounded border px-2 py-2">
              {data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.code} · {subject.name}</option>)}
            </select>
            <select required value={allocation.faculty} onChange={(event) => setAllocation({ ...allocation, faculty: event.target.value })} className="rounded border px-2 py-2">
              {data.faculty.map((member) => <option key={member.id} value={member.id}>{member.faculty_code || member.full_name || `Faculty ${member.id}`}</option>)}
            </select>
            <select value={allocation.section} onChange={(event) => setAllocation({ ...allocation, section: event.target.value })} className="rounded border px-2 py-2">
              <option value="">Section not specified</option>
              {sections.map((section) => <option key={section.id} value={section.id}>Section {section.code}</option>)}
            </select>
            <select value={allocation.academic_year} onChange={(event) => setAllocation({ ...allocation, academic_year: event.target.value })} className="rounded border px-2 py-2">
              <option value="">Academic year not configured</option>
              {data.years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
            </select>
            <button type="submit" className="rounded bg-electric-600 px-3 py-2 text-sm font-semibold text-white">Add allocation</button>
          </form>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b text-xs uppercase text-slate-500"><th className="py-2">Subject</th><th>Faculty</th><th>Section</th><th>Verification</th><th /></tr></thead>
              <tbody>{data.assignments.map((assignment) => (
                <tr key={assignment.id} className="border-b last:border-0">
                  <td className="py-2">{assignment.subject_code} · {assignment.subject_name}</td>
                  <td>{assignment.faculty_name || assignment.faculty_code || 'Profile incomplete'}</td>
                  <td>{assignment.section_code || 'Not specified'}</td>
                  <td>{assignment.is_verified ? 'Verified' : 'Unverified'}</td>
                  <td><div className="flex items-center gap-3"><button onClick={() => toggleVerification(assignment)} className="text-xs font-semibold text-electric-700 hover:underline">{assignment.is_verified ? 'Mark unverified' : 'Verify'}</button><button onClick={() => deleteAssignment(assignment)} className="text-xs font-semibold text-rose-700 hover:underline">Remove</button></div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
        <section className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 font-semibold">Recent timetable changes</h2>
          {data.history.length ? <ul className="space-y-2 text-sm">{data.history.slice(0, 8).map((change) => (
            <li key={change.id} className="flex justify-between gap-3 border-b pb-2 last:border-0">
              <span>{change.action} · {change.snapshot.after?.subject_code || change.snapshot.before?.subject_code || 'Timetable entry'} · Entry {change.entry_id}</span>
              <time className="whitespace-nowrap text-xs text-slate-500">{new Date(change.changed_at).toLocaleString()}</time>
            </li>
          ))}</ul> : <p className="text-sm text-slate-500">No timetable edits have been recorded.</p>}
        </section>
      </>}

      <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-3 font-semibold">{isHod ? 'Recent timetable changes' : 'Timetable notifications'}</h2>
        {isHod ? null : data.notifications.length ? (
          <ul className="space-y-2 text-sm">{data.notifications.filter((notification) => notification.notification_type === 'LECTURE').slice(0, 5).map((notification) => (
            <li key={notification.id} className="border-b pb-2 last:border-0"><span className="font-medium">{notification.title}</span><p className="text-slate-600">{notification.message}</p><time className="text-xs text-slate-400">{new Date(notification.created_at).toLocaleString()}</time></li>
          ))}</ul>
        ) : <p className="text-sm text-slate-500">No timetable notifications.</p>}
      </section>

      {showForm && isHod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight-950/40 p-4">
          <form onSubmit={saveEntry} className="w-full max-w-2xl space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div><h2 className="text-lg font-bold">{editingId ? 'Edit timetable entry' : 'Assign lecture'}</h2><p className="text-sm text-slate-500">Faculty and room conflicts are checked by the API.</p></div>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-500">Close</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">Weekday<select value={form.weekday} onChange={(event) => setForm({ ...form, weekday: event.target.value })} className="mt-1 w-full rounded border px-3 py-2">{WEEKDAYS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="text-sm">Section<select value={form.section} onChange={(event) => setForm({ ...form, section: event.target.value })} required className="mt-1 w-full rounded border px-3 py-2">{sections.map((section) => <option key={section.id} value={section.id}>Section {section.code}</option>)}</select></label>
              <label className="text-sm">Subject<select value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} required className="mt-1 w-full rounded border px-3 py-2">{data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.code} · {subject.name}</option>)}</select></label>
              <label className="text-sm">Faculty<select value={form.faculty} onChange={(event) => setForm({ ...form, faculty: event.target.value })} required className="mt-1 w-full rounded border px-3 py-2">{data.faculty.map((member) => <option key={member.id} value={member.id}>{member.full_name || member.faculty_code || 'Profile incomplete'}{verifiedAssignmentKeys.has(`${member.id}-${form.subject}`) ? '' : ' · unverified subject assignment'}</option>)}</select></label>
              <label className="text-sm">Period<select value={form.time_slot} onChange={(event) => setForm({ ...form, time_slot: event.target.value })} required className="mt-1 w-full rounded border px-3 py-2">{periods.map((slot) => <option key={slot.id} value={slot.id}>Period {slot.period_number} · {displayTime(slot.start_time)}–{displayTime(slot.end_time)}</option>)}</select></label>
              <label className="text-sm">Classroom / lab<input value={form.classroom} onChange={(event) => setForm({ ...form, classroom: event.target.value })} required maxLength={50} className="mt-1 w-full rounded border px-3 py-2" /></label>
              <label className="text-sm">Lecture type<select value={form.lecture_type} onChange={(event) => setForm({ ...form, lecture_type: event.target.value })} className="mt-1 w-full rounded border px-3 py-2">{LECTURE_TYPES.map((type) => <option key={type} value={type}>{type[0] + type.slice(1).toLowerCase()}</option>)}</select></label>
              <label className="text-sm">Academic year<select value={form.academic_year} onChange={(event) => setForm({ ...form, academic_year: event.target.value })} className="mt-1 w-full rounded border px-3 py-2"><option value="">Not configured</option>{data.years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>
              <label className="text-sm sm:col-span-2">Topic (optional)<input value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} maxLength={255} className="mt-1 w-full rounded border px-3 py-2" /></label>
            </div>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button type="submit" className="rounded-lg bg-electric-600 px-4 py-2 text-sm font-semibold text-white">Save timetable</button></div>
          </form>
        </div>
      )}

      {form.attendance_entry_id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight-950/40 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="font-bold">Open lecture attendance</h2>
            <label className="block text-sm">Lecture date<input type="date" value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} className="mt-1 w-full rounded border px-3 py-2" /></label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setForm({ ...form, attendance_entry_id: null })} className="rounded border px-3 py-2 text-sm">Cancel</button>
              <button onClick={() => prepareAttendance(data.entries.find((entry) => entry.id === form.attendance_entry_id))} className="rounded bg-electric-600 px-3 py-2 text-sm font-semibold text-white">Continue</button>
            </div>
          </div>
        </div>
      )}
      {profileEdit && isHod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight-950/40 p-4">
          <form onSubmit={saveProfile} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between"><div><h2 className="text-lg font-bold">Complete faculty profile</h2><p className="text-sm text-slate-500">Only enter details verified by the department.</p></div><button type="button" onClick={() => setProfileEdit(null)} className="text-slate-500">Close</button></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['full_name', 'Full name'],
                ['faculty_code', 'Faculty code / initials'],
                ['employee_id', 'Employee ID'],
                ['email', 'Email'],
                ['designation', 'Designation'],
              ].map(([field, label]) => <label key={field} className="text-sm">{label}<input required={field !== 'faculty_code'} type={field === 'email' ? 'email' : 'text'} value={profileForm[field]} onChange={(event) => setProfileForm({ ...profileForm, [field]: event.target.value })} className="mt-1 w-full rounded border px-3 py-2" /></label>)}
              <label className="text-sm">Access status<select value={profileForm.account_status} onChange={(event) => setProfileForm({ ...profileForm, account_status: event.target.value })} className="mt-1 w-full rounded border px-3 py-2"><option value="INACTIVE">Inactive</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option></select></label>
              {!profileEdit.user_id && <label className="text-sm sm:col-span-2">Set login password to create faculty access<input type="password" autoComplete="new-password" value={profileForm.password} onChange={(event) => setProfileForm({ ...profileForm, password: event.target.value })} className="mt-1 w-full rounded border px-3 py-2" /></label>}
            </div>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setProfileEdit(null)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button type="submit" className="rounded-lg bg-electric-600 px-4 py-2 text-sm font-semibold text-white">Save profile</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
