import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Bell, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageSpinner } from '../components/Skeleton';
import { Modal } from '../components/Modal';
import { TaskDetailPanel } from '../components/TaskDetailPanel';
import { ReminderForm } from '../components/ReminderPanel';
import { taskApi, reminderApi, type ReminderItem } from '../services/api';
import { useLang } from '../context/LangContext';
import type { Task, TaskPriority } from '../types';

const PRIORITY_BG: Record<TaskPriority, string> = {
  LOW: 'bg-slate-200 dark:bg-slate-600',
  MEDIUM: 'bg-blue-200 dark:bg-blue-800',
  HIGH: 'bg-orange-200 dark:bg-orange-800',
  URGENT: 'bg-red-200 dark:bg-red-800',
};

const MAX_PILLS = 3;

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildDays(year: number, month: number) {
  const start = new Date(year, month, 1);
  const grid = new Date(year, month, 1 - start.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(grid);
    d.setDate(grid.getDate() + i);
    return d;
  });
}

async function fetchAllTasks() {
  const all: Task[] = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const { data } = await taskApi.getHistory({ page, tab: 'all' });
    all.push(...data.tasks);
    totalPages = data.totalPages;
    page++;
  }
  return all;
}

export function CalendarPage() {
  const { t, lang, dateLocale } = useLang();
  const he = lang === 'he';
  const today = useMemo(() => new Date(), []);
  const todayKey = toKey(today);

  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Reminder edit state
  const [editReminder, setEditReminder] = useState<ReminderItem | null>(null);
  const [rTitle, setRTitle] = useState('');
  const [rContent, setRContent] = useState('');
  const [rColor, setRColor] = useState('#3b82f6');
  const [rDate, setRDate] = useState('');
  const [rTime, setRTime] = useState('');
  const [rSaving, setRSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchAllTasks(),
      reminderApi.getAll().then((r) => r.data),
    ])
      .then(([t, r]) => { setTasks(t); setReminders(r); })
      .catch(() => toast.error(he ? 'שגיאה בטעינת נתונים' : 'Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      if (!task.dueDate) return;
      const key = task.dueDate.split('T')[0];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    });
    return map;
  }, [tasks]);

  const remindersByDate = useMemo(() => {
    const map = new Map<string, ReminderItem[]>();
    reminders.forEach((r) => {
      const key = r.triggerAt.split('T')[0];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return map;
  }, [reminders]);

  const weekdays = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : 'en-US', { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 7 + i)));
  }, [lang]);

  const monthLabel = new Intl.DateTimeFormat(dateLocale, { month: 'long', year: 'numeric' }).format(viewDate);
  const days = buildDays(viewDate.getFullYear(), viewDate.getMonth());
  const selectedTasks = selectedKey ? tasksByDate.get(selectedKey) ?? [] : [];
  const selectedReminders = selectedKey ? remindersByDate.get(selectedKey) ?? [] : [];

  const goToday = () => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

  function handleTaskUpdate(updated: Task) {
    setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t));
    setSelectedTask(updated);
  }

  function handleTaskDelete(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setSelectedTask(null);
  }

  function openReminderEdit(r: ReminderItem) {
    setEditReminder(r);
    setRTitle(r.title);
    setRContent(r.content || '');
    setRColor(r.color);
    const dt = new Date(r.triggerAt);
    setRDate(dt.toISOString().split('T')[0]);
    setRTime(dt.toTimeString().slice(0, 5));
  }

  function closeReminderEdit() {
    setEditReminder(null);
  }

  async function saveReminderEdit() {
    if (!editReminder || !rTitle.trim() || !rDate || !rTime) return;
    setRSaving(true);
    try {
      const triggerAt = new Date(`${rDate}T${rTime}`).toISOString();
      const { data } = await reminderApi.update(editReminder.id, {
        title: rTitle.trim(), content: rContent.trim() || undefined, color: rColor, triggerAt,
      });
      setReminders((prev) => prev.map((r) => r.id === data.id ? data : r));
      closeReminderEdit();
      toast.success(he ? 'תזכורת עודכנה' : 'Reminder updated');
    } catch {
      toast.error(he ? 'שגיאה בעדכון תזכורת' : 'Failed to update reminder');
    } finally { setRSaving(false); }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <CalendarIcon className="w-7 h-7 text-primary-500" />
              {he ? 'לוח שנה' : 'Calendar'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {he
                ? `${tasks.filter((tk) => tk.dueDate).length} משימות · ${reminders.length} תזכורות`
                : `${tasks.filter((tk) => tk.dueDate).length} tasks · ${reminders.length} reminders`}
            </p>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="btn-ghost p-2 rounded-lg" aria-label={he ? 'חודש קודם' : 'Previous month'}>
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white min-w-[10rem] text-center capitalize">
                {monthLabel}
              </h2>
              <button onClick={nextMonth} className="btn-ghost p-2 rounded-lg" aria-label={he ? 'חודש הבא' : 'Next month'}>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <button onClick={goToday} className="btn-secondary text-sm px-4 py-2">
              {t.chat.today}
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
            {weekdays.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-medium text-slate-500 uppercase">
                {d}
              </div>
            ))}
          </div>

          {loading ? (
            <PageSpinner />
          ) : (
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const key = toKey(day);
                const inMonth = day.getMonth() === viewDate.getMonth();
                const isToday = key === todayKey;
                const dayTasks = tasksByDate.get(key) ?? [];
                const dayReminders = remindersByDate.get(key) ?? [];
                const totalItems = dayTasks.length + dayReminders.length;
                const extra = totalItems - MAX_PILLS;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedKey(key)}
                    className={`min-h-[5.5rem] p-1.5 border-b border-e border-slate-100 dark:border-slate-800 text-start transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                      !inMonth ? 'bg-slate-50/50 dark:bg-slate-900/30' : ''
                    } ${selectedKey === key ? 'ring-2 ring-inset ring-primary-400' : ''}`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 text-sm rounded-full mb-1 ${
                        isToday ? 'bg-primary-500 text-white font-bold' : inMonth ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    <div className="space-y-0.5">
                      {dayTasks.slice(0, MAX_PILLS).map((task) => (
                        <div
                          key={task.id}
                          className={`text-[10px] leading-tight px-1.5 py-0.5 rounded truncate text-slate-800 dark:text-slate-100 ${PRIORITY_BG[task.priority]}`}
                          title={task.title}
                        >
                          {task.title}
                        </div>
                      ))}
                      {dayReminders.slice(0, Math.max(0, MAX_PILLS - dayTasks.length)).map((r) => (
                        <div
                          key={r.id}
                          className="text-[10px] leading-tight px-1.5 py-0.5 rounded truncate text-white flex items-center gap-0.5"
                          style={{ backgroundColor: r.color }}
                          title={r.title}
                        >
                          <Bell className="w-2.5 h-2.5 shrink-0" />
                          {r.title}
                        </div>
                      ))}
                      {extra > 0 && (
                        <div className="text-[10px] text-slate-500 px-1">+{extra} {he ? 'עוד' : 'more'}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Day detail popup */}
        <AnimatePresence>
          {selectedKey && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
              onClick={() => setSelectedKey(null)}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="card w-full max-w-md max-h-[70vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {new Intl.DateTimeFormat(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(selectedKey + 'T12:00:00'))}
                  </h3>
                  <button onClick={() => setSelectedKey(null)} className="btn-ghost p-1.5 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 overflow-y-auto max-h-[50vh] space-y-2">
                  {selectedTasks.length === 0 && selectedReminders.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">{he ? 'אין פריטים ביום זה' : 'No items on this day'}</p>
                  ) : (
                    <>
                      {selectedTasks.map((task) => (
                        <button
                          key={task.id}
                          onClick={() => { setSelectedTask(task); setSelectedKey(null); }}
                          className={`flex items-center gap-2 p-2.5 rounded-lg w-full text-start hover:ring-2 hover:ring-primary-400 transition-all cursor-pointer ${PRIORITY_BG[task.priority]}`}
                        >
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate flex-1">{task.title}</span>
                          {task.project && (
                            <span className="text-xs text-slate-600 dark:text-slate-300 shrink-0">{task.project.name}</span>
                          )}
                        </button>
                      ))}
                      {selectedReminders.map((r) => {
                        const dt = new Date(r.triggerAt);
                        return (
                          <div key={r.id} className="flex items-center gap-2 p-2.5 rounded-lg text-white group" style={{ backgroundColor: r.color }}>
                            <Bell className="w-4 h-4 shrink-0 opacity-70" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium truncate block">{r.title}</span>
                              <span className="text-xs opacity-80">
                                {dt.toLocaleTimeString(he ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); openReminderEdit(r); }}
                              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors opacity-0 group-hover:opacity-100"
                              title={he ? 'ערוך' : 'Edit'}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reminder edit modal */}
        <Modal isOpen={!!editReminder} onClose={closeReminderEdit}
          title={he ? 'עריכת תזכורת' : 'Edit Reminder'} size="sm">
          <ReminderForm
            he={he}
            title={rTitle} setTitle={setRTitle}
            content={rContent} setContent={setRContent}
            date={rDate} setDate={setRDate}
            time={rTime} setTime={setRTime}
            color={rColor} setColor={setRColor}
            saving={rSaving}
            isEditing={true}
            onSave={saveReminderEdit}
            onCancel={closeReminderEdit}
          />
        </Modal>

        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
          onDelete={handleTaskDelete}
        />
      </motion.div>
    </div>
  );
}
