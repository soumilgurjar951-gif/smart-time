// src/components/assistant/SmartAssistant.jsx
// ODRMS Smart Assistant — floating panel with the live class status, quick
// actions and a natural-language chat (English/Hinglish). All answers come
// from the backend assistant API, which is database-backed and RBAC-scoped.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MessageCircle,
  X,
  Send,
  RefreshCw,
  Trash2,
  Clock,
  SkipForward,
  CalendarDays,
  ClipboardCheck,
  Users,
  Megaphone,
  BellRing,
  MapPin,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  askAssistant,
  buildLiveStatus,
  describeSection,
  getAssistantContext,
} from '../../services/assistantService';

const QUICK_ACTIONS = [
  { label: 'Current Class', prompt: 'What is my current class?', Icon: Clock },
  { label: 'Next Class', prompt: 'What is my next class?', Icon: SkipForward },
  { label: "Today's Timetable", prompt: "Show today's timetable", Icon: CalendarDays },
  { label: 'Attendance Summary', prompt: 'What is the attendance status?', Icon: ClipboardCheck },
  { label: 'Section A Timetable', prompt: 'Show Section A schedule for today', Icon: Users },
  { label: 'Section B Timetable', prompt: 'Show Section B schedule for today', Icon: Users },
  { label: 'Department Updates', prompt: 'Department updates', Icon: Megaphone },
];

const HISTORY_LIMIT = 60;
const POLL_MS = 60000;

function historyKey(userId) {
  return `odrms_assistant_history_${userId ?? 'me'}`;
}

