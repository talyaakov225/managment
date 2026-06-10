import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, MessageSquare } from 'lucide-react';
import { Avatar } from './Avatar';
import { useLang } from '../context/LangContext';
import type { Task } from '../types';
import { PRIORITY_STYLE } from '../types';

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`card-hover p-4 cursor-pointer select-none ${isDragging ? 'opacity-50 shadow-lg ring-2 ring-primary-500/30' : ''}`}
    >
      <div className="flex items-start gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${priority.dotColor}`} />
        <h4 className="text-sm font-medium text-slate-900 dark:text-white leading-snug">{task.title}</h4>
      </div>

      {task.description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 ms-4 mb-3">{task.description}</p>
      )}

      <div className="flex items-center justify-between mt-2 ms-4">
        <div className="flex items-center gap-2">
          {task.dueDate && (
            <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
              <Calendar className="w-3.5 h-3.5" />
              {new Date(task.dueDate).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}
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
          {task.assignee && <Avatar name={task.assignee.name} size="sm" />}
        </div>
      </div>
    </div>
  );
}
