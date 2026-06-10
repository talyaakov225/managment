import axios from 'axios';
import type { User, Project, Task, DashboardStats, ProjectMember, Comment } from '../types';

const api = axios.create({
  baseURL: '/api',
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
  update: (id: string, data: Partial<Task>) => api.put<Task>(`/tasks/${id}`, data),
  updatePosition: (id: string, data: { status: string; position: number }) =>
    api.patch<Task>(`/tasks/${id}/position`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  getDashboard: () => api.get<DashboardStats>('/tasks/dashboard/stats'),
  getHistory: (params?: { status?: string; priority?: string; projectId?: string; assigneeId?: string; search?: string; page?: number }) =>
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
};

export interface ChatChannel {
  id: string;
  name: string;
  description: string | null;
  isGeneral: boolean;
  createdAt: string;
  updatedAt: string;
  members: { userId: string; user: { id: string; name: string; avatar: string | null } }[];
  messages: ChatMessage[];
  _count: { messages: number };
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  channelId: string;
  authorId: string;
  author: { id: string; name: string; avatar: string | null };
  taskId: string | null;
  task: { id: string; title: string; status: string; projectId: string } | null;
}

export const chatApi = {
  getChannels: () => api.get<ChatChannel[]>('/chat/channels'),
  createChannel: (data: { name: string; description?: string; memberIds?: string[] }) =>
    api.post<ChatChannel>('/chat/channels', data),
  createDirect: (targetUserId: string) =>
    api.post<ChatChannel>('/chat/channels/direct', { targetUserId }),
  getMessages: (channelId: string, page?: number) =>
    api.get<ChatMessage[]>(`/chat/channels/${channelId}/messages`, { params: { page } }),
  sendMessage: (channelId: string, data: { content: string; taskId?: string }) =>
    api.post<ChatMessage>(`/chat/channels/${channelId}/messages`, data),
  getUsers: () => api.get<User[]>('/chat/users'),
  getUnreadCount: () => api.get<{ count: number }>('/chat/unread-count'),
};

export default api;