function loadHistory(userId) {
  try {
    const raw = localStorage.getItem(historyKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(-HISTORY_LIMIT) : [];
  } catch {
    return [];
  }
}

function greetingForHour(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function timeLabel(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Compact live status card driven by the database-backed context payload. */
function LiveCard({ status }) {
  if (!status) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-midnight-800 bg-slate-50 dark:bg-midnight-950/60 p-3 text-xs text-slate-500 dark:text-slate-400">
        Live class status will appear here…
      </div>
    );
  }

  const stateTone = {
    running: 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40',
    break: 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40',
    upcoming: 'border-electric-200 dark:border-electric-900 bg-electric-50 dark:bg-electric-950/50',
    idle: 'border-slate-200 dark:border-midnight-800 bg-slate-50 dark:bg-midnight-950/60',
  };

  const mine = status.mine;
  const tone = mine
    ? stateTone.running
    : status.myNext
      ? stateTone.upcoming
      : stateTone.idle;
  const badge = mine
    ? { text: 'Running now', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' }
    : status.myNext
      ? { text: 'Upcoming', cls: 'bg-electric-100 text-electric-700 dark:bg-electric-900 dark:text-electric-300' }
      : { text: 'Standby', cls: 'bg-slate-100 text-slate-600 dark:bg-midnight-800 dark:text-slate-300' };

  return (
    <div className={`rounded-xl border p-3 space-y-1.5 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {status.isWeekend ? 'Weekend' : status.weekday || 'Today'}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.cls}`}>{badge.text}</span>
      </div>

      {mine ? (
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">{mine.subject}</p>
          <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 flex-wrap">
            <span>Section {mine.section}</span>
            {mine.room && (
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="w-3 h-3" /> {mine.room}
              </span>
            )}
            <span>
              {mine.start} – {mine.end}
            </span>
          </p>
          {mine.substitutedFor && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">Substituting {mine.substitutedFor}</p>
          )}
          {mine.perTimetable && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Per weekly timetable</p>
          )}
          {mine.remaining && (
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{mine.remaining} remaining</p>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {status.sections.map((row) => (
            <div key={row.section} className="flex items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-200">Section {row.section}</span>
              <span className="text-slate-600 dark:text-slate-400 truncate">{describeSection(row)}</span>
            </div>
          ))}
        </div>
      )}

      {status.myNext && (
        <p className="text-xs text-slate-600 dark:text-slate-300 border-t border-slate-200/70 dark:border-midnight-800 pt-1.5">
          <span className="font-semibold">Next:</span> {status.myNext.subject}
          {status.myNext.start ? ` at ${status.myNext.start}` : ''}
          {status.myNext.startsIn ? ` (in ${status.myNext.startsIn})` : ''}
        </p>
      )}
    </div>
  );
}

export default function SmartAssistant() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState(null);
  const [ctxError, setCtxError] = useState(false);
  const [messages, setMessages] = useState(() => loadHistory(user?.id));
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);
  const listRef = useRef(null);

  const status = useMemo(() => buildLiveStatus(context), [context]);
  const reminderCount = status?.reminders?.length || 0;

  // Seed the welcome message once per user when history is empty.
  useEffect(() => {
    if (messages.length === 0 && user) {
      const hour = new Date().getHours();
      setMessages([
        {
          role: 'assistant',
          text: `${greetingForHour(hour)}, ${user.full_name || 'Faculty'}! 👋\nI am the ODRMS Smart Assistant. Ask me about your current class, timetable, attendance or department updates — or tap a quick action below.`,
          ts: Date.now(),
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Persist chat history per user.
  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem(historyKey(user.id), JSON.stringify(messages.slice(-HISTORY_LIMIT)));
    } catch {
      /* storage full/unavailable — history simply not persisted */
    }
  }, [messages, user]);

  const refreshContext = useCallback(async () => {
    try {
      const data = await getAssistantContext();
      setContext(data);
      setCtxError(false);
    } catch {
      setCtxError(true);
    }
  }, []);

  // Initial load + 60s polling so remaining-time and reminders stay live.
  useEffect(() => {
    refreshContext();
    const timer = setInterval(refreshContext, POLL_MS);
    return () => clearInterval(timer);
  }, [refreshContext]);

  // Keep the newest message in view.
  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, busy, open]);

  const send = useCallback(
    async (raw) => {
      const text = (raw ?? input).trim();
      if (!text || busy) return;
      setInput('');
      setMessages((prev) => [...prev, { role: 'user', text, ts: Date.now() }]);
      setBusy(true);
      try {
        const answer = await askAssistant(text);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: answer.text, intent: answer.intent, ts: Date.now() },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: 'Sorry — I could not fetch that right now. Please try again in a moment.',
            error: true,
            ts: Date.now(),
          },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, input]
  );

  const clearChat = () => {
    const hour = new Date().getHours();
    setMessages([
      {
        role: 'assistant',
        text: `${greetingForHour(hour)}! Chat cleared. Ask me anything about classes, timetable or attendance.`,
        ts: Date.now(),
      },
    ]);
  };

  if (!user) return null;

  return (
    <>
      {/* Floating action button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open ODRMS Smart Assistant"
          className="fixed z-40 bottom-5 right-5 sm:bottom-6 sm:right-6 w-14 h-14 rounded-full bg-electric-600 hover:bg-electric-700 text-white shadow-lg shadow-electric-600/30 flex items-center justify-center transition-transform hover:scale-105"
        >
          <MessageCircle className="w-6 h-6" />
          {reminderCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[9px] font-bold items-center justify-center">
                {reminderCount}
              </span>
            </span>
          )}
        </button>
      )}

      {/* Assistant panel */}
      {open && (
        <div
          role="dialog"
          aria-label="ODRMS Smart Assistant"
          className="fixed z-50 inset-x-3 bottom-3 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[400px] h-[min(620px,calc(100dvh-1.5rem))] sm:h-[600px] flex flex-col rounded-2xl overflow-hidden border border-slate-200 dark:border-midnight-800 bg-white dark:bg-midnight-900 shadow-2xl"
        >
          {/* Header */}
          <div className="bg-midnight-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-9 h-9 rounded-xl bg-electric-600 flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight truncate">ODRMS Smart Assistant</p>
                <p className="text-[11px] text-slate-300 truncate">
                  {greetingForHour(new Date().getHours())}, {user.full_name || 'Faculty'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={refreshContext}
                aria-label="Refresh live status"
                title="Refresh live status"
                className="p-2 rounded-lg hover:bg-midnight-800 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${ctxError ? 'text-rose-400' : ''}`} />
              </button>
              <button
                onClick={clearChat}
                aria-label="Clear chat history"
                title="Clear chat history"
                className="p-2 rounded-lg hover:bg-midnight-800 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                className="p-2 rounded-lg hover:bg-midnight-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-offwhite dark:bg-midnight-950">
            {ctxError && (
              <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-3 py-2 text-xs text-rose-600 dark:text-rose-300">
                Live status unavailable right now — retrying automatically.
              </div>
            )}

            {/* Live class status */}
            <LiveCard status={status} />

            {/* Reminders */}
            {reminderCount > 0 && (
              <div className="space-y-1.5">
                {status.reminders.map((r, i) => (
                  <div
                    key={`${r.type}-${r.lecture_id}-${i}`}
                    className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 px-3 py-2"
                  >
                    <BellRing className="w-3.5 h-3.5 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <p className="text-xs text-amber-800 dark:text-amber-200">{r.message}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Quick actions */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 pb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Quick questions
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {QUICK_ACTIONS.map(({ label, prompt, Icon }) => (
                  <button
                    key={label}
                    onClick={() => send(prompt)}
                    disabled={busy}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-midnight-800 bg-white dark:bg-midnight-900 px-2.5 py-2 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-electric-300 hover:bg-electric-50 dark:hover:bg-midnight-800 transition-colors disabled:opacity-50 text-left"
                  >
                    <Icon className="w-3.5 h-3.5 text-electric-600 dark:text-electric-400 shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat messages */}
            <div className="space-y-2.5">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line ${
                      m.role === 'user'
                        ? 'bg-electric-600 text-white rounded-br-sm'
                        : m.error
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-bl-sm'
                          : 'bg-white dark:bg-midnight-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-midnight-700 rounded-bl-sm'
                    }`}
                  >
                    {m.text}
                    <div
                      className={`mt-1 text-[9px] ${
                        m.role === 'user' ? 'text-electric-100' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {timeLabel(m.ts)}
                    </div>
                  </div>
                </div>
              ))}

              {busy && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="w-1.5 h-1.5 rounded-full bg-electric-400 animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Composer */}
          <div className="shrink-0 border-t border-slate-200 dark:border-midnight-800 bg-white dark:bg-midnight-900 p-2.5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about classes, timetable, attendance…"
                aria-label="Ask the assistant"
                className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-midnight-700 bg-offwhite dark:bg-midnight-950 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-electric-500/40 focus:border-electric-400"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Send message"
                className="shrink-0 w-10 h-10 rounded-xl bg-electric-600 hover:bg-electric-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
