import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Filter, ChevronLeft, ChevronRight,
  Calendar, User, Flag, FolderOpen, Clock, X,
  MessageSquare, CheckCircle2, Trash2, ListTodo, AlarmClock, Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageSpinner } from '../components/Skeleton';
import { Modal } from '../components/Modal';
import { ReminderForm } from '../components/ReminderPanel';
import { taskApi, projectApi, reminderApi, type ReminderItem } from '../services/api';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { useLang } from '../context/LangContext';
import { Avatar } from '../components/Avatar';
import { RichTextViewer } from '../components/RichTextEditor';
import type { Task, Project, TaskPriority } from '../types';
import { STATUS_STYLE, PRIORITY_STYLE, STATUSES } from '../types';

const priorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

type HistoryTab = 'all' | 'active' | 'completed' | 'deleted' | 'reminders';

export function HistoryPage() {
  const { t, isRTL, dateLocale, lang } = useLang();
  const he = lang === 'he';
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<HistoryTab>('all');

  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [editReminder, setEditReminder] = useState<ReminderItem | null>(null);
  const [rTitle, setRTitle] = useState('');
  const [rContent, setRContent] = useState('');
  const [rColor, setRColor] = useState('#3b82f6');
  const [rDate, setRDate] = useState('');
  const [rTime, setRTime] = useState('');
  const [rSaving, setRSaving] = useState(false);

  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    projectId: '',
    search: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    projectApi.getAll().then((res) => setProjects(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'reminders') {
      loadReminders();
    } else {
      load();
    }
  }, [page, filters, activeTab]);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, tab: activeTab };
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.projectId) params.projectId = filters.projectId;
      if (filters.search) params.search = filters.search;

      const { data } = await taskApi.getHistory(params as any);
      setTasks(data.tasks);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } finally { setLoading(false); }
  }

  async function loadReminders() {
    setLoadingReminders(true);
    try {
      const { data } = await reminderApi.getAll();
      setReminders(data);
    } catch { /* silent */ }
    finally { setLoadingReminders(false); }
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

  async function saveReminderEdit() {
    if (!editReminder || !rTitle.trim() || !rDate || !rTime) return;
    setRSaving(true);
    try {
      const triggerAt = new Date(`${rDate}T${rTime}`).toISOString();
      const { data } = await reminderApi.update(editReminder.id, {
        title: rTitle.trim(), content: rContent.trim() || undefined, color: rColor, triggerAt,
      });
      setReminders((prev) => prev.map((r) => r.id === data.id ? data : r));
      setEditReminder(null);
      toast.success(he ? 'תזכורת עודכנה' : 'Reminder updated');
    } catch {
      toast.error(he ? 'שגיאה בעדכון תזכורת' : 'Failed to update reminder');
    } finally { setRSaving(false); }
  }

  async function silentRefresh() {
    try {
      if (activeTab === 'reminders') {
        const { data } = await reminderApi.getAll();
        setReminders(data);
      } else {
        const params: Record<string, string | number> = { page, tab: activeTab };
        if (filters.status) params.status = filters.status;
        if (filters.priority) params.priority = filters.priority;
        if (filters.projectId) params.projectId = filters.projectId;
        if (filters.search) params.search = filters.search;
        const { data } = await taskApi.getHistory(params as any);
        setTasks(data.tasks);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch { /* silent */ }
  }

  useLiveRefresh(silentRefresh, 8000, !loading && !loadingReminders);

  function clearFilters() {
    setFilters({ status: '', priority: '', projectId: '', search: '' });
    setPage(1);
  }

  function switchTab(tab: HistoryTab) {
    setActiveTab(tab);
    setPage(1);
    setExpandedTask(null);
  }

  const hasActiveFilters = filters.status || filters.priority || filters.projectId || filters.search;

  const tabs: { key: HistoryTab; label: string; icon: React.ElementType }[] = [
    { key: 'all', label: he ? 'הכל' : 'All', icon: ListTodo },
    { key: 'active', label: he ? 'פעילות' : 'Active', icon: Clock },
    { key: 'completed', label: he ? 'הושלמו' : 'Completed', icon: CheckCircle2 },
    { key: 'deleted', label: he ? 'נמחקו' : 'Deleted', icon: Trash2 },
    { key: 'reminders', label: he ? 'תזכורות' : 'Reminders', icon: AlarmClock },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Clock className="w-7 h-7 text-primary-500" />
              {t.history.title}
            </h1>
            {activeTab !== 'reminders' && (
              <p className="text-sm text-slate-500 mt-1">{total} {t.history.tasksFound}</p>
            )}
          </div>
          {activeTab !== 'reminders' && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary flex items-center gap-2 ${showFilters ? 'ring-2 ring-primary-300' : ''}`}
            >
              <Filter className="w-4 h-4" />
              {t.history.filters}
              {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-primary-500" />}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-slate-900 text-primary-700 dark:text-primary-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters (tasks only) */}
        {activeTab !== 'reminders' && showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card p-5 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t.history.filterBy}</h3>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
                  <X className="w-3 h-3" /> {t.history.clearFilters}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-slate-500 mb-1.5">
                  <Search className="w-3.5 h-3.5" /> {t.history.search}
                </label>
                <input type="text" className="input text-sm" placeholder={t.history.searchPlaceholder}
                  value={filters.search}
                  onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value })); setPage(1); }} />
              </div>
              {activeTab !== 'completed' && activeTab !== 'deleted' && (
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-slate-500 mb-1.5">
                    <Flag className="w-3.5 h-3.5" /> {t.task.status}
                  </label>
                  <select className="input text-sm" value={filters.status}
                    onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPage(1); }}>
                    <option value="">{t.history.allStatuses}</option>
                    {STATUSES.map((s) => <option key={s} value={s}>{t.status[s]}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-slate-500 mb-1.5">
                  <Flag className="w-3.5 h-3.5" /> {t.task.priority}
                </label>
                <select className="input text-sm" value={filters.priority}
                  onChange={(e) => { setFilters((f) => ({ ...f, priority: e.target.value })); setPage(1); }}>
                  <option value="">{t.history.allPriorities}</option>
                  {priorities.map((p) => <option key={p} value={p}>{t.priority[p]}</option>)}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-slate-500 mb-1.5">
                  <FolderOpen className="w-3.5 h-3.5" /> {t.history.project}
                </label>
                <select className="input text-sm" value={filters.projectId}
                  onChange={(e) => { setFilters((f) => ({ ...f, projectId: e.target.value })); setPage(1); }}>
                  <option value="">{t.history.allProjects}</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Reminders Tab ── */}
        {activeTab === 'reminders' ? (
          loadingReminders ? (
            <PageSpinner />
          ) : reminders.length === 0 ? (
            <div className="card p-12 text-center">
              <AlarmClock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {he ? 'אין תזכורות' : 'No reminders'}
              </h3>
              <p className="text-sm text-slate-500">
                {he ? 'תזכורות שתיצור יופיעו כאן' : 'Reminders you create will appear here'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {reminders.map((r, idx) => {
                const dt = new Date(r.triggerAt);
                const isPast = dt < new Date();
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className={`card p-4 flex items-start gap-4 ${r.dismissed ? 'opacity-50' : ''}`}
                  >
                    <div className="w-3 h-3 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: r.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white">{r.title}</p>
                      {r.content && <p className="text-sm text-slate-500 mt-0.5">{r.content}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {dt.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {dt.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.dismissed ? (
                        <span className="text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400">
                          {he ? 'נסגרה' : 'Dismissed'}
                        </span>
                      ) : isPast ? (
                        <span className="text-xs px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 font-medium">
                          {he ? 'הגיע הזמן' : 'Due'}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-600 font-medium">
                          {he ? 'ממתינה' : 'Pending'}
                        </span>
                      )}
                      <button
                        onClick={() => openReminderEdit(r)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title={he ? 'ערוך' : 'Edit'}
                      >
                        <Pencil className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                      <button
                        onClick={async () => {
                          await reminderApi.delete(r.id);
                          setReminders((prev) => prev.filter((rem) => rem.id !== r.id));
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )
        ) : (
          /* ── Tasks Tabs ── */
          <>
            {loading ? (
              <PageSpinner />
            ) : tasks.length === 0 ? (
              <div className="card p-12 text-center">
                {activeTab === 'deleted' ? (
                  <Trash2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                ) : (
                  <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                )}
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {activeTab === 'deleted'
                    ? (he ? 'אין משימות שנמחקו' : 'No deleted tasks')
                    : t.history.noTasks}
                </h3>
                <p className="text-sm text-slate-500">
                  {activeTab === 'deleted'
                    ? (he ? 'משימות שתמחק יישמרו כאן' : 'Deleted tasks will be kept here')
                    : t.history.noTasksDesc}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task, idx) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className={`card overflow-hidden ${activeTab === 'deleted' ? 'border-red-200 dark:border-red-900/30' : ''}`}
                  >
                    <div
                      className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                    >
                      <div className={`w-3 h-3 rounded-full shrink-0 ${
                        activeTab === 'deleted' ? 'bg-red-400' : (STATUS_STYLE[task.status]?.dotColor || 'bg-slate-400')
                      }`} />

                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-slate-900 dark:text-white truncate ${activeTab === 'deleted' ? 'line-through opacity-70' : ''}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                          {task.project && <span className="flex items-center gap-1"><FolderOpen className="w-3 h-3" />{task.project.name}</span>}
                          {task.assignees && task.assignees.length > 0 && (
                            <span className="flex items-center gap-1"><User className="w-3 h-3" />{task.assignees.map((a) => a.user.name).join(', ')}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(task.updatedAt).toLocaleDateString(dateLocale)}
                          </span>
                          {activeTab === 'deleted' && (task as any).deletedAt && (
                            <span className="flex items-center gap-1 text-red-400">
                              <Trash2 className="w-3 h-3" />
                              {he ? 'נמחק' : 'Deleted'} {new Date((task as any).deletedAt).toLocaleDateString(dateLocale)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                          activeTab === 'deleted'
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-500'
                            : `${STATUS_STYLE[task.status]?.bgColor || ''} ${STATUS_STYLE[task.status]?.color || ''}`
                        }`}>
                          {activeTab === 'deleted' ? (he ? 'נמחק' : 'Deleted') : t.status[task.status]}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${PRIORITY_STYLE[task.priority]?.dotColor || 'bg-slate-400'}`} />
                          <span className="text-xs text-slate-500">{t.priority[task.priority]}</span>
                        </div>
                        {task._count?.comments > 0 && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> {task._count.comments}
                          </span>
                        )}
                      </div>
                    </div>

                    {expandedTask === task.id && task.description && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/30"
                      >
                        <RichTextViewer content={task.description} />
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                  className="btn-secondary p-2 disabled:opacity-40">
                  {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
                <span className="text-sm text-slate-500">{t.history.page} {page} / {totalPages}</span>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                  className="btn-secondary p-2 disabled:opacity-40">
                  {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>

      <Modal isOpen={!!editReminder} onClose={() => setEditReminder(null)}
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
          onCancel={() => setEditReminder(null)}
        />
      </Modal>
    </div>
  );
}
