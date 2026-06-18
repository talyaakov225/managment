import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GanttChart, ZoomIn, ZoomOut, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageSpinner } from '../components/Skeleton';
import { taskApi } from '../services/api';
import { useLang } from '../context/LangContext';
import type { Task, TaskStatus } from '../types';

type Zoom = 'week' | '2weeks' | 'month';
const ZOOM_PX: Record<Zoom, number> = { week: 44, '2weeks': 22, month: 11 };
const ROW_H = 40;
const LEFT_W = 250;
const DEFAULT_DAYS = 7;

const STATUS_BAR: Record<TaskStatus, string> = {
  TODO: 'bg-slate-400',
  IN_PROGRESS: 'bg-blue-500',
  REVIEW: 'bg-amber-500',
  DONE: 'bg-green-500',
};

function daysBetween(a: Date, b: Date) {
  const ms = 86400000;
  return Math.round(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / ms
  );
}

function daysSinceStart(date: Date, startDate: Date) {
  return daysBetween(startDate, date);
}

function toDay(s: string) {
  const d = new Date(s);
  d.setHours(0, 0, 0, 0);
  return d;
}

function taskEnd(task: Task) {
  const start = toDay(task.createdAt);
  if (task.dueDate) return toDay(task.dueDate);
  const end = new Date(start);
  end.setDate(end.getDate() + DEFAULT_DAYS);
  return end;
}

async function fetchAllTasks() {
  const all: Task[] = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const { data } = await taskApi.getHistory({ page });
    all.push(...data.tasks);
    totalPages = data.totalPages;
    page++;
  }
  return all;
}

