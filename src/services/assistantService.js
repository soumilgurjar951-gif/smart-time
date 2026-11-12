// src/services/assistantService.js
// ODRMS Smart Assistant — live academic context + natural-language queries.
// All data comes from the backend services layer (database-backed, RBAC-scoped).
import apiClient from './api';

/**
 * Live now-view: current/next class, reminders, daily digest.
 * GET /api/assistant/context/
 */
export async function getAssistantContext() {
  const { data } = await apiClient.get('/assistant/context/');
  return data;
}

/**
 * Ask a natural-language question (English/Hinglish).
 * POST /api/assistant/query/  → { intent, text, data, generated_at }
 */
export async function askAssistant(message) {
  const { data } = await apiClient.post('/assistant/query/', { message });
  return data;
}

/** Map the backend live card payload into a compact view model. */
export function buildLiveStatus(context) {
  if (!context) return null;
  const mine = context.my_current
    ? {
        kind: 'running',
        subject: context.my_current.subject_name,
        section: context.my_current.section,
        room: context.my_current.classroom,
        faculty: context.my_current.faculty_name,
        start: context.my_current.start_time,
        end: context.my_current.end_time,
        remaining: context.my_current.remaining_minutes,
        elapsed: context.my_current.elapsed_minutes,
        status: context.my_current.status,
        substitutedFor: context.my_current.substituted_for,
        perTimetable: context.my_current.source === 'timetable',
      }
    : null;

  const myNext = context.my_next
    ? {
        subject: context.my_next.subject_name,
        section: context.my_next.section,
        start: context.my_next.start_time,
        end: context.my_next.end_time,
        room: context.my_next.classroom,
        startsIn: context.my_next.starts_in_minutes,
      }
    : null;

  const sections = (context.sections || []).map((s) => ({
    section: s.section,
    state: s.state,
    current: s.current
      ? {
          subject: s.current.subject_name,
          room: s.current.classroom,
          start: s.current.start_time,
          end: s.current.end_time,
          remaining: s.current.remaining_minutes,
          cancelled: s.current.status === 'CANCELLED',
        }
      : null,
    next: s.next
      ? {
          subject: s.next.subject_name,
          start: s.next.start_time,
          startsIn: s.next.starts_in_minutes,
        }
      : null,
  }));

  return {
    mine,
    myNext,
    sections,
    weekday: context.weekday,
    isWeekend: context.is_weekend,
    reminders: context.reminders || [],
    digest: context.digest,
    generatedAt: context.generated_at,
    minAttendancePct: context.min_attendance_pct,
  };
}

/** Compact one-line summary per section for the live card fallback. */
export function describeSection(sectionRow) {
  if (!sectionRow) return '';
  if (sectionRow.state === 'running' && sectionRow.current) {
    return `${sectionRow.current.subject} — ${sectionRow.current.remaining || 'running now'} left`;
  }
  if (sectionRow.state === 'break' && sectionRow.next) {
    return `Break — next at ${sectionRow.next.start}`;
  }
  if (sectionRow.next) {
    return `Next: ${sectionRow.next.subject} at ${sectionRow.next.start}`;
  }
  if (sectionRow.state === 'all_cancelled') return 'All lectures cancelled today';
  if (sectionRow.state === 'day_over') return "Today's classes are over";
  return 'No scheduled class';
}
