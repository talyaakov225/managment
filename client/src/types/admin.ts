export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  globalRole: string;
  isApproved: boolean;
  createdAt: string;
  userRoles: { role: AdminRole }[];
}

export interface AdminRole {
  id: string;
  name: string;
  displayName: string;
  color: string;
  isSystem: boolean;
  createdAt: string;
  permissions: { permission: Permission }[];
  _count: { users: number };
}

export interface Permission {
  id: string;
  key: string;
  group: string;
  displayName: string;
}

export interface BoardStatus {
  id: string;
  key: string;
  label_he: string;
  label_en: string;
  color: string;
  bgColor: string;
  position: number;
  isDefault: boolean;
}

export interface BoardPriority {
  id: string;
  key: string;
  label_he: string;
  label_en: string;
  color: string;
  dotColor: string;
  position: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  position: number;
  _count?: { tasks: number };
}

export interface NavItem {
  id: string;
  label_he: string;
  label_en: string;
  icon: string;
  href: string;
  position: number;
  visible: boolean;
  parentId: string | null;
  children: NavItem[];
  requiredPermission: string | null;
}

export interface CustomPage {
  id: string;
  slug: string;
  title_he: string;
  title_en: string;
  description: string | null;
  isPublished: boolean;
  requiredPermission: string | null;
  createdAt: string;
  updatedAt: string;
  blocks: PageBlock[];
  _count?: { blocks: number };
}

export interface PageBlock {
  id: string;
  type: string;
  content: string;
  position: number;
  settings: string;
  pageId: string;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  type: string;
  group: string;
  label_he: string | null;
  label_en: string | null;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  userId: string;
  user: { id: string; name: string; email: string };
  ipAddress: string | null;
  createdAt: string;
}

export interface AdminDashboardData {
  users: number;
  projects: number;
  tasks: number;
  tasksByStatus: { status: string; count: number }[];
  recentActivity: AuditLog[];
}