export function GanttPage() {
  const { t, lang, dateLocale } = useLang();
  const he = lang === 'he';
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState<Zoom>('2weeks');
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  useEffect(() => {
    setLoading(true);
    fetchAllTasks().then(setTasks).catch(() => toast.error(he ? 'שגיאה בטעינת משימות' : 'Failed to load tasks')).finally(() => setLoading(false));
  }, []);

  const dayWidth = ZOOM_PX[zoom];
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  const { rangeStart, totalDays, todayOffset } = useMemo(() => {
    if (!tasks.length) {
      const end = new Date(today);
      end.setDate(end.getDate() + 14);
      return { rangeStart: today, totalDays: 15, todayOffset: 0 };
    }
    let min = toDay(tasks[0].createdAt);
    let max = taskEnd(tasks[0]);
    tasks.forEach((tk) => {
      const s = toDay(tk.createdAt);
      const e = taskEnd(tk);
      if (s < min) min = s;
      if (e > max) max = e;
    });
    const start = new Date(min);
    start.setDate(start.getDate() - 2);
    const end = new Date(max);
    end.setDate(end.getDate() + 2);
    return { rangeStart: start, totalDays: daysBetween(start, end) + 1, todayOffset: daysSinceStart(today, start) };
  }, [tasks, today]);

  const timelineW = totalDays * dayWidth;
  const labelStep = zoom === 'week' ? 1 : zoom === '2weeks' ? 2 : 7;
  const fmtDay = useCallback(
    (d: Date) => new Intl.DateTimeFormat(dateLocale, { day: 'numeric', month: 'short' }).format(d),
    [dateLocale]
  );

  const dates = useMemo(
    () => Array.from({ length: totalDays }, (_, i) => { const d = new Date(rangeStart); d.setDate(d.getDate() + i); return d; }),
    [rangeStart, totalDays]
  );

  const syncScroll = (from: 'left' | 'right') => {
    if (syncing.current) return;
    syncing.current = true;
    const src = from === 'left' ? leftRef.current : rightRef.current;
    const dst = from === 'left' ? rightRef.current : leftRef.current;
    if (src && dst) dst.scrollTop = src.scrollTop;
    syncing.current = false;
  };

  const zoomLevels: { key: Zoom; label: string }[] = [
    { key: 'week', label: he ? 'שבוע' : 'Week' },
    { key: '2weeks', label: he ? 'שבועיים' : '2 Weeks' },
    { key: 'month', label: he ? 'חודש' : 'Month' },
  ];

  return (
    <div className="max-w-full mx-auto p-4 lg:p-8 flex flex-col h-[calc(100vh-4rem)]">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="shrink-0 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <GanttChart className="w-7 h-7 text-primary-500" />
              {he ? 'ציר זמן' : 'Timeline'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">{tasks.length} {he ? 'משימות' : 'tasks'}</p>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <ZoomIn className="w-4 h-4 text-slate-400 mx-1" />
            {zoomLevels.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setZoom(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  zoom === key ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
            <ZoomOut className="w-4 h-4 text-slate-400 mx-1" />
          </div>
        </div>
      </motion.div>

      <div className="card flex-1 flex overflow-hidden min-h-0">
        {loading ? (
          <PageSpinner />
        ) : (
          <>
            <div
              ref={leftRef}
              onScroll={() => syncScroll('left')}
              className="shrink-0 border-e border-slate-200 dark:border-slate-700 overflow-y-auto overflow-x-hidden bg-slate-50 dark:bg-slate-900/50"
              style={{ width: LEFT_W }}
            >
              <div className="h-10 border-b border-slate-200 dark:border-slate-700 flex items-center px-3 text-xs font-medium text-slate-500 sticky top-0 bg-slate-50 dark:bg-slate-900/50 z-10">
                {he ? 'משימה' : 'Task'}
              </div>
              {tasks.map((task) => (
                <div key={task.id} style={{ height: ROW_H }} className="flex items-center px-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-sm text-slate-800 dark:text-slate-200 truncate" title={task.title}>{task.title}</span>
                </div>
              ))}
            </div>

            <div ref={rightRef} onScroll={() => syncScroll('right')} className="flex-1 overflow-auto">
              <div style={{ width: timelineW, minWidth: '100%' }}>
                <div className="h-10 border-b border-slate-200 dark:border-slate-700 flex sticky top-0 bg-white dark:bg-slate-800 z-10">
                  {dates.map((d, i) => (
                    <div
                      key={i}
                      style={{ width: dayWidth }}
                      className={`shrink-0 flex items-center justify-center text-[10px] text-slate-500 border-e border-slate-100 dark:border-slate-700/50 ${
                        i % labelStep === 0 ? '' : 'opacity-0'
                      }`}
                    >
                      {i % labelStep === 0 && fmtDay(d)}
                    </div>
                  ))}
                </div>

                <div className="relative">
                  {todayOffset >= 0 && todayOffset < totalDays && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                      style={{ left: todayOffset * dayWidth + dayWidth / 2 }}
                      title={t.chat.today}
                    >
                      <div className="absolute -top-0 -translate-x-1/2 bg-red-500 text-white text-[9px] px-1 rounded-b flex items-center gap-0.5">
                        <Calendar className="w-2.5 h-2.5" />
                      </div>
                    </div>
                  )}

                  {tasks.map((task) => {
                    const start = toDay(task.createdAt);
                    const end = taskEnd(task);
                    const left = daysSinceStart(start, rangeStart) * dayWidth;
                    const width = Math.max(daysBetween(start, end), 1) * dayWidth;
                    return (
                      <div key={task.id} style={{ height: ROW_H }} className="relative border-b border-slate-100 dark:border-slate-800">
                        <div className="absolute inset-0 flex">
                          {dates.map((_, i) => (
                            <div key={i} style={{ width: dayWidth }} className="shrink-0 border-e border-slate-50 dark:border-slate-800/50" />
                          ))}
                        </div>
                        <motion.div
                          initial={{ scaleX: 0, opacity: 0 }}
                          animate={{ scaleX: 1, opacity: 1 }}
                          style={{ left, width, height: ROW_H - 12, top: 6, originX: 0 }}
                          className={`absolute rounded-md ${STATUS_BAR[task.status]} shadow-sm`}
                          title={`${task.title} (${fmtDay(start)} – ${fmtDay(end)})`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
