import { useState, useEffect, useCallback, type ReactNode, type DragEvent } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ListTodo, Clock, CheckCircle2, Eye, TrendingUp,
  Calendar, ArrowRight, ArrowLeft, FolderKanban,
  Activity, Users, AlertTriangle, Settings as SettingsIcon,
  GripVertical, BarChart3,
} from 'lucide-react';
import { taskApi } from '../services/api';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { SkeletonDashboard } from '../components/Skeleton';
import { Modal } from '../components/Modal';
import type { DashboardStats, Project, Task } from '../types';
import { PRIORITY_STYLE, STATUS_STYLE } from '../types';

const STORAGE_KEY = 'dashboard_widgets';

type WidgetId = 'stats' | 'progress' | 'upcoming' | 'recent' | 'chart' | 'activity';

interface WidgetDef {
  id: WidgetId;
  labelHe: string;
  labelEn: string;
  defaultVisible: boolean;
}

interface WidgetConfigEntry {
  id: WidgetId;
  visible: boolean;
}

const WIDGET_DEFS: WidgetDef[] = [
  { id: 'stats', labelHe: 'סטטיסטיקות משימות', labelEn: 'Task Statistics', defaultVisible: true },
  { id: 'progress', labelHe: 'התקדמות כללית', labelEn: 'Overall Progress', defaultVisible: true },
  { id: 'upcoming', labelHe: 'מועדים קרובים', labelEn: 'Upcoming Deadlines', defaultVisible: true },
  { id: 'recent', labelHe: 'משימות אחרונות', labelEn: 'Recent Tasks', defaultVisible: true },
  { id: 'chart', labelHe: 'התפלגות משימות', labelEn: 'Task Distribution', defaultVisible: true },
  { id: 'activity', labelHe: 'פעילות אחרונה', labelEn: 'Recent Activity', defaultVisible: true },
];

function defaultWidgetConfig(): WidgetConfigEntry[] {
  return WIDGET_DEFS.map((w) => ({ id: w.id, visible: w.defaultVisible }));
}

function loadWidgetConfig(): WidgetConfigEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultWidgetConfig();
    const parsed = JSON.parse(raw) as WidgetConfigEntry[];
    if (!Array.isArray(parsed)) return defaultWidgetConfig();

    const knownIds = new Set(WIDGET_DEFS.map((w) => w.id));
    const valid = parsed.filter((e) => knownIds.has(e.id));
    const savedIds = new Set(valid.map((e) => e.id));

    for (const def of WIDGET_DEFS) {
      if (!savedIds.has(def.id)) {
        valid.push({ id: def.id, visible: def.defaultVisible });
      }
    }
    return valid.length > 0 ? valid : defaultWidgetConfig();
  } catch {
    return defaultWidgetConfig();
  }
}

function saveWidgetConfig(config: WidgetConfigEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function reorderVisibleWidgets(
  config: WidgetConfigEntry[],
  fromVisibleIdx: number,
  toVisibleIdx: number,
): WidgetConfigEntry[] {
  const visibleEntries = config.filter((w) => w.visible);
  if (fromVisibleIdx < 0 || toVisibleIdx < 0 || fromVisibleIdx >= visibleEntries.length || toVisibleIdx >= visibleEntries.length) {
    return config;
  }
  const reordered = [...visibleEntries];
  const [moved] = reordered.splice(fromVisibleIdx, 1);
  reordered.splice(toVisibleIdx, 0, moved);

  let vi = 0;
  return config.map((w) => (w.visible ? reordered[vi++]! : w));
}

function reorderAllWidgets(
  config: WidgetConfigEntry[],
  fromIdx: number,
  toIdx: number,
): WidgetConfigEntry[] {
  if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= config.length || toIdx >= config.length) {
    return config;
  }
  const next = [...config];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved!);
  return next;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

interface WidgetCardProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  draggable?: boolean;
  isDragOver?: boolean;
  onDragHandleStart?: (e: DragEvent) => void;
  onDragOver?: (e: DragEvent) => void;
  onDrop?: (e: DragEvent) => void;
  onDragEnd?: () => void;
}

