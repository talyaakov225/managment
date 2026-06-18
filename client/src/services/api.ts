import axios from 'axios';
import type { User, Project, Task, DashboardStats, ProjectMember, Comment } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login') && !originalRequest.url?.includes('/auth/register')) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/auth/refresh', { refreshToken });
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post<{ pendingApproval: boolean; message: string }>('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', data),
  me: () => api.get<User>('/auth/me'),
  updateProfile: (data: { name?: string; avatar?: string }) =>
    api.put<User>('/auth/profile', data),
  updatePreferences: (data: { seeAllTasks?: boolean }) =>
    api.put<User>('/auth/preferences', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/password', data),
};

export const projectApi = {
  getAll: () => api.get<Project[]>('/projects'),
  getById: (id: string) => api.get<Project>(`/projects/${id}`),
  create: (data: { name: string; description?: string }) =>
    api.post<Project>('/projects', data),
  update: (id: string, data: { name?: string; description?: string }) =>
    api.put<Project>(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
};

export const taskApi = {
  getByProject: (projectId: string) => api.get<Task[]>(`/projects/${projectId}/tasks`),
  getById: (id: string) => api.get<Task>(`/tasks/${id}`),
  create: (projectId: string, data: Partial<Task>) =>
    api.post<Task>(`/projects/${projectId}/tasks`, data),
  update: (id: string, data: Record<string, unknown>) => api.put<Task>(`/tasks/${id}`, data),
  updatePosition: (id: string, data: { status: string; position: number }) =>
    api.patch<Task>(`/tasks/${id}/position`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  getDashboard: () => api.get<DashboardStats>('/tasks/dashboard/stats'),
  getHistory: (params?: { status?: string; priority?: string; projectId?: string; search?: string; page?: number }) =>
    api.get<{ tasks: Task[]; total: number; page: number; totalPages: number }>('/tasks/history', { params }),
};

export const memberApi = {
  getByProject: (projectId: string) => api.get<ProjectMember[]>(`/projects/${projectId}/members`),
  add: (projectId: string, data: { email: string; role?: string }) =>
    api.post<ProjectMember>(`/projects/${projectId}/members`, data),
  remove: (projectId: string, userId: string) =>
    api.delete(`/projects/${projectId}/members/${userId}`),
};

export const commentApi = {
  getByTask: (taskId: string) => api.get<Comment[]>(`/tasks/${taskId}/comments`),
  create: (taskId: string, data: { content: string }) =>
    api.post<Comment>(`/tasks/${taskId}/comments`, data),
  update: (commentId: string, data: { content: string }) =>
    api.put<Comment>(`/tasks/comments/${commentId}`, data),
  delete: (commentId: string) =>
    api.delete(`/tasks/comments/${commentId}`),
};

// ── Subtasks ──

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  position: number;
  taskId: string;
  createdAt: string;
}

export const subtaskApi = {
  getByTask: (taskId: string) => api.get<Subtask[]>(`/tasks/${taskId}/subtasks`),
  create: (taskId: string, data: { title: string }) =>
    api.post<Subtask>(`/tasks/${taskId}/subtasks`, data),
  update: (id: string, data: { title?: string; completed?: boolean }) =>
    api.put<Subtask>(`/tasks/subtasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/subtasks/${id}`),
};

// ── Task Activity ──

export interface TaskActivity {
  id: string;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  user: { id: string; name: string; avatar: string | null };
}

export const taskActivityApi = {
  getByTask: (taskId: string) => api.get<TaskActivity[]>(`/tasks/${taskId}/activity`),
};

// ── Favorites ──

export interface Favorite {
  id: string;
  projectId: string | null;
  project: { id: string; name: string; description: string | null } | null;
  createdAt: string;
}

export const favoriteApi = {
  getAll: () => api.get<Favorite[]>('/favorites'),
  toggle: (projectId: string) => api.post<{ favorited: boolean }>('/favorites/toggle', { projectId }),
};

// ── Chat Types ──

export interface MessageAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface MessageReaction {
  id: string;
  emoji: string;
  userId: string;
  user: { id: string; name: string };
}

export interface ChatMessage {
  id: string;
  content: string;
  type: string;
  editedAt: string | null;
  isDeleted: boolean;
  isPinned: boolean;
  pinnedAt: string | null;
  pinnedBy: { id: string; name: string } | null;
  createdAt: string;
  channelId: string;
  authorId: string;
  author: { id: string; name: string; avatar: string | null };
  taskId: string | null;
  task: { id: string; title: string; status: string; projectId: string } | null;
  replyToId: string | null;
  replyTo: { id: string; content: string; author: { id: string; name: string } } | null;
  reactions: MessageReaction[];
  attachments: MessageAttachment[];
}

export interface ChatChannel {
  id: string;
  name: string;
  description: string | null;
  isGeneral: boolean;
  createdAt: string;
  updatedAt: string;
  members: { userId: string; user: { id: string; name: string; avatar: string | null }; lastRead?: string }[];
  messages: ChatMessage[];
  _count: { messages: number };
  unreadCount: number;
}

export interface ChatSearchResult {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string; avatar: string | null };
  channel: { id: string; name: string; isGeneral: boolean };
}

