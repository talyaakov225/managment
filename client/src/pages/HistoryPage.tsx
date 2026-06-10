import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Filter, ChevronLeft, ChevronRight,
  Calendar, User, Flag, FolderOpen, Clock, X,
  MessageSquare,
} from 'lucide-react';
import { taskApi, projectApi } from '../services/api';
import { useLang } from '../context/LangContext';
import { Avatar } from '../components/Avatar';
import { RichTextViewer } from '../components/RichTextEditor';
import type { Task, Project, TaskStatus, TaskPriority } from '../types';
import { STATUS_STYLE, PRIORITY_STYLE, STATUSES } from '../types';

const priorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export function HistoryPage() {
  const { t, isRTL, dateLocale } = useLang();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

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

  useEffect(() => { load(); }, [page, filters]);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page };
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

  function clearFilters() {
    setFilters({ status: '', priority: '', projectId: '', search: '' });
    setPage(1);
  }

  const hasActiveFilters = filters.status || filters.priority || filters.projectId || filters.search;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Clock className="w-7 h-7 text-primary-500" />
              {t.history.title}
            </h1>
            <p className="text-sm text-slate-500 mt-1">{total} {t.history.tasksFound}</p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-2 ${showFilters ? 'ring-2 ring-primary-300' : ''}`}
          >
            <Filter className="w-4 h-4" />
            {t.history.filters}
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-primary-500" />
            )}
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
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
                <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                  <Search className="w-3.5 h-3.5" /> {t.history.search}
                </label>
                <input
                  type="text"
                  className="input text-sm"
                  placeholder={t.history.searchPlaceholder}
                  value={filters.search}
                  onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value })); setPage(1); }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                  <Flag className="w-3.5 h-3.5" /> {t.task.status}
                </label>
                <select
                  className="input text-sm"
                  value={filters.status}
                  onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPage(1); }}
                >
                  <option value="">{t.history.allStatuses}</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{t.status[s]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                  <Flag className="w-3.5 h-3.5" /> {t.task.priority}
                </label>
                <select
                  className="input text-sm"
                  value={filters.priority}
                  onChange={(e) => { setFilters((f) => ({ ...f, priority: e.target.value })); setPage(1); }}
                >
                  <option value="">{t.history.allPriorities}</option>
                  {priorities.map((p) => (
                    <option key={p} value={p}>{t.priority[p]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                  <FolderOpen className="w-3.5 h-3.5" /> {t.history.project}
                </label>
                <select
                  className="input text-sm"
                  value={filters.projectId}
                  onChange={(e) => { setFilters((f) => ({ ...f, projectId: e.target.value })); setPage(1); }}
                >
                  <option value="">{t.history.allProjects}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
        )}

        {/* Task list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="card p-12 text-center">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{t.history.noTasks}</h3>
            <p className="text-sm text-slate-500">{t.history.noTasksDesc}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task, idx) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="card overflow-hidden"
              >
                <div
                  className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                >
                  <div className={`w-3 h-3 rounded-full shrink-0 ${STATUS_STYLE[task.status]?.dotColor || 'bg-slate-400'}`} />

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white truncate">{task.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      {task.project && <span className="flex items-center gap-1"><FolderOpen className="w-3 h-3" />{task.project.name}</span>}
                      {task.assignee && <span className="flex items-center gap-1"><User className="w-3 h-3" />{task.assignee.name}</span>}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(task.updatedAt).toLocaleDateString(dateLocale)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${STATUS_STYLE[task.status]?.bgColor || ''} ${STATUS_STYLE[task.status]?.color || ''}`}>
                      {t.status[task.status]}
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
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="btn-secondary p-2 disabled:opacity-40"
            >
              {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            <span className="text-sm text-slate-500">
              {t.history.page} {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="btn-secondary p-2 disabled:opacity-40"
            >
              {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