function WidgetCard({
  title,
  icon,
  children,
  draggable,
  isDragOver,
  onDragHandleStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: WidgetCardProps) {
  return (
    <motion.div
      variants={itemVariants}
      className={`card overflow-hidden transition-shadow ${isDragOver ? 'ring-2 ring-primary-400 ring-offset-2 dark:ring-offset-slate-900' : ''}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
        {draggable && (
          <div
            draggable
            onDragStart={onDragHandleStart}
            onDragEnd={onDragEnd}
            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 touch-none"
            aria-hidden
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )}
        {icon}
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex-1">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </motion.div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { t, isRTL, dateLocale } = useLang();
  const { projects } = useOutletContext<{ projects: Project[] }>();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfigEntry[]>(loadWidgetConfig);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dashDragIdx, setDashDragIdx] = useState<number | null>(null);
  const [dashDropIdx, setDashDropIdx] = useState<number | null>(null);
  const [modalDragIdx, setModalDragIdx] = useState<number | null>(null);
  const [modalDropIdx, setModalDropIdx] = useState<number | null>(null);

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const widgetLabel = useCallback(
    (id: WidgetId) => {
      const def = WIDGET_DEFS.find((w) => w.id === id)!;
      return isRTL ? def.labelHe : def.labelEn;
    },
    [isRTL],
  );

  const updateConfig = useCallback((next: WidgetConfigEntry[]) => {
    setWidgetConfig(next);
    saveWidgetConfig(next);
  }, []);

  useEffect(() => {
    taskApi
      .getDashboard()
      .then((res) => setData(res.data))
      .catch(() => toast.error(isRTL ? 'שגיאה בטעינת הנתונים' : 'Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  useLiveRefresh(() => {
    taskApi.getDashboard().then((res) => setData(res.data)).catch(() => {});
  }, 8000, !loading);

  if (loading) {
    return <SkeletonDashboard />;
  }

  const stats = data?.stats ?? { total: 0, todo: 0, inProgress: 0, review: 0, done: 0 };
  const completionRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  const overdueCount = data?.upcoming?.filter((task) => task.dueDate && new Date(task.dueDate) < new Date()).length || 0;

  const statCards = [
    { label: t.dashboard.todo, value: stats.todo, icon: ListTodo, gradient: 'from-slate-500 to-slate-600', lightBg: 'bg-slate-50 dark:bg-slate-800/50' },
    { label: t.dashboard.inProgress, value: stats.inProgress, icon: Clock, gradient: 'from-blue-500 to-blue-600', lightBg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: t.dashboard.inReview, value: stats.review, icon: Eye, gradient: 'from-amber-500 to-amber-600', lightBg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: t.dashboard.completed, value: stats.done, icon: CheckCircle2, gradient: 'from-emerald-500 to-emerald-600', lightBg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  ];

  const chartBars = [
    { label: t.dashboard.todo, value: stats.todo, color: 'bg-slate-400 dark:bg-slate-500' },
    { label: t.dashboard.inProgress, value: stats.inProgress, color: 'bg-blue-500' },
    { label: t.dashboard.inReview, value: stats.review, color: 'bg-amber-500' },
    { label: t.dashboard.completed, value: stats.done, color: 'bg-emerald-500' },
  ];
  const chartMax = Math.max(...chartBars.map((b) => b.value), 1);

  const now = new Date();
  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return isRTL ? 'בוקר טוב' : 'Good morning';
    if (h < 17) return isRTL ? 'צהריים טובים' : 'Good afternoon';
    return isRTL ? 'ערב טוב' : 'Good evening';
  })();

  const visibleWidgets = widgetConfig.filter((w) => w.visible);

  const activityText = (task: Task) => {
    const statusLabels: Record<string, string> = {
      TODO: t.dashboard.todo,
      IN_PROGRESS: t.dashboard.inProgress,
      REVIEW: t.dashboard.inReview,
      DONE: t.dashboard.completed,
    };
    const status = statusLabels[task.status] ?? task.status;
    if (task.status === 'DONE') {
      return isRTL ? `הושלמה "${task.title}"` : `Completed "${task.title}"`;
    }
    return isRTL ? `עודכנה "${task.title}" — ${status}` : `Updated "${task.title}" — ${status}`;
  };

  const handleDashDragStart = (visibleIdx: number) => (e: DragEvent) => {
    setDashDragIdx(visibleIdx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(visibleIdx));
  };

  const handleDashDragOver = (visibleIdx: number) => (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDashDropIdx(visibleIdx);
  };

  const handleDashDrop = (visibleIdx: number) => (e: DragEvent) => {
    e.preventDefault();
    if (dashDragIdx !== null && dashDragIdx !== visibleIdx) {
      updateConfig(reorderVisibleWidgets(widgetConfig, dashDragIdx, visibleIdx));
    }
    setDashDragIdx(null);
    setDashDropIdx(null);
  };

  const handleDashDragEnd = () => {
    setDashDragIdx(null);
    setDashDropIdx(null);
  };

  const handleModalDragStart = (idx: number) => (e: DragEvent) => {
    setModalDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleModalDragOver = (idx: number) => (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setModalDropIdx(idx);
  };

  const handleModalDrop = (idx: number) => (e: DragEvent) => {
    e.preventDefault();
    if (modalDragIdx !== null && modalDragIdx !== idx) {
      updateConfig(reorderAllWidgets(widgetConfig, modalDragIdx, idx));
    }
    setModalDragIdx(null);
    setModalDropIdx(null);
  };

  const handleModalDragEnd = () => {
    setModalDragIdx(null);
    setModalDropIdx(null);
  };

  const toggleWidgetVisibility = (id: WidgetId) => {
    updateConfig(widgetConfig.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)));
  };

  const renderWidget = (id: WidgetId, visibleIdx: number) => {
    const dragProps = {
      draggable: true,
      isDragOver: dashDropIdx === visibleIdx && dashDragIdx !== visibleIdx,
      onDragHandleStart: handleDashDragStart(visibleIdx),
      onDragOver: handleDashDragOver(visibleIdx),
      onDrop: handleDashDrop(visibleIdx),
      onDragEnd: handleDashDragEnd,
    };

    switch (id) {
      case 'stats':
        return (
          <motion.div
            key={id}
            variants={itemVariants}
            className={`transition-shadow ${dragProps.isDragOver ? 'ring-2 ring-primary-400 ring-offset-2 dark:ring-offset-slate-900 rounded-2xl' : ''}`}
            onDragOver={dragProps.onDragOver}
            onDrop={dragProps.onDrop}
          >
            <div className="flex items-center gap-3 mb-4 px-1">
              <div
                draggable
                onDragStart={dragProps.onDragHandleStart}
                onDragEnd={dragProps.onDragEnd}
                className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <GripVertical className="w-4 h-4" />
              </div>
              <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-950/40 flex items-center justify-center">
                <ListTodo className="w-4 h-4 text-primary-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{widgetLabel('stats')}</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((stat) => (
                <div key={stat.label} className="card p-5 group hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl ${stat.lightBg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <stat.icon className={`w-5 h-5 bg-gradient-to-r ${stat.gradient} bg-clip-text`} style={{ color: stat.gradient.includes('slate') ? '#64748b' : stat.gradient.includes('blue') ? '#3b82f6' : stat.gradient.includes('amber') ? '#f59e0b' : '#10b981' }} />
                    </div>
                    {stats.total > 0 && (
                      <span className="text-xs text-slate-400 font-medium">
                        {Math.round((stat.value / stats.total) * 100)}%
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        );

      case 'progress':
        return (
          <WidgetCard
            key={id}
            title={widgetLabel('progress')}
            icon={
              <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-950/40 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary-600" />
              </div>
            }
            {...dragProps}
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-1">
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${completionRate}%` }}
                    transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
                  />
                </div>
              </div>
              <span className="text-2xl font-bold text-primary-600">{completionRate}%</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {stats.done} {t.dashboard.of} {stats.total} {t.dashboard.tasksCompleted}
            </p>
            {stats.total > 0 && (
              <div className="flex gap-0.5 mt-4 h-2 rounded-full overflow-hidden">
                {stats.done > 0 && <div className="bg-emerald-500" style={{ width: `${(stats.done / stats.total) * 100}%` }} />}
                {stats.review > 0 && <div className="bg-amber-500" style={{ width: `${(stats.review / stats.total) * 100}%` }} />}
                {stats.inProgress > 0 && <div className="bg-blue-500" style={{ width: `${(stats.inProgress / stats.total) * 100}%` }} />}
                {stats.todo > 0 && <div className="bg-slate-300 dark:bg-slate-700" style={{ width: `${(stats.todo / stats.total) * 100}%` }} />}
              </div>
            )}
            {stats.total > 0 && (
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 flex-wrap">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />{t.dashboard.completed}</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />{t.dashboard.inReview}</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" />{t.dashboard.inProgress}</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />{t.dashboard.todo}</span>
              </div>
            )}
          </WidgetCard>
        );

      case 'upcoming':
        return (
          <WidgetCard
            key={id}
            title={widgetLabel('upcoming')}
            icon={
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-amber-500" />
              </div>
            }
            {...dragProps}
          >
            {data?.upcoming && data.upcoming.length > 0 ? (
              <div className="space-y-2">
                {data.upcoming.map((task) => {
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                  return (
                    <div
                      key={task.id}
                      onClick={() => navigate(`/projects/${task.projectId}`)}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                        isOverdue
                          ? 'bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_STYLE[task.priority].dotColor}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{task.title}</p>
                        <p className="text-xs text-slate-500">{task.project?.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.assignees && task.assignees.length > 0 && (
                          <div className="flex -space-x-1 rtl:space-x-reverse">
                            {task.assignees.slice(0, 2).map((a) => (
                              <Avatar key={a.userId} name={a.user.name} size="sm" />
                            ))}
                            {task.assignees.length > 2 && (
                              <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center">+{task.assignees.length - 2}</span>
                            )}
                          </div>
                        )}
                        <span className={`text-xs whitespace-nowrap font-medium ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                          {task.dueDate && new Date(task.dueDate).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={Calendar}
                title={t.dashboard.noUpcoming}
                description={isRTL ? 'אין משימות קרובות כרגע' : 'No upcoming tasks right now'}
                compact
              />
            )}
          </WidgetCard>
        );

      case 'recent':
        return (
          <WidgetCard
            key={id}
            title={widgetLabel('recent')}
            icon={
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center">
                <Clock className="w-4 h-4 text-indigo-500" />
              </div>
            }
            {...dragProps}
          >
            {data?.recentTasks && data.recentTasks.length > 0 ? (
              <div className="space-y-2">
                {data.recentTasks.slice(0, 8).map((task) => (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/projects/${task.projectId}`)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_STYLE[task.status].dotColor}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{task.title}</p>
                      <p className="text-xs text-slate-500">{task.project?.name}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[task.status].bgColor} ${STATUS_STYLE[task.status].color}`}>
                      {task.status === 'TODO' ? t.dashboard.todo : task.status === 'IN_PROGRESS' ? t.dashboard.inProgress : task.status === 'REVIEW' ? t.dashboard.inReview : t.dashboard.completed}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ListTodo}
                title={isRTL ? 'אין משימות אחרונות' : 'No recent tasks'}
                description={isRTL ? 'משימות שעודכנו לאחרונה יופיעו כאן' : 'Recently updated tasks will appear here'}
                compact
              />
            )}
          </WidgetCard>
        );

      case 'chart':
        return (
          <WidgetCard
            key={id}
            title={widgetLabel('chart')}
            icon={
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-purple-500" />
              </div>
            }
            {...dragProps}
          >
            {stats.total > 0 ? (
              <div className="space-y-4">
                {chartBars.map((bar) => (
                  <div key={bar.label} className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 dark:text-slate-400 w-24 shrink-0 truncate">{bar.label}</span>
                    <div className="flex-1 h-7 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(bar.value / chartMax) * 100}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-lg ${bar.color} min-w-[2px]`}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 w-8 text-end">{bar.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">{isRTL ? 'אין נתונים להצגה' : 'No data to display'}</p>
            )}
          </WidgetCard>
        );

      case 'activity':
        return (
          <WidgetCard
            key={id}
            title={widgetLabel('activity')}
            icon={
              <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
                <Activity className="w-4 h-4 text-violet-500" />
              </div>
            }
            {...dragProps}
          >
            {data?.recentTasks && data.recentTasks.length > 0 ? (
              <div className="space-y-1">
                {data.recentTasks.slice(0, 10).map((task) => (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/projects/${task.projectId}`)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                      task.status === 'DONE' ? 'bg-emerald-500' : task.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-slate-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 dark:text-slate-300">{activityText(task)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{task.project?.name}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                      {new Date(task.updatedAt || task.createdAt).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">{isRTL ? 'אין פעילות אחרונה' : 'No recent activity'}</p>
            )}
          </WidgetCard>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <motion.div variants={containerVariants} initial="hidden" animate="show">
        {/* Greeting Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
                {greeting}, {user?.name?.split(' ')[0]} 👋
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                {now.toLocaleDateString(dateLocale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {overdueCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    {overdueCount} {isRTL ? 'משימות באיחור' : 'overdue tasks'}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="btn-ghost p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label={isRTL ? 'הגדרות לוח בקרה' : 'Dashboard settings'}
              >
                <SettingsIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {visibleWidgets.length > 0 ? (
              visibleWidgets.map((entry, visibleIdx) => renderWidget(entry.id, visibleIdx))
            ) : (
              <motion.div variants={itemVariants} className="card p-8 text-center">
                <SettingsIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400">
                  {isRTL ? 'כל הווידג\'טים מוסתרים. לחץ על ההגדרות כדי להפעיל אותם.' : 'All widgets are hidden. Click settings to enable them.'}
                </p>
              </motion.div>
            )}
          </div>

          {/* Right Column — fixed sidebar */}
          <div className="space-y-6">
            <motion.div variants={itemVariants} className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-950/40 flex items-center justify-center">
                    <FolderKanban className="w-4 h-4 text-primary-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t.nav.projects}</h2>
                </div>
                <span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">{projects.length}</span>
              </div>
              {projects.length > 0 ? (
                <div className="space-y-2">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{project.name}</p>
                        <p className="text-xs text-slate-500">{project._count.tasks} {t.common.tasks}</p>
                      </div>
                      <ArrowIcon className="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-colors shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={FolderKanban}
                  title={t.dashboard.noProjectsTitle}
                  description={t.dashboard.noProjectsDesc}
                  compact
                />
              )}
            </motion.div>

            <motion.div variants={itemVariants} className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-950/40 flex items-center justify-center">
                  <Users className="w-4 h-4 text-cyan-500" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {isRTL ? 'הצוות' : 'Team'}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {projects.slice(0, 1).flatMap((p) => p.members || []).filter((m, i, a) => a.findIndex((x) => x.userId === m.userId) === i).slice(0, 8).map((m) => (
                  <div key={m.userId} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <Avatar name={m.user.name} size="xs" />
                    <span className="text-xs text-slate-600 dark:text-slate-300">{m.user.name}</span>
                  </div>
                ))}
                {(projects.slice(0, 1).flatMap((p) => p.members || []).length === 0) && (
                  <p className="text-sm text-slate-400 text-center py-2 w-full">{isRTL ? 'אין חברי צוות עדיין' : 'No team members yet'}</p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <Modal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title={isRTL ? 'הגדרות לוח בקרה' : 'Dashboard Settings'}
        size="md"
      >
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          {isRTL ? 'גרור לשינוי סדר, סמן להצגה או הסתרה.' : 'Drag to reorder, toggle visibility on or off.'}
        </p>
        <div className="space-y-2">
          {widgetConfig.map((entry, idx) => (
            <div
              key={entry.id}
              onDragOver={handleModalDragOver(idx)}
              onDrop={handleModalDrop(idx)}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                modalDropIdx === idx && modalDragIdx !== idx
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-950/20'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
              }`}
            >
              <div
                draggable
                onDragStart={handleModalDragStart(idx)}
                onDragEnd={handleModalDragEnd}
                className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 touch-none"
              >
                <GripVertical className="w-4 h-4" />
              </div>
              <label className="flex items-center gap-3 flex-1 cursor-pointer min-w-0">
                <input
                  type="checkbox"
                  checked={entry.visible}
                  onChange={() => toggleWidgetVisibility(entry.id)}
                  className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span className={`text-sm font-medium truncate ${entry.visible ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                  {widgetLabel(entry.id)}
                </span>
              </label>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
