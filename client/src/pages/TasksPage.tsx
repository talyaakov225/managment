import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, ChevronDown, Calendar, Flag, FolderOpen,
  Clock, X, MessageSquare, CheckCircle2, AlertCircle, Users,
} from 'lucide-react';
import { taskApi, projectApi } from '../services/api';
import { useLang } from '../context/LangContext';
import { Avatar } from '../components/Avatar';
import type { Task, Project, TaskPriority, TaskStatus } from '../types';

const priorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];

const STATUS_INFO: Record<TaskStatus, { color: string; label_he: string; label_en: string }> = {
  TODO: { color: '#94a3b8', label_he: 'לביצוע', label_en: 'To Do' },
  IN_PROGRESS: { color: '#3b82f6', label_he: 'בתהליך', label_en: 'In Progress' },
  REVIEW: { color: '#f59e0b', label_he: 'בבדיקה', label_en: 'Review' },
  DONE: { color: '#10b981', label_he: 'הושלם', label_en: 'Done' },
};

const PRIORITY_INFO: Record<TaskPriority, { color: string; label_he: string; label_en: string }> = {
  LOW: { color: '#94a3b8', label_he: 'נמוכה', label_en: 'Low' },
  MEDIUM: { color: '#3b82f6', label_he: 'בינונית', label_en: 'Medium' },
  HIGH: { color: '#f97316', label_he: 'גבוהה', label_en: 'High' },
  URGENT: { color: '#ef4444', label_he: 'דחוף', label_en: 'Urgent' },
};

