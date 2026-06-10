import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { useLang } from '../context/LangContext';
import type { Task, TaskStatus } from '../types';
import { STATUS_STYLE } from '../types';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onAddTask: (status: TaskStatus) => void;
  onTaskClick: (task: Task) => void;
}

export function KanbanColumn({ status, tasks, onAddTask, onTaskClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const { t } = useLang();
  const style = STATUS_STYLE[status];
  const label = t.status[status];

  return (
    <div className="flex flex-col min-w-[300px] w-[300px] lg:flex-1 lg:min-w-0">
      <div className="flex items-center justify-between px-2 mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${style.color}`}>{label}</span>
          <span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(status)}
          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2.5 p-2 rounded-2xl transition-colors min-h-[200px] ${
          isOver ? 'bg-primary-50/50 dark:bg-primary-950/20 ring-2 ring-dashed ring-primary-300 dark:ring-primary-700' : 'bg-slate-100/50 dark:bg-slate-900/30'
        }`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
