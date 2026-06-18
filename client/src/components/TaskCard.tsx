import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, MessageSquare, Clock, User2 } from 'lucide-react';
import { Avatar } from './Avatar';
import { useLang } from '../context/LangContext';
import type { Task } from '../types';
import { PRIORITY_STYLE } from '../types';

function htmlToPreview(html: string, maxLen = 100): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(td|th|li|p|div|h[1-6])>/gi, ' · ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { t, dateLocale } = useLang();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = PRIORITY_STYLE[task.priority];
  const priorityLabel = t.priority[task.priority];
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';
  const hasColor = !!task.color;

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

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        ...(hasColor ? { borderColor: task.color!, borderWidth: '2px', borderStyle: 'solid' } : {}),
      }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`card-hover p-4 cursor-pointer select-none ${isDragging ? 'opacity-50 shadow-lg ring-2 ring-primary-500/30' : ''}`}
    >
      {hasColor && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ backgroundColor: task.color!, opacity: 0.06 }}
        />
      )}

      <div className="relative">
        <div className="flex items-start gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${priority.dotColor}`} />
          <h4 className="text-sm font-medium text-slate-900 dark:text-white leading-snug flex-1">{task.title}</h4>
        </div>

        {task.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 ms-4 mb-3">
            {htmlToPreview(task.description)}
          </p>
        )}

        {/* Creator + Time */}
        <div className="flex items-center gap-2 ms-4 mb-2">
          {task.creator && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
              <User2 className="w-3 h-3" />
              {task.creator.name}
            </span>
          )}
          <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
            <Clock className="w-3 h-3" />
            {timeAgo(task.createdAt)}
          </span>
        </div>

        <div className="flex items-center justify-between mt-1 ms-4">
          <div className="flex items-center gap-2">
            {task.dueDate && (
              <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                <Calendar className="w-3.5 h-3.5" />
                {new Date(task.dueDate).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}
                {isOverdue && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
              </span>
            )}
            {task._count && task._count.comments > 0 && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <MessageSquare className="w-3.5 h-3.5" />
                {task._count.comments}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${priority.color} bg-opacity-10`}>
              {priorityLabel}
            </span>
            {task.assignees && task.assignees.length > 0 ? (
              <div className="flex -space-x-1.5 rtl:space-x-reverse">
                {task.assignees.slice(0, 3).map((a) => (
                  <Avatar key={a.userId} name={a.user.name} size="sm" />
                ))}
                {task.assignees.length > 3 && (
                  <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                    +{task.assignees.length - 3}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-[10px] text-slate-300 dark:text-slate-600 italic">{t.task.unassigned}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
