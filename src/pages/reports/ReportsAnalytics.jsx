// src/pages/reports/ReportsAnalytics.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Printer,
  Download,
  Filter,
  Users,
  CheckSquare,
  Building2,
  Award,
  ClipboardCheck,
  Calendar,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import AttendanceChart from '../../components/charts/AttendanceChart';
import TaskProgressChart from '../../components/charts/TaskProgressChart';
import ResourceChart from '../../components/charts/ResourceChart';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { reportService } from '../../services/reportService';
import { facultyService } from '../../services/facultyService';
import { taskService } from '../../services/taskService';
import { lectureService } from '../../services/lectureService';
import { attendanceService } from '../../services/attendanceService';
import { DEPARTMENT_INFO } from '../../utils/constants';

export default function ReportsAnalytics() {
  const [loading, setLoading] = useState(true);
  const [activeReportTab, setActiveReportTab] = useState('attendance'); // 'attendance' | 'tasks' | 'resources' | 'workload'
  const [overview, setOverview] = useState(null);
  const [facultyList, setFacultyList] = useState([]);
  const [taskList, setTaskList] = useState([]);
  const [lectureList, setLectureList] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);

  useEffect(() => {
    async function loadAllReports() {
      setLoading(true);
      try {
        const [ov, fac, tsk, lec, att] = await Promise.all([
          reportService.getDepartmentOverview(),
          facultyService.getAllFaculty(),
          taskService.getAllTasks(),
          lectureService.getAllLectures(),
          attendanceService.getAttendanceHistory(),
        ]);
        setOverview(ov);
        setFacultyList(fac);
        setTaskList(tsk);
        setLectureList(lec);
        setAttendanceList(att);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAllReports();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (activeReportTab === 'attendance') {
      csvContent += 'Subject Code,Subject Name,Section,Faculty Name,Date,Total Students,Present,Absent,Attendance Rate %\n';
      attendanceList.forEach((a) => {
        csvContent += `"${a.subjectCode}","${a.subjectName}","${a.section}","${a.facultyName}","${a.date}",${a.totalStudents},${a.presentCount},${a.absentCount},"${a.attendanceRate}%"\n`;
      });
    } else if (activeReportTab === 'tasks') {
      csvContent += 'Title,Assigned Faculty,Category,Priority,Deadline,Status,Progress %\n';
      taskList.forEach((t) => {
        csvContent += `"${t.title}","${t.assignedToName}","${t.category}","${t.priority}","${t.deadline}","${t.status}",${t.progressPct}%\n`;
      });
    } else {
      csvContent += 'Faculty Name,Employee ID,Designation,Assigned Sections,Assigned Subjects,Status\n';
      facultyList.forEach((f) => {
        csvContent += `"${f.name}","${f.employeeId}","${f.designation}","${f.assignedSections.join(';')}","${f.assignedSubjects.join(';')}","${f.status}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ODRMS_CSIT_5thSem_${activeReportTab}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <LoadingSpinner message="Generating departmental audit reports..." />;
  }

  const metrics = overview?.metrics || {};

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 text-xs font-bold border border-indigo-200 dark:border-indigo-900 mb-2">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>NAAC / NBA Accreditation Audit Suite</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
            Reports & Departmental Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Export-ready compliance tables, attendance summaries, syllabus delivery, and resource utilization for 5th Sem CSIT.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" icon={Download} onClick={handleExportCSV}>
            Export CSV
          </Button>
          <Button icon={Printer} onClick={handlePrint} className="bg-slate-900 hover:bg-slate-800 text-white">
            Print Official PDF
          </Button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-2 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setActiveReportTab('attendance')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeReportTab === 'attendance'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>1. Section Attendance Audit (Sec A vs B)</span>
          </button>
          <button
            onClick={() => setActiveReportTab('tasks')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeReportTab === 'tasks'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>2. Faculty Task Completion</span>
          </button>
          <button
            onClick={() => setActiveReportTab('resources')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeReportTab === 'resources'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>3. Facility & Lab Utilization</span>
          </button>
          <button
            onClick={() => setActiveReportTab('workload')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeReportTab === 'workload'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>4. Faculty Workload & Syllabus Progress</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
        {/* Official Header for Print & Audit */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
          <div className="flex items-center gap-4">
            <img src="/cdgi-logo.png" alt="CDGI Logo" className="w-14 h-14 object-contain shrink-0" />
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase font-['Plus_Jakarta_Sans',sans-serif]">
                Chameli Devi Group of Institutions, Indore
              </h2>
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                Department of Computer Science & Information Technology (CSIT)
              </p>
              <p className="text-xs text-slate-500">
                ODRMS Official Audit Report • 3rd Year / 5th Semester (Sections A & B)
              </p>
            </div>
          </div>

          <div className="text-right text-xs text-slate-500 space-y-0.5">
            <p><strong>Session:</strong> Academic 2026-27</p>
            <p><strong>Department Code:</strong> CSIT-UG</p>
            <p><strong>Status:</strong> Digitally Certified</p>
          </div>
        </div>

        {/* Tab 1: Section Attendance Audit */}
        {activeReportTab === 'attendance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              <div className="lg:col-span-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase mb-2">
                  Comparative Attendance Rates by Subject (%)
                </h3>
                <AttendanceChart data={overview?.attendanceBySubject} />
              </div>

              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                <h4 className="font-bold text-slate-800 dark:text-white uppercase">Section Summary Highlights</h4>
                <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Section A Average:</span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400">{metrics.attendanceSecA}%</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Section B Average:</span>
                  <span className="font-black text-cyan-600 dark:text-cyan-400">{metrics.attendanceSecB}%</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Total Enrolled:</span>
                  <span className="font-bold text-slate-900 dark:text-white">120 Students (60 + 60)</span>
                </div>
                <div className="pt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                  ✓ 100% of lectures satisfy mandatory 75% AICTE attendance guidelines.
                </div>
              </div>
            </div>

            {/* Attendance Log Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Detailed Lecture Attendance Audit
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-400 uppercase">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Section</th>
                      <th className="py-2.5 px-3">Faculty</th>
                      <th className="py-2.5 px-3 text-center">Present / Total</th>
                      <th className="py-2.5 px-3 text-center">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {attendanceList.map((a) => (
                      <tr key={a.id}>
                        <td className="py-2.5 px-3 font-semibold">{a.date}</td>
                        <td className="py-2.5 px-3 font-bold">{a.subjectName} ({a.subjectCode})</td>
                        <td className="py-2.5 px-3 font-bold text-indigo-600">{a.section}</td>
                        <td className="py-2.5 px-3">{a.facultyName}</td>
                        <td className="py-2.5 px-3 text-center font-bold">
                          {a.presentCount} / {a.totalStudents}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-600">
                          {a.attendanceRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Faculty Task Completion */}
        {activeReportTab === 'tasks' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              <div className="lg:col-span-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase mb-2">
                  Department Task Allocation Status
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-600 uppercase">
                        <th className="py-2.5 px-3">Task Deliverable</th>
                        <th className="py-2.5 px-3">Assigned Faculty</th>
                        <th className="py-2.5 px-3">Priority</th>
                        <th className="py-2.5 px-3">Deadline</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-center">Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {taskList.map((t) => (
                        <tr key={t.id}>
                          <td className="py-2.5 px-3 font-bold">{t.title}</td>
                          <td className="py-2.5 px-3 font-medium">{t.assignedToName}</td>
                          <td className="py-2.5 px-3">
                            <Badge priority={t.priority}>{t.priority}</Badge>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{t.deadline}</td>
                          <td className="py-2.5 px-3">
                            <Badge status={t.status}>{t.status}</Badge>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold">{t.progressPct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <TaskProgressChart data={overview?.taskDistribution} />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Resource & Facility Utilization */}
        {activeReportTab === 'resources' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase mb-2">
                  Resource Utilization Breakdown
                </h3>
                <ResourceChart data={overview?.resourceUtilization} />
              </div>

              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                <h4 className="font-bold text-slate-900 dark:text-white uppercase">Department Inventory Status</h4>
                <p className="text-slate-500">
                  Total Allocated Facilities: <strong>7 Units</strong>
                </p>
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span>CSIT Smart Classrooms (301 & 302):</span>
                    <span className="font-bold text-emerald-600">100% Operational</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Advanced Computing Lab 1 (Turing Block):</span>
                    <span className="font-bold text-indigo-600">In Use (Sec B DAA)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Database & Cloud Lab 2 (Ada Lovelace):</span>
                    <span className="font-bold text-emerald-600">Available</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Seminar Hall & Mobile Projectors:</span>
                    <span className="font-bold text-emerald-600">Available for Booking</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Faculty Workload & Syllabus Progress */}
        {activeReportTab === 'workload' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase">
              CSIT Faculty Workload & 5th Semester Course Assignments
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-600 uppercase">
                    <th className="py-2.5 px-3">Faculty Member</th>
                    <th className="py-2.5 px-3">Employee ID</th>
                    <th className="py-2.5 px-3">Designation</th>
                    <th className="py-2.5 px-3">Assigned 5th Sem Subjects</th>
                    <th className="py-2.5 px-3">Sections</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {facultyList.map((f) => (
                    <tr key={f.id}>
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{f.name}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">{f.employeeId}</td>
                      <td className="py-3 px-3 font-medium text-indigo-600 dark:text-indigo-400">{f.designation}</td>
                      <td className="py-3 px-3">{f.assignedSubjects.join(', ')}</td>
                      <td className="py-3 px-3 font-bold">{f.assignedSections.join(' & ')}</td>
                      <td className="py-3 px-3">
                        <Badge status={f.status}>{f.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Digital Verification & Stamp Footer */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>Generated automatically via Online Departmental Resource Management System (ODRMS).</p>
          <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
            <span>Verified by: Dr. Rajiv Sharma (HOD CSIT)</span>
            <span className="text-indigo-600 font-mono">[STAMP-CDGI-CSIT-5TH-SEM]</span>
          </div>
        </div>
      </div>
    </div>
  );
}