export interface TypingUser {
  userId: string;
  name: string;
}

export interface ReadStatusMember {
  userId: string;
  lastRead: string;
  user: { name: string };
}

// ── Chat API ──

export const chatApi = {
  getChannels: () => api.get<ChatChannel[]>('/chat/channels'),
  createChannel: (data: { name: string; description?: string; memberIds?: string[] }) =>
    api.post<ChatChannel>('/chat/channels', data),
  createDirect: (targetUserId: string) =>
    api.post<ChatChannel>('/chat/channels/direct', { targetUserId }),
  updateChannel: (id: string, data: { name?: string; description?: string }) =>
    api.put('/chat/channels/' + id, data),
  deleteChannel: (id: string) => api.delete('/chat/channels/' + id),

  getMessages: (channelId: string, page?: number) =>
    api.get<{ messages: ChatMessage[]; total: number; page: number; hasMore: boolean }>(
      `/chat/channels/${channelId}/messages`, { params: { page } }
    ),
  sendMessage: (channelId: string, data: { content: string; taskId?: string; replyToId?: string }) =>
    api.post<ChatMessage>(`/chat/channels/${channelId}/messages`, data),
  sendMessageWithFiles: (channelId: string, data: { content: string; taskId?: string; replyToId?: string; attachments?: MessageAttachment[] }) =>
    api.post<ChatMessage>(`/chat/channels/${channelId}/messages-with-files`, data),
  editMessage: (id: string, content: string) =>
    api.put<ChatMessage>(`/chat/messages/${id}`, { content }),
  deleteMessage: (id: string) => api.delete(`/chat/messages/${id}`),

  toggleReaction: (messageId: string, emoji: string) =>
    api.post<{ action: string }>(`/chat/messages/${messageId}/reactions`, { emoji }),
  togglePin: (id: string) => api.put<ChatMessage>(`/chat/messages/${id}/pin`),
  getPinned: (channelId: string) => api.get<ChatMessage[]>(`/chat/channels/${channelId}/pinned`),

  getMembers: (channelId: string) => api.get(`/chat/channels/${channelId}/members`),
  addMember: (channelId: string, userId: string) =>
    api.post(`/chat/channels/${channelId}/members`, { userId }),
  removeMember: (channelId: string, userId: string) =>
    api.delete(`/chat/channels/${channelId}/members/${userId}`),

  search: (q: string, channelId?: string) =>
    api.get<ChatSearchResult[]>('/chat/search', { params: { q, channelId } }),

  sendTyping: (channelId: string) => api.post(`/chat/channels/${channelId}/typing`),
  getTyping: (channelId: string) => api.get<TypingUser[]>(`/chat/channels/${channelId}/typing`),

  heartbeat: () => api.post('/chat/heartbeat'),
  getPresence: () => api.get<Record<string, boolean>>('/chat/presence'),

  getReadStatus: (channelId: string) => api.get<ReadStatusMember[]>(`/chat/channels/${channelId}/read-status`),

  uploadFiles: (files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return api.post<Array<{ filename: string; originalName: string; mimeType: string; size: number; url: string }>>(
      '/chat/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },

  getUsers: () => api.get<(User & { lastSeen?: string })[]>('/chat/users'),
  getUnreadCount: () => api.get<{ count: number }>('/chat/unread-count'),
  getReminders: () => api.get('/chat/reminders'),
};

// ── Sticky Notes ──

export interface StickyNote {
  id: string;
  content: string;
  color: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export const stickyNoteApi = {
  getAll: () => api.get<StickyNote[]>('/sticky-notes'),
  create: (data: { content?: string; color?: string }) => api.post<StickyNote>('/sticky-notes', data),
  update: (id: string, data: Partial<StickyNote>) => api.put<StickyNote>(`/sticky-notes/${id}`, data),
  delete: (id: string) => api.delete(`/sticky-notes/${id}`),
};

// ── Reminders ──

export interface ReminderItem {
  id: string;
  title: string;
  content: string | null;
  color: string;
  triggerAt: string;
  triggered: boolean;
  dismissed: boolean;
  createdAt: string;
}

export const reminderApi = {
  getAll: () => api.get<ReminderItem[]>('/reminders'),
  getDue: () => api.get<ReminderItem[]>('/reminders/due'),
  create: (data: { title: string; content?: string; color?: string; triggerAt: string }) =>
    api.post<ReminderItem>('/reminders', data),
  update: (id: string, data: { title?: string; content?: string; color?: string; triggerAt?: string }) =>
    api.put<ReminderItem>(`/reminders/${id}`, data),
  dismiss: (id: string) => api.put<ReminderItem>(`/reminders/${id}/dismiss`),
  delete: (id: string) => api.delete(`/reminders/${id}`),
};

// ── Tags ──

export interface Tag {
  id: string;
  name: string;
  color: string;
  _count?: { tasks: number };
}

export const tagApi = {
  getAll: () => api.get<Tag[]>('/tags'),
  create: (data: { name: string; color?: string }) => api.post<Tag>('/tags', data),
  update: (id: string, data: { name?: string; color?: string }) => api.put<Tag>(`/tags/${id}`, data),
  delete: (id: string) => api.delete(`/tags/${id}`),
  setTaskTags: (taskId: string, tagIds: string[]) => api.post<Tag[]>(`/tags/task/${taskId}`, { tagIds }),
  getTaskTags: (taskId: string) => api.get<Tag[]>(`/tags/task/${taskId}`),
};

// ── Task Templates ──

export interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  priority: string;
  color: string | null;
  tags: string[];
  subtasks: { id: string; title: string; position: number }[];
  createdAt: string;
}

export const templateApi = {
  getAll: () => api.get<TaskTemplate[]>('/templates'),
  create: (data: { name: string; description?: string; priority?: string; color?: string; subtasks?: string[]; tags?: string[] }) =>
    api.post<TaskTemplate>('/templates', data),
  delete: (id: string) => api.delete(`/templates/${id}`),
  apply: (id: string, projectId: string) => api.post(`/templates/${id}/apply`, { projectId }),
};

// ── Time Tracking ──

export interface TimeEntry {
  id: string;
  taskId: string;
  userId: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  note: string | null;
  createdAt: string;
  task?: { id: string; title: string; projectId: string; project: { name: string } };
}

export const timeTrackingApi = {
  getByTask: (taskId: string) => api.get<TimeEntry[]>(`/tasks/${taskId}/time-entries`),
  start: (taskId: string, data: { startTime: string; note?: string }) =>
    api.post<TimeEntry>(`/tasks/${taskId}/time-entries`, data),
  stop: (id: string, data: { endTime: string; duration: number }) =>
    api.put<TimeEntry>(`/tasks/time-entries/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/time-entries/${id}`),
  getReport: (params?: { projectId?: string; userId?: string; from?: string; to?: string }) =>
    api.get<{ entries: TimeEntry[]; totalDuration: number }>('/tasks/time-report', { params }),
};

// ── Task Dependencies ──

export interface TaskDependency {
  id: string;
  type: string;
  taskId: string;
  dependsOnId: string;
  dependsOn?: { id: string; title: string; status: string };
  task?: { id: string; title: string; status: string };
}

export const dependencyApi = {
  getByTask: (taskId: string) => api.get<{ dependsOn: TaskDependency[]; dependedBy: TaskDependency[] }>(`/tasks/${taskId}/dependencies`),
  create: (taskId: string, dependsOnId: string) => api.post<TaskDependency>(`/tasks/${taskId}/dependencies`, { dependsOnId }),
  delete: (id: string) => api.delete(`/tasks/dependencies/${id}`),
};

// ── Teams ──

export interface Team {
  id: string;
  name: string;
  description: string | null;
  color: string;
  createdAt: string;
  members: { teamId: string; userId: string; role: string; user?: { id: string; name: string; avatar: string | null; email: string } }[];
  _count: { members: number };
}

export const teamApi2 = {
  getAll: () => api.get<Team[]>('/teams'),
  create: (data: { name: string; description?: string; color?: string; memberIds?: string[] }) =>
    api.post<Team>('/teams', data),
  update: (id: string, data: { name?: string; description?: string; color?: string }) =>
    api.put<Team>(`/teams/${id}`, data),
  delete: (id: string) => api.delete(`/teams/${id}`),
  addMember: (teamId: string, userId: string) => api.post(`/teams/${teamId}/members`, { userId }),
  removeMember: (teamId: string, userId: string) => api.delete(`/teams/${teamId}/members/${userId}`),
};

export const navConfigApi = {
  getHidden: () => api.get<{ hidden: string[] }>('/board/nav-config'),
};

export default api;
