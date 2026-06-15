import api from './api';
import type {
  AdminUser, AdminRole, Permission, BoardStatus, BoardPriority,
  Category, NavItem, CustomPage, PageBlock, SystemSetting, AuditLog, AdminDashboardData,
} from '../types/admin';

export const adminDashboardApi = {
  get: () => api.get<AdminDashboardData>('/admin/dashboard'),
};

export const adminUsersApi = {
  getAll: (search?: string, filter?: string) => api.get<AdminUser[]>('/admin/users', { params: { search, filter } }),
  getPendingCount: () => api.get<{ count: number }>('/admin/users/pending-count'),
  approve: (id: string) => api.put(`/admin/users/${id}/approve`),
  reject: (id: string) => api.put(`/admin/users/${id}/reject`),
  updateGlobalRole: (id: string, globalRole: string) =>
    api.put(`/admin/users/${id}/role`, { globalRole }),
  updateCustomRoles: (id: string, roleIds: string[]) =>
    api.put(`/admin/users/${id}/custom-roles`, { roleIds }),
  delete: (id: string) => api.delete(`/admin/users/${id}`),
};

export const adminRolesApi = {
  getAll: () => api.get<AdminRole[]>('/admin/roles'),
  getPermissions: () => api.get<Permission[]>('/admin/roles/permissions'),
  create: (data: { name: string; displayName: string; color?: string; permissionIds?: string[] }) =>
    api.post<AdminRole>('/admin/roles', data),
  update: (id: string, data: { displayName?: string; color?: string }) =>
    api.put<AdminRole>(`/admin/roles/${id}`, data),
  updatePermissions: (id: string, permissionIds: string[]) =>
    api.put<AdminRole>(`/admin/roles/${id}/permissions`, { permissionIds }),
  delete: (id: string) => api.delete(`/admin/roles/${id}`),
};

export const adminBoardApi = {
  getStatuses: () => api.get<BoardStatus[]>('/admin/board/statuses'),
  createStatus: (data: Partial<BoardStatus>) => api.post<BoardStatus>('/admin/board/statuses', data),
  updateStatus: (id: string, data: Partial<BoardStatus>) => api.put<BoardStatus>(`/admin/board/statuses/${id}`, data),
  deleteStatus: (id: string) => api.delete(`/admin/board/statuses/${id}`),

  getPriorities: () => api.get<BoardPriority[]>('/admin/board/priorities'),
  createPriority: (data: Partial<BoardPriority>) => api.post<BoardPriority>('/admin/board/priorities', data),
  updatePriority: (id: string, data: Partial<BoardPriority>) => api.put<BoardPriority>(`/admin/board/priorities/${id}`, data),
  deletePriority: (id: string) => api.delete(`/admin/board/priorities/${id}`),

  getCategories: () => api.get<Category[]>('/admin/board/categories'),
  createCategory: (data: { name: string; color?: string }) => api.post<Category>('/admin/board/categories', data),
  updateCategory: (id: string, data: Partial<Category>) => api.put<Category>(`/admin/board/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/admin/board/categories/${id}`),
};

export const adminProjectsApi = {
  getAll: () => api.get<Array<{ id: string; name: string; description: string | null; ownerId: string; owner: { id: string; name: string; email: string }; _count: { tasks: number; members: number }; createdAt: string; updatedAt: string }>>('/admin/projects'),
  update: (id: string, data: { name?: string; description?: string | null }) => api.put(`/admin/projects/${id}`, data),
  delete: (id: string) => api.delete(`/admin/projects/${id}`),
};

export const adminNavApi = {
  getAll: () => api.get<NavItem[]>('/admin/navigation'),
  create: (data: Partial<NavItem>) => api.post<NavItem>('/admin/navigation', data),
  update: (id: string, data: Partial<NavItem>) => api.put<NavItem>(`/admin/navigation/${id}`, data),
  delete: (id: string) => api.delete(`/admin/navigation/${id}`),
};

export const adminPagesApi = {
  getAll: () => api.get<CustomPage[]>('/admin/pages'),
  getById: (id: string) => api.get<CustomPage>(`/admin/pages/${id}`),
  create: (data: Partial<CustomPage>) => api.post<CustomPage>('/admin/pages', data),
  update: (id: string, data: Partial<CustomPage>) => api.put<CustomPage>(`/admin/pages/${id}`, data),
  delete: (id: string) => api.delete(`/admin/pages/${id}`),
  createBlock: (pageId: string, data: Partial<PageBlock>) => api.post<PageBlock>(`/admin/pages/${pageId}/blocks`, data),
  updateBlock: (pageId: string, blockId: string, data: Partial<PageBlock>) =>
    api.put<PageBlock>(`/admin/pages/${pageId}/blocks/${blockId}`, data),
  deleteBlock: (pageId: string, blockId: string) =>
    api.delete(`/admin/pages/${pageId}/blocks/${blockId}`),
};

export const adminSettingsApi = {
  getAll: () => api.get<SystemSetting[]>('/admin/settings'),
  create: (data: Partial<SystemSetting>) => api.post<SystemSetting>('/admin/settings', data),
  update: (id: string, value: string) => api.put<SystemSetting>(`/admin/settings/${id}`, { value }),
  delete: (id: string) => api.delete(`/admin/settings/${id}`),
};

export const adminAuditApi = {
  getAll: (params?: { page?: number; limit?: number; entity?: string; action?: string }) =>
    api.get<{ logs: AuditLog[]; total: number; page: number; totalPages: number }>(
      '/admin/audit-logs', { params }
    ),
};

export const adminChatApi = {
  getStats: () => api.get<{
    channels: { id: string; name: string; isGeneral: boolean; createdAt: string; _count: { messages: number; members: number } }[];
    totalMessages: number;
    totalAttachments: number;
  }>('/admin/chat/stats'),
  clearChannel: (channelId: string) => api.delete<{ deleted: number }>(`/admin/chat/channels/${channelId}/messages`),
  clearAll: () => api.delete<{ deleted: number }>('/admin/chat/messages/all'),
  deleteChannel: (channelId: string) => api.delete(`/admin/chat/channels/${channelId}`),
};

export const boardPublicApi = {
  getStatuses: () => api.get<BoardStatus[]>('/board/statuses'),
  getPriorities: () => api.get<BoardPriority[]>('/board/priorities'),
  getCategories: () => api.get<Category[]>('/board/categories'),
};

export const navPublicApi = {
  getAll: () => api.get<NavItem[]>('/navigation'),
  getPage: (slug: string) => api.get<CustomPage>(`/navigation/pages/${slug}`),
};
