import { useState } from 'react';
import { Calendar, ArrowUpDown, ChevronUp, ChevronDown, Clock, User2 } from 'lucide-react';
import { Avatar } from './Avatar';
import { useLang } from '../context/LangContext';
import type { Task, TaskStatus, TaskPriority } from '../types';
import { STATUS_STYLE, PRIORITY_STYLE } from '../types';

interface TaskTableViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (taskId: string) => void;
}

type SortField = 'title' | 'status' | 'priority' | 'dueDate' | 'createdAt' | 'assignee';
type SortDir = 'asc' | 'desc';

const STATUS_ORDER: Record<TaskStatus, number> = { TODO: 0, IN_PROGRESS: 1, REVIEW: 2, DONE: 3 };
const PRIORITY_ORDER: Record<TaskPriority, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, URGENT: 3 };

export function TaskTableView({ tasks, onTaskClick, selectedIds, onToggleSelect }: TaskTableViewProps) {
  const { t, dateLocale, lang } = useLang();
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  const sorted = [...tasks].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortField) {
      case 'title':
        return a.title.localeCompare(b.title) * dir;
      case 'status':
        return (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) * dir;
      case 'priority':
        return (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]) * dir;
      case 'dueDate': {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return (da - db) * dir;
      }
      case 'createdAt':
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      case 'assignee': {
        const na = a.assignees?.[0]?.user?.name || '';
        const nb = b.assignees?.[0]?.user?.name || '';
        return na.localeCompare(nb) * dir;
      }
      default:
        return 0;
    }
  });

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />;
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 text-primary-500" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-primary-500" />
    );
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t.task.justNow;
    if (mins < 60) return `${mins} ${t.task.minutesAgo}`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} ${t.task.hoursAgo}`;
    const days = Math.floor(hrs / 24);
    return `${days} ${t.task.daysAgo}`;
  }

  const isRtl = lang === 'he';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" dir={isRtl ? 'rtl' : 'ltr'}>
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70">
              {selectedIds && <th className="w-[40px] px-2 py-3" />}
              {([
                { field: 'title' as SortField, label: t.board.taskName, width: 'min-w-[250px]' },
                { field: 'status' as SortField, label: t.task.status, width: 'w-[130px]' },
                { field: 'priority' as SortField, label: t.task.priority, width: 'w-[120px]' },
                { field: 'assignee' as SortField, label: t.task.assignee, width: 'w-[160px]' },
                { field: 'dueDate' as SortField, label: t.task.dueDate, width: 'w-[130px]' },
                { field: 'createdAt' as SortField, label: t.board.created, width: 'w-[130px]' },
              ]).map((col) => (
                <th
                  key={col.field}
                  onClick={() => toggleSort(col.field)}
                  className={`${col.width} px-4 py-3 text-start font-semibold text-slate-600 dark:text-slate-400 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors select-none`}
                >
                  <span className="flex items-center gap-1.5">
                    {col.label}
                    <SortIcon field={col.field} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((task) => {
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';
              const statusStyle = STATUS_STYLE[task.status];
              const priorityStyle = PRIORITY_STYLE[task.priority];
              return (
                <tr
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="border-b border-slate-100 dark:border-slate-800/60 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
                  style={task.color ? { borderInlineStartWidth: '4px', borderInlineStartColor: task.color } : undefined}
                >
                  {selectedIds && onToggleSelect && (
                    <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(task.id)}
                        onChange={() => onToggleSelect(task.id)}
                        className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {task.title}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5 max-w-xs">{task.description.replace(/<[^>]*>/g, '').slice(0, 80)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle.bgColor} ${statusStyle.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dotColor}`} />
                      {t.status[task.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${priorityStyle.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${priorityStyle.dotColor}`} />
                      {t.priority[task.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {task.assignees && task.assignees.length > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-1 rtl:space-x-reverse">
                          {task.assignees.slice(0, 2).map((a) => (
                            <Avatar key={a.userId} name={a.user.name} size="xs" />
                          ))}
                        </div>
                        <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[90px]">
                          {task.assignees.length === 1
                            ? task.assignees[0].user.name
                            : `${task.assignees[0].user.name} +${task.assignees.length - 1}`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <User2 className="w-3.5 h-3.5" />
                        {t.task.unassigned}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {task.dueDate ? (
                      <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(task.dueDate).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      {timeAgo(task.createdAt)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sorted.length === 0 && (
        <div className="py-16 text-center text-slate-400 dark:text-slate-500">
          {t.board.noTasksFound}
        </div>
      )}
    </div>
  );
}