export function TasksPage() {
  const { t, isRTL, lang } = useLang();
  const navigate = useNavigate();
  const he = lang === 'he';
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [groupBy, setGroupBy] = useState<'project' | 'status' | 'priority' | 'none'>('project');

  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    projectId: '',
    search: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { loadProjects(); }, []);
  useEffect(() => { loadTasks(); }, [page, filters]);

  async function loadProjects() {
    try {
      const { data } = await projectApi.getAll();
      setProjects(data);
    } catch { /* */ }
  }

  async function loadTasks() {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, tab: 'active' };
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.projectId) params.projectId = filters.projectId;
      if (filters.search) params.search = filters.search;
      const { data } = await taskApi.getHistory(params);
      setTasks(data.tasks);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch { /* */ }
    setLoading(false);
  }

  const clearFilters = () => { setFilters({ status: '', priority: '', projectId: '', search: '' }); setPage(1); };
  const hasFilters = filters.status || filters.priority || filters.projectId || filters.search;

  function groupTasks(): { label: string; tasks: Task[]; color?: string }[] {
    if (groupBy === 'none') return [{ label: '', tasks }];

    if (groupBy === 'project') {
      const map = new Map<string, Task[]>();
      tasks.forEach(task => {
        const key = task.project?.name || (he ? 'ללא פרויקט' : 'No Project');
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(task);
      });
      return Array.from(map.entries()).map(([label, tasks]) => ({ label, tasks }));
    }

    if (groupBy === 'status') {
      return STATUSES.map(s => ({
        label: he ? STATUS_INFO[s].label_he : STATUS_INFO[s].label_en,
        color: STATUS_INFO[s].color,
        tasks: tasks.filter(t => t.status === s),
      })).filter(g => g.tasks.length > 0);
    }

    if (groupBy === 'priority') {
      return priorities.map(p => ({
        label: he ? PRIORITY_INFO[p].label_he : PRIORITY_INFO[p].label_en,
        color: PRIORITY_INFO[p].color,
        tasks: tasks.filter(t => t.priority === p),
      })).filter(g => g.tasks.length > 0);
    }

    return [{ label: '', tasks }];
  }

  const isOverdue = (task: Task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';

  const groups = groupTasks();

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {he ? 'משימות' : 'Tasks'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {he ? `${total} משימות פעילות` : `${total} active tasks`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              className="input ps-9 pe-4 py-2 text-sm w-64"
              placeholder={he ? 'חיפוש משימות...' : 'Search tasks...'}
              value={filters.search}
              onChange={(e) => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-ghost p-2.5 rounded-xl relative ${hasFilters ? 'text-primary-600 bg-primary-50 dark:bg-primary-950/30' : ''}`}
          >
            <Filter className="w-4 h-4" />
            {hasFilters && <span className="absolute -top-0.5 -end-0.5 w-2 h-2 bg-primary-500 rounded-full" />}
          </button>

          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}
            className="input py-2 text-sm"
          >
            <option value="project">{he ? 'לפי פרויקט' : 'By Project'}</option>
            <option value="status">{he ? 'לפי סטטוס' : 'By Status'}</option>
            <option value="priority">{he ? 'לפי עדיפות' : 'By Priority'}</option>
            <option value="none">{he ? 'רשימה רגילה' : 'Flat List'}</option>
          </select>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="card p-4 flex flex-wrap items-center gap-3">
              <select className="input py-2 text-sm" value={filters.status}
                onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}>
                <option value="">{he ? 'כל הסטטוסים' : 'All Statuses'}</option>
                {STATUSES.map(s => (
                  <option key={s} value={s}>{he ? STATUS_INFO[s].label_he : STATUS_INFO[s].label_en}</option>
                ))}
              </select>

              <select className="input py-2 text-sm" value={filters.priority}
                onChange={(e) => { setFilters(f => ({ ...f, priority: e.target.value })); setPage(1); }}>
                <option value="">{he ? 'כל העדיפויות' : 'All Priorities'}</option>
                {priorities.map(p => (
                  <option key={p} value={p}>{he ? PRIORITY_INFO[p].label_he : PRIORITY_INFO[p].label_en}</option>
                ))}
              </select>

              <select className="input py-2 text-sm" value={filters.projectId}
                onChange={(e) => { setFilters(f => ({ ...f, projectId: e.target.value })); setPage(1); }}>
                <option value="">{he ? 'כל הפרויקטים' : 'All Projects'}</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {hasFilters && (
                <button onClick={clearFilters} className="btn-ghost text-sm px-3 py-2 text-red-500">
                  <X className="w-4 h-4 me-1" />
                  {he ? 'נקה' : 'Clear'}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-2" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
            {he ? 'אין משימות להצגה' : 'No tasks to display'}
          </p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
            {he ? 'צרו משימות חדשות דרך הפרויקטים' : 'Create new tasks through projects'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <div className="flex items-center gap-2 mb-3">
                  {groupBy === 'project' && <FolderOpen className="w-4 h-4 text-primary-500" />}
                  {groupBy === 'status' && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />}
                  {groupBy === 'priority' && <Flag className="w-4 h-4" style={{ color: group.color }} />}
                  <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {group.label}
                  </h2>
                  <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {group.tasks.length}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                {group.tasks.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    onClick={() => navigate(`/projects/${task.projectId}`)}
                    className="card p-4 hover:shadow-md transition-all cursor-pointer border-s-4 group"
                    style={{ borderColor: task.color || STATUS_INFO[task.status]?.color || '#94a3b8' }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-slate-900 dark:text-white truncate group-hover:text-primary-600 transition-colors">
                            {task.title}
                          </h3>
                          {isOverdue(task) && (
                            <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                              <AlertCircle className="w-3 h-3" />
                              {he ? 'באיחור' : 'Overdue'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-white font-medium"
                            style={{ backgroundColor: STATUS_INFO[task.status]?.color }}>
                            {he ? STATUS_INFO[task.status]?.label_he : STATUS_INFO[task.status]?.label_en}
                          </span>

                          <span className="flex items-center gap-1">
                            <Flag className="w-3 h-3" style={{ color: PRIORITY_INFO[task.priority]?.color }} />
                            {he ? PRIORITY_INFO[task.priority]?.label_he : PRIORITY_INFO[task.priority]?.label_en}
                          </span>

                          {groupBy !== 'project' && task.project && (
                            <span className="flex items-center gap-1">
                              <FolderOpen className="w-3 h-3" />
                              {task.project.name}
                            </span>
                          )}

                          {task.dueDate && (
                            <span className={`flex items-center gap-1 ${isOverdue(task) ? 'text-red-500 font-medium' : ''}`}>
                              <Calendar className="w-3 h-3" />
                              {new Date(task.dueDate).toLocaleDateString(he ? 'he-IL' : 'en-US')}
                            </span>
                          )}

                          {task._count && task._count.comments > 0 && (
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {task._count.comments}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {task.assignees && task.assignees.length > 0 && (
                          <div className="flex -space-x-2 rtl:space-x-reverse">
                            {task.assignees.slice(0, 3).map((a) => (
                              <Avatar key={a.userId} name={a.user.name} avatar={a.user.avatar} size="sm" />
                            ))}
                            {task.assignees.length > 3 && (
                              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-600 dark:text-slate-300 border-2 border-white dark:border-slate-900">
                                +{task.assignees.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="btn-ghost p-2 disabled:opacity-40">
            {isRTL ? <ChevronDown className="w-5 h-5 -rotate-90" /> : <ChevronDown className="w-5 h-5 rotate-90" />}
          </button>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {page} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="btn-ghost p-2 disabled:opacity-40">
            {isRTL ? <ChevronDown className="w-5 h-5 rotate-90" /> : <ChevronDown className="w-5 h-5 -rotate-90" />}
          </button>
        </div>
      )}
    </div>
  );
}
