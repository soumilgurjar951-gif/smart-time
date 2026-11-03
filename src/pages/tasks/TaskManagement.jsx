// src/pages/tasks/TaskManagement.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckSquare,
  Plus,
} from 'lucide-react';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import SearchInput from '../../components/common/SearchInput';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import TaskForm from '../../components/forms/TaskForm';
import { taskService } from '../../services/taskService';
import { facultyService } from '../../services/facultyService';
import { useOdrms } from '../../context/OdrmsContext';
import { useAuth } from '../../context/AuthContext';
import { TASK_PRIORITIES, TASK_STATUSES } from '../../utils/constants';

export default function TaskManagement() {
  const { user, isHod } = useAuth();
  const { showToast, refreshCounts, addActivity } = useOdrms();

  const [tasks, setTasks] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusTab, setStatusTab] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [search, setSearch] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [updatingTask, setUpdatingTask] = useState(null);
  const [reviewingTask, setReviewingTask] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update progress form state
  const [progressVal, setProgressVal] = useState(50);
  const [statusVal, setStatusVal] = useState('In Progress');
  const [completionReportText, setCompletionReportText] = useState('');

  // HOD Review form state
  const [reviewDecision, setReviewDecision] = useState('Completed');
  const [hodRemarks, setHodRemarks] = useState('Approved by HOD. Verified according to NBA criteria.');

  const fetchTasksAndFaculty = async () => {
    setLoading(true);
    try {
      const [tskList, facList] = await Promise.all([
        taskService.getAllTasks(),
        facultyService.getAllFaculty(),
      ]);
      setTasks(tskList);
      setFacultyList(facList);
    } catch {
      showToast('Error loading tasks list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksAndFaculty();
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchStatus = statusTab === 'All' || t.status === statusTab;
      const matchPriority = priorityFilter === 'All' || t.priority === priorityFilter;
      const matchSearch =
        search === '' ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.assignedToName.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase());

      return matchStatus && matchPriority && matchSearch;
    });
  }, [tasks, statusTab, priorityFilter, search]);

  const handleCreateTask = async (formData) => {
    setIsSubmitting(true);
    try {
      const created = await taskService.createTask(formData);
      setTasks((prev) => [created, ...prev]);
      showToast(`Task assigned to ${created.assignedToName}!`);
      addActivity(`New Task Assigned: ${created.title}`, `Assigned to ${created.assignedToName}`, 'task');
      setIsCreateModalOpen(false);
      refreshCounts();
    } catch (err) {
      showToast(err.message || 'Error creating task.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenUpdateModal = (task) => {
    setUpdatingTask(task);
    setProgressVal(task.progressPct || 50);
    setStatusVal(task.status === 'Pending' ? 'In Progress' : task.status);
    setCompletionReportText(task.completionReport || '');
  };

  const handleSaveProgress = async (e) => {
    e.preventDefault();
    if (!updatingTask) return;
    setIsSubmitting(true);
    try {
      const updated = await taskService.updateTaskProgress(updatingTask.id, {
        progressPct: progressVal,
        status: statusVal,
        completionReport: completionReportText,
      });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      showToast(`Progress for "${updated.title}" updated!`);
      addActivity(`Task Progress Updated: ${updated.title}`, `Status: ${updated.status} (${updated.progressPct}%)`, 'task');
      setUpdatingTask(null);
      refreshCounts();
    } catch {
      showToast('Error updating progress.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenReviewModal = (task) => {
    setReviewingTask(task);
    setReviewDecision('Completed');
    setHodRemarks('Approved by HOD. Verified according to departmental criteria.');
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!reviewingTask) return;
    setIsSubmitting(true);
    try {
      const updated = await taskService.reviewTask(reviewingTask.id, {
        status: reviewDecision,
        remarks: hodRemarks,
      });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      showToast(`Task marked as ${reviewDecision}!`);
      addActivity(`Task Reviewed by HOD: ${updated.title}`, `Decision: ${reviewDecision}`, 'task');
      setReviewingTask(null);
      refreshCounts();
    } catch {
      showToast('Error recording task review.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-200 dark:border-amber-900 mb-2">
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Academic Duties & Accreditation Deliverables</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
            Task Management System
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track NAAC files, question papers, lab audits, and mentorship duties assigned to CSIT 5th Sem faculty.
          </p>
        </div>

        {isHod && (
          <Button onClick={() => setIsCreateModalOpen(true)} icon={Plus}>
            Assign New Task
          </Button>
        )}
      </div>

      {/* Filter and Status Tabs */}
      <div className="bg-white dark:bg-midnight-900 rounded-3xl border border-slate-200/90 dark:border-midnight-800 p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {['All', 'Pending', 'In Progress', 'Under Review', 'Completed'].map((tab) => {
            const count =
              tab === 'All' ? tasks.length : tasks.filter((t) => t.status === tab).length;
            const isActive = statusTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? 'bg-electric-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-midnight-800'
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 dark:bg-midnight-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-midnight-800">
          <div className="flex-1 max-w-md">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by title, faculty, or category..."
            />
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-slate-400">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <option value="All">All Priorities</option>
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Task Cards Grid */}
      {loading ? (
        <LoadingSpinner message="Loading task deliverables..." />
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          title="No tasks match this filter"
          description="Try changing status tabs or assign a new departmental duty."
          actionLabel={isHod ? 'Assign New Task' : undefined}
          onAction={isHod ? () => setIsCreateModalOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTasks.map((task) => {
            const isAssignedToCurrent = user?.id === task.assignedToId;
            return (
              <div
                key={task.id}
                className="bg-white dark:bg-midnight-900 rounded-3xl border border-slate-200/90 dark:border-midnight-800 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-electric-300 dark:hover:border-electric-700 transition-all"
              >
                <div className="space-y-3">
                  {/* Category & Priority */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-midnight-800 text-slate-600 dark:text-slate-300">
                      {task.category}
                    </span>
                    <Badge priority={task.priority}>{task.priority}</Badge>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {task.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-3">
                      {task.description}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                      <span>Progress</span>
                      <span className="text-electric-600 dark:text-electric-400">{task.progressPct || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-midnight-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-electric-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${task.progressPct || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Assignment Details */}
                  <div className="pt-2 border-t border-slate-100 dark:border-midnight-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Assigned To:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                        {task.assignedToName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Deadline:</span>
                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                        {task.deadline}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Scope:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {task.section}
                      </span>
                    </div>
                  </div>

                  {/* Completion Report Preview if present */}
                  {task.completionReport && (
                    <div className="p-2.5 rounded-xl bg-offwhite dark:bg-midnight-800/60 border border-slate-100 dark:border-midnight-700/80 text-[11px]">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                        Faculty Report:
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 line-clamp-2">
                        {task.completionReport}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-midnight-800 flex items-center justify-between gap-2">
                  <Badge status={task.status}>{task.status}</Badge>

                  <div className="flex items-center gap-1.5">
                    {/* Faculty Action: Update Progress */}
                    {(!isHod || isAssignedToCurrent) && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenUpdateModal(task)}
                      >
                        Update Progress
                      </Button>
                    )}

                    {/* HOD Action: Review Task */}
                    {isHod && task.status === 'Under Review' && (
                      <Button
                        size="sm"
                        onClick={() => handleOpenReviewModal(task)}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        Review & Sign-Off
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Task (HOD) */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Assign Departmental Task"
        subtitle="Allocate accreditation, exam, or lab duties to CSIT 5th Sem faculty"
      >
        <TaskForm
          facultyList={facultyList}
          onSubmit={handleCreateTask}
          onCancel={() => setIsCreateModalOpen(false)}
          isLoading={isSubmitting}
        />
      </Modal>

      {/* Modal: Faculty Update Progress */}
      <Modal
        isOpen={Boolean(updatingTask)}
        onClose={() => setUpdatingTask(null)}
        title="Update Task Progress & Report"
        subtitle={updatingTask?.title}
      >
        {updatingTask && (
          <form onSubmit={handleSaveProgress} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Progress Percentage ({progressVal}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={progressVal}
                onChange={(e) => setProgressVal(Number(e.target.value))}
                className="w-full accent-electric-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Current Status
              </label>
              <select
                value={statusVal}
                onChange={(e) => setStatusVal(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
              >
                <option value="In Progress">In Progress</option>
                <option value="Under Review">Submit for HOD Review (Under Review)</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Completion Notes & Deliverables Link
              </label>
              <textarea
                rows={3}
                required
                value={completionReportText}
                onChange={(e) => setCompletionReportText(e.target.value)}
                placeholder="Detail what was completed, verified, or provide link to course file drive..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-midnight-800 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setUpdatingTask(null)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Save Progress
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: HOD Review & Sign-Off */}
      <Modal
        isOpen={Boolean(reviewingTask)}
        onClose={() => setReviewingTask(null)}
        title="Review & Sign-Off Deliverable"
        subtitle={reviewingTask?.title}
      >
        {reviewingTask && (
          <form onSubmit={handleSaveReview} className="space-y-4 text-xs">
            <div className="p-3 rounded-2xl bg-offwhite dark:bg-midnight-800/60 border border-slate-200 dark:border-midnight-700 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Submitted by {reviewingTask.assignedToName}:
              </span>
              <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                {reviewingTask.completionReport || 'No written report provided.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                HOD Decision *
              </label>
              <select
                value={reviewDecision}
                onChange={(e) => setReviewDecision(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
              >
                <option value="Completed">Approve & Mark Completed</option>
                <option value="In Progress">Request Revisions (Revert to In Progress)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                HOD Remarks / Feedback
              </label>
              <input
                type="text"
                value={hodRemarks}
                onChange={(e) => setHodRemarks(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-midnight-800 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setReviewingTask(null)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Record Review Decision
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

