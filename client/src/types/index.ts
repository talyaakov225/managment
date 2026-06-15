export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  globalRole?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  owner: User;
  members: ProjectMember[];
  _count: { tasks: number };
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  userId: string;
  projectId: string;
  user: User;
  createdAt: string;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TaskAssignee {
  userId: string;
  user: User;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  color: string | null;
  position: number;
  dueDate: string | null;
  projectId: string;
  creatorId: string | null;
  creator: User | null;
  assignees: TaskAssignee[];
  project?: { id: string; name: string };
  comments?: Comment[];
  _count?: { comments: number };
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  author: User;
  createdAt: string;
}

export interface DashboardStats {
  stats: {
    total: number;
    todo: number;
    inProgress: number;
    review: number;
    done: number;
  };
  upcoming: Task[];
  recentTasks: Task[];
}

export const STATUS_STYLE: Record<TaskStatus, { color: string; bgColor: string; dotColor: string }> = {
  TODO: { color: 'text-slate-600 dark:text-slate-300', bgColor: 'bg-slate-100 dark:bg-slate-700', dotColor: 'bg-slate-400' },
  IN_PROGRESS: { color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/30', dotColor: 'bg-blue-400' },
  REVIEW: { color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/30', dotColor: 'bg-amber-400' },
  DONE: { color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30', dotColor: 'bg-emerald-400' },
};

export const PRIORITY_STYLE: Record<TaskPriority, { color: string; dotColor: string }> = {
  LOW: { color: 'text-slate-500', dotColor: 'bg-slate-400' },
  MEDIUM: { color: 'text-blue-500', dotColor: 'bg-blue-400' },
  HIGH: { color: 'text-orange-500', dotColor: 'bg-orange-400' },
  URGENT: { color: 'text-red-500', dotColor: 'bg-red-500' },
};

export const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
