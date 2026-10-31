// src/pages/lectures/LectureManagement.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  Plus,
  Filter,
  Edit2,
  Trash2,
  ListFilter,
  Grid,
} from 'lucide-react';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import SearchInput from '../../components/common/SearchInput';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import LectureForm from '../../components/forms/LectureForm';
import { lectureService } from '../../services/lectureService';
import { facultyService } from '../../services/facultyService';
import { useOdrms } from '../../context/OdrmsContext';
import { useAuth } from '../../context/AuthContext';
import {
  DAYS_OF_WEEK,
  TIME_SLOTS,
  SECTIONS,
  CSIT_5TH_SEM_SUBJECTS,
} from '../../utils/constants';

export default function LectureManagement() {
  const { isHod } = useAuth();
  const { showToast, refreshCounts } = useOdrms();
  const [lectures, setLectures] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'weekly'
  const [sectionFilter, setSectionFilter] = useState('All');
  const [dayFilter, setDayFilter] = useState('All');
  const [search, setSearch] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLecture, setEditingLecture] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLecturesAndFaculty = async () => {
    setLoading(true);
    try {
      const [lecs, facs] = await Promise.all([
        lectureService.getAllLectures(),
        facultyService.getAllFaculty(),
      ]);
      setLectures(lecs);
      setFacultyList(facs);
    } catch {
      showToast('Failed to load timetable.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLecturesAndFaculty();
  }, []);

  const filteredLectures = useMemo(() => {
    return lectures.filter((l) => {
      const matchSection = sectionFilter === 'All' || l.section === sectionFilter;
      const matchDay = dayFilter === 'All' || l.day === dayFilter;
      const matchSearch =
        search === '' ||
        l.subjectName.toLowerCase().includes(search.toLowerCase()) ||
        l.subjectCode.toLowerCase().includes(search.toLowerCase()) ||
        l.facultyName.toLowerCase().includes(search.toLowerCase()) ||
        l.classroom.toLowerCase().includes(search.toLowerCase()) ||
        (l.topic && l.topic.toLowerCase().includes(search.toLowerCase()));

      return matchSection && matchDay && matchSearch;
    });
  }, [lectures, sectionFilter, dayFilter, search]);

  const handleCreateLecture = async (formData) => {
    setIsSubmitting(true);
    try {
      const created = await lectureService.createLecture(formData);
      setLectures((prev) => [created, ...prev]);
      showToast(`Lecture for ${created.subjectName} (${created.section}) scheduled!`);
      setIsCreateModalOpen(false);
      refreshCounts();
    } catch (err) {
      showToast(err.message || 'Error scheduling lecture.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateLecture = async (formData) => {
    if (!editingLecture) return;
    setIsSubmitting(true);
    try {
      const updated = await lectureService.updateLecture(editingLecture.id, formData);
      setLectures((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      showToast(`Lecture updated!`);
      setEditingLecture(null);
      refreshCounts();
    } catch (err) {
      showToast(err.message || 'Error updating lecture.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLecture = async (id, subject, section) => {
    if (!window.confirm(`Delete ${subject} lecture for ${section}?`)) return;
    try {
      await lectureService.deleteLecture(id);
      setLectures((prev) => prev.filter((l) => l.id !== id));
      showToast('Lecture deleted from timetable.');
      refreshCounts();
    } catch {
      showToast('Error deleting lecture.', 'error');
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 text-xs font-bold border border-indigo-200 dark:border-indigo-900 mb-2">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>CSIT 5th Semester • Timetable Hub</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
            Lecture Management & Timetable
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Theory, Lab, and Project slots for Section A (Room 301) and Section B (Room 302).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'weekly'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Weekly Grid</span>
            </button>
          </div>

          {isHod && (
            <Button onClick={() => setIsCreateModalOpen(true)} icon={Plus}>
              Schedule Lecture
            </Button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by subject, faculty, or topic..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="All">All Sections (A & B)</option>
            <option value="Section A">Section A Only</option>
            <option value="Section B">Section B Only</option>
          </select>

          <select
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="All">All Days</option>
            {DAYS_OF_WEEK.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading departmental lectures..." />
      ) : filteredLectures.length === 0 ? (
        <EmptyState
          title="No lectures found"
          description="Try selecting a different section or day filter, or schedule a new lecture."
          actionLabel={isHod ? 'Schedule Lecture' : undefined}
          onAction={isHod ? () => setIsCreateModalOpen(true) : undefined}
        />
      ) : viewMode === 'list' ? (
        /* List View */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-5">Subject</th>
                  <th className="py-3.5 px-4">Section</th>
                  <th className="py-3.5 px-4">Day & Time</th>
                  <th className="py-3.5 px-4">Classroom / Lab</th>
                  <th className="py-3.5 px-4">Faculty Member</th>
                  <th className="py-3.5 px-4">Topic Covered</th>
                  <th className="py-3.5 px-4">Status</th>
                  {isHod && <th className="py-3.5 px-5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLectures.map((lec) => (
                  <tr key={lec.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {lec.subjectName}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {lec.subjectCode} • {lec.lectureType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/70 px-2 py-0.5 rounded-md">
                        {lec.section}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{lec.day}</div>
                      <span className="text-[11px] text-slate-500">{lec.timeSlot}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                      {lec.classroom}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                      {lec.facultyName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {lec.topic || 'Curriculum unit'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={lec.status}>{lec.status}</Badge>
                    </td>
                    {isHod && (
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingLecture(lec)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit Lecture"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteLecture(lec.id, lec.subjectName, lec.section)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Delete Lecture"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Weekly Timetable Grid */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs overflow-x-auto">
          <div className="min-w-[760px] space-y-4">
            <div className="grid grid-cols-6 gap-3 text-center text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="text-left pl-2">Time Slot</div>
              <div>Monday</div>
              <div>Tuesday</div>
              <div>Wednesday</div>
              <div>Thursday</div>
              <div>Friday</div>
            </div>

            {TIME_SLOTS.map((slot) => (
              <div key={slot.id} className="grid grid-cols-6 gap-3 items-stretch">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex flex-col justify-center text-left">
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    Period {slot.period}
                  </span>
                  <span className="text-[10px] text-slate-500">{slot.label}</span>
                </div>

                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => {
                  const matchingLectures = filteredLectures.filter(
                    (l) => l.day === day && l.period === slot.period
                  );

                  return (
                    <div
                      key={day}
                      className="min-h-20 p-2 rounded-xl bg-slate-50/40 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800 flex flex-col gap-1 justify-center"
                    >
                      {matchingLectures.length === 0 ? (
                        <span className="text-[10px] text-slate-300 dark:text-slate-600 text-center font-mono">
                          —
                        </span>
                      ) : (
                        matchingLectures.map((m) => (
                          <div
                            key={m.id}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs text-left"
                          >
                            <div className="flex items-center justify-between text-[10px] font-bold">
                              <span className="text-indigo-600 dark:text-indigo-400 truncate">
                                {m.subjectCode}
                              </span>
                              <span className="text-slate-400">{m.section === 'Section A' ? 'Sec A' : 'Sec B'}</span>
                            </div>
                            <p className="text-[10px] text-slate-700 dark:text-slate-300 font-bold truncate">
                              {m.subjectName}
                            </p>
                            <p className="text-[9px] text-slate-500 truncate">{m.classroom}</p>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Create Lecture */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Schedule New Lecture"
        subtitle="Allocate period for CSIT 3rd Year / 5th Sem (Section A or B)"
      >
        <LectureForm
          facultyList={facultyList}
          onSubmit={handleCreateLecture}
          onCancel={() => setIsCreateModalOpen(false)}
          isLoading={isSubmitting}
        />
      </Modal>

      {/* Modal: Edit Lecture */}
      <Modal
        isOpen={Boolean(editingLecture)}
        onClose={() => setEditingLecture(null)}
        title="Edit Lecture Schedule"
        subtitle={`Update period details for ${editingLecture?.subjectName}`}
      >
        {editingLecture && (
          <LectureForm
            initialData={editingLecture}
            facultyList={facultyList}
            onSubmit={handleUpdateLecture}
            onCancel={() => setEditingLecture(null)}
            isLoading={isSubmitting}
          />
        )}
      </Modal>
    </div>
  );
}

