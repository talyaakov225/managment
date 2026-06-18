import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, User, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageSpinner } from '../components/Skeleton';
import { taskApi, projectApi } from '../services/api';
import { useLang } from '../context/LangContext';
import { Avatar } from '../components/Avatar';
import type { Task, Project } from '../types';
import { STATUS_STYLE, PRIORITY_STYLE } from '../types';

const UNASSIGNED = '_unassigned';

async function fetchAllTasks(projectId?: string): Promise<Task[]> {
  const all: Task[] = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const params: Record<string, string | number> = { page, tab: 'active' };
    if (projectId) params.projectId = projectId;
    const { data } = await taskApi.getHistory(params);
    all.push(...data.tasks);
    totalPages = data.totalPages;
    page++;
  }
  return all;
}

interface Column {
  id: string;
  name: string;
  avatar: string | null;
  tasks: Task[];
}

export function TeamBoardPage() {
  const { lang, t } = useLang();
  const he = lang === 'he';
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectFilter, setProjectFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectApi.getAll().then(({ data }) => setProjects(data)).catch(() => toast.error(he ? 'שגיאה בטעינת פרויקטים' : 'Failed to load projects'));
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchAllTasks(projectFilter || undefined)
      .then(setTasks)
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [projectFilter]);

  const columns = useMemo((): Column[] => {
    const map = new Map<string, Column>();

    tasks.forEach((task) => {
      if (!task.assignees?.length) {
        if (!map.has(UNASSIGNED)) {
          map.set(UNASSIGNED, { id: UNASSIGNED, name: he ? 'לא משויך' : 'Unassigned', avatar: null, tasks: [] });
        }
        map.get(UNASSIGNED)!.tasks.push(task);
        return;
      }
      task.assignees.forEach((a) => {
        if (!map.has(a.userId)) {
          map.set(a.userId, { id: a.userId, name: a.user.name, avatar: a.user.avatar, tasks: [] });
        }
        map.get(a.userId)!.tasks.push(task);
      });
    });

    const unassigned = map.get(UNASSIGNED);
    const members = Array.from(map.values())
      .filter((c) => c.id !== UNASSIGNED)
      .sort((a, b) => a.name.localeCompare(b.name, he ? 'he' : 'en'));
    return unassigned ? [...members, unassigned] : members;
  }, [tasks, he]);

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-primary-500" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {he ? 'לוח צוות' : 'Team Board'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary-500/30"
          >
            <option value="">{he ? 'כל הפרויקטים' : 'All projects'}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <PageSpinner />
      ) : columns.length === 0 ? (
        <div className="card p-12 text-center text-slate-500 dark:text-slate-400">
          {he ? 'אין משימות להצגה' : 'No tasks to display'}
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-4 min-h-[calc(100vh-12rem)]">
            {columns.map((col) => (
              <div key={col.id} className="flex flex-col min-w-[280px] w-[280px] shrink-0">
                <div className="flex items-center gap-2 mb-3 px-1">
                  {col.id === UNASSIGNED ? (
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                      <User className="w-4 h-4 text-slate-400" />
                    </div>
                  ) : (
                    <Avatar name={col.name} avatar={col.avatar} size="sm" />
                  )}
                  <span className="text-sm font-semibold text-slate-900 dark:text-white truncate flex-1">{col.name}</span>
                  <span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {col.tasks.length}
                  </span>
                </div>
                <div className="flex-1 space-y-2 p-2 rounded-2xl bg-slate-100/50 dark:bg-slate-900/30 min-h-[200px]">
                  {col.tasks.map((task) => {
                    const status = STATUS_STYLE[task.status];
                    const priority = PRIORITY_STYLE[task.priority];
                    return (
                      <div
                        key={`${col.id}-${task.id}`}
                        onClick={() => navigate(`/projects/${task.projectId}`)}
                        className="card p-3 cursor-pointer hover:shadow-md transition-shadow"
                        style={task.color ? { borderInlineStart: `3px solid ${task.color}` } : undefined}
                      >
                        <div className="flex items-start gap-2 mb-1.5">
                          <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${priority.dotColor}`} />
                          <p className="text-sm font-medium text-slate-900 dark:text-white leading-snug flex-1">{task.title}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-[11px]">
                          <span className={`px-1.5 py-0.5 rounded ${status.bgColor} ${status.color} font-medium`}>
                            {t.status[task.status]}
                          </span>
                          {task.project && (
                            <span className="text-slate-400 truncate">{task.project.name}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
