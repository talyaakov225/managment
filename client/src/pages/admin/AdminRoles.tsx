import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit3, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminRolesApi } from '../../services/adminApi';
import { useLang } from '../../context/LangContext';
import { Modal } from '../../components/Modal';
import type { AdminRole, Permission } from '../../types/admin';

const PERM_LABELS_HE: Record<string, string> = {
  'projects.view': 'צפייה בפרויקטים',
  'projects.create': 'יצירת פרויקטים',
  'projects.edit': 'עריכת פרויקטים',
  'projects.delete': 'מחיקת פרויקטים',
  'tasks.view': 'צפייה במשימות',
  'tasks.create': 'יצירת משימות',
  'tasks.edit': 'עריכת משימות',
  'tasks.delete': 'מחיקת משימות',
  'tasks.assign': 'שיוך משימות',
  'members.view': 'צפייה בחברי צוות',
  'members.manage': 'ניהול חברי צוות',
  'comments.create': 'כתיבת תגובות',
  'comments.delete': 'מחיקת תגובות',
  'admin.access': 'גישה לפאנל ניהול',
  'admin.users': 'ניהול משתמשים',
  'admin.roles': 'ניהול תפקידים',
  'admin.settings': 'ניהול הגדרות',
  'admin.board': 'ניהול הגדרות לוח',
  'admin.pages': 'ניהול דפים',
  'admin.navigation': 'ניהול ניווט',
};

const GROUP_LABELS_HE: Record<string, string> = {
  projects: 'פרויקטים',
  tasks: 'משימות',
  members: 'חברי צוות',
  comments: 'תגובות',
  admin: 'ניהול מערכת',
};

export function AdminRoles() {
  const { t, lang } = useLang();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', displayName: '', color: '#6366f1' });
  const [newRolePermissions, setNewRolePermissions] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['projects', 'tasks']));

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([adminRolesApi.getAll(), adminRolesApi.getPermissions()]);
      setRoles(rolesRes.data);
      setPermissions(permsRes.data);
      if (selectedRole) {
        const updated = rolesRes.data.find((r) => r.id === selectedRole.id);
        if (updated) setSelectedRole(updated);
      }
    } finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!newRole.name || !newRole.displayName) return;
    try {
      await adminRolesApi.create({
        ...newRole,
        permissionIds: Array.from(newRolePermissions),
      });
      toast.success(t.admin.roleCreated);
      setShowCreate(false);
      setNewRole({ name: '', displayName: '', color: '#6366f1' });
      setNewRolePermissions(new Set());
      load();
    } catch { toast.error(t.admin.createFailed); }
  }

  async function handleDelete(id: string) {
    if (!confirm(t.admin.deleteRoleConfirm)) return;
    try {
      await adminRolesApi.delete(id);
      toast.success(t.admin.roleDeleted);
      if (selectedRole?.id === id) setSelectedRole(null);
      load();
    } catch { toast.error(t.admin.deleteFailed); }
  }

  async function handlePermissionToggle(roleId: string, permissionId: string, currentlyAssigned: boolean) {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;
    const currentIds = role.permissions.map((rp) => rp.permission.id);
    const newIds = currentlyAssigned ? currentIds.filter((id) => id !== permissionId) : [...currentIds, permissionId];
    try {
      await adminRolesApi.updatePermissions(roleId, newIds);
      toast.success(t.common.saved);
      load();
    } catch { toast.error(t.admin.updateFailed); }
  }

  async function handleGroupToggle(roleId: string, groupPerms: Permission[], allAssigned: boolean) {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;
    const currentIds = new Set(role.permissions.map((rp) => rp.permission.id));
    if (allAssigned) {
      groupPerms.forEach((p) => currentIds.delete(p.id));
    } else {
      groupPerms.forEach((p) => currentIds.add(p.id));
    }
    try {
      await adminRolesApi.updatePermissions(roleId, Array.from(currentIds));
      toast.success(t.common.saved);
      load();
    } catch { toast.error(t.admin.updateFailed); }
  }

  function toggleNewPerm(permId: string) {
    const next = new Set(newRolePermissions);
    if (next.has(permId)) next.delete(permId); else next.add(permId);
    setNewRolePermissions(next);
  }

  function toggleNewGroup(groupPerms: Permission[]) {
    const allSelected = groupPerms.every((p) => newRolePermissions.has(p.id));
    const next = new Set(newRolePermissions);
    if (allSelected) {
      groupPerms.forEach((p) => next.delete(p.id));
    } else {
      groupPerms.forEach((p) => next.add(p.id));
    }
    setNewRolePermissions(next);
  }

  function toggleGroup(group: string) {
    const next = new Set(expandedGroups);
    if (next.has(group)) next.delete(group); else next.add(group);
    setExpandedGroups(next);
  }

  const permissionGroups = permissions.reduce<Record<string, Permission[]>>((groups, p) => {
    (groups[p.group] ??= []).push(p);
    return groups;
  }, {});

  function permLabel(perm: Permission) {
    return lang === 'he' ? (PERM_LABELS_HE[perm.key] || perm.displayName) : perm.displayName;
  }

  function groupLabel(group: string) {
    return lang === 'he' ? (GROUP_LABELS_HE[group] || group) : group;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.admin.roleManagement}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.admin.rolesDesc}</p>
          </div>
          <button onClick={() => { setShowCreate(true); setExpandedGroups(new Set(Object.keys(permissionGroups))); }} className="btn-primary">
            <Plus className="w-4 h-4" />
            {t.admin.newRole}
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Role list */}
          <div className="space-y-3">
            {roles.map((role) => (
              <div
                key={role.id}
                onClick={() => setSelectedRole(role)}
                className={`card p-4 cursor-pointer transition-all ${selectedRole?.id === role.id ? 'ring-2 ring-primary-500' : 'hover:shadow-md'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: role.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white">{role.displayName}</p>
                    <p className="text-xs text-slate-400">{role._count.users} {t.admin.users} • {role.permissions.length} {t.admin.permissions}</p>
                  </div>
                  {!role.isSystem && (
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(role.id); }} className="btn-ghost p-1 text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Permission matrix */}
          <div className="lg:col-span-2">
            {selectedRole ? (
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-5 h-5 rounded-full" style={{ backgroundColor: selectedRole.color }} />
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{selectedRole.displayName}</h2>
                  <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{selectedRole.name}</span>
                </div>

                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">{t.admin.permissionMatrix}</h3>

                <div className="space-y-4">
                  {Object.entries(permissionGroups).map(([group, perms]) => {
                    const assignedCount = perms.filter((p) => selectedRole.permissions.some((rp) => rp.permission.id === p.id)).length;
                    const allAssigned = assignedCount === perms.length;
                    const isExpanded = expandedGroups.has(group);

                    return (
                      <div key={group} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                        <div
                          className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 cursor-pointer"
                          onClick={() => toggleGroup(group)}
                        >
                          <input
                            type="checkbox"
                            checked={allAssigned}
                            onChange={(e) => { e.stopPropagation(); handleGroupToggle(selectedRole.id, perms, allAssigned); }}
                            className="w-4 h-4 rounded text-primary-600"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Shield className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex-1">{groupLabel(group)}</span>
                          <span className="text-xs text-slate-400 me-2">{assignedCount}/{perms.length}</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>

                        {isExpanded && (
                          <div className="px-4 py-2 space-y-1">
                            {perms.map((perm) => {
                              const isAssigned = selectedRole.permissions.some((rp) => rp.permission.id === perm.id);
                              return (
                                <label
                                  key={perm.id}
                                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                                    isAssigned
                                      ? 'bg-primary-50 dark:bg-primary-950/20'
                                      : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isAssigned}
                                    onChange={() => handlePermissionToggle(selectedRole.id, perm.id, isAssigned)}
                                    className="w-4 h-4 rounded text-primary-600"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-700 dark:text-slate-300">{permLabel(perm)}</p>
                                    <p className="text-[11px] text-slate-400 font-mono">{perm.key}</p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {permissions.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-8">{t.admin.noPermissions}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="card p-12 flex flex-col items-center justify-center text-center">
                <Edit3 className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-slate-500">{t.admin.selectRoleToEdit}</p>
              </div>
            )}
          </div>
        </div>

        {/* Create Role Modal - with full permission selection */}
        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={t.admin.newRole} size="xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: role details */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.roleName}</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. editor"
                  value={newRole.name}
                  onChange={(e) => setNewRole((p) => ({ ...p, name: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                />
                <p className="text-[11px] text-slate-400 mt-1">{lang === 'he' ? 'שם טכני באנגלית (בלי רווחים)' : 'Technical name in English (no spaces)'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.displayName}</label>
                <input
                  type="text"
                  className="input"
                  placeholder={t.admin.displayNamePlaceholder}
                  value={newRole.displayName}
                  onChange={(e) => setNewRole((p) => ({ ...p, displayName: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.color}</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newRole.color}
                    onChange={(e) => setNewRole((p) => ({ ...p, color: e.target.value }))}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700"
                  />
                  <div className="flex gap-1.5 flex-wrap flex-1">
                    {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewRole((p) => ({ ...p, color: c }))}
                        className={`w-7 h-7 rounded-lg transition-transform hover:scale-110 ${newRole.color === c ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500">
                  {lang === 'he' ? `נבחרו ${newRolePermissions.size} הרשאות מתוך ${permissions.length}` : `${newRolePermissions.size} of ${permissions.length} permissions selected`}
                </p>
              </div>
            </div>

            {/* Right: permissions */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {lang === 'he' ? 'בחירת הרשאות' : 'Select Permissions'}
              </label>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pe-1">
                {Object.keys(permissionGroups).length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">{t.admin.noPermissions}</p>
                  </div>
                ) : (
                  Object.entries(permissionGroups).map(([group, perms]) => {
                    const allSelected = perms.every((p) => newRolePermissions.has(p.id));
                    const someSelected = perms.some((p) => newRolePermissions.has(p.id));

                    return (
                      <div key={group} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                        <label className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                            onChange={() => toggleNewGroup(perms)}
                            className="w-4 h-4 rounded text-primary-600"
                          />
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex-1">{groupLabel(group)}</span>
                          <span className="text-xs text-slate-400">
                            {perms.filter((p) => newRolePermissions.has(p.id)).length}/{perms.length}
                          </span>
                        </label>
                        <div className="px-3 py-1.5 space-y-0.5">
                          {perms.map((perm) => (
                            <label key={perm.id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                              <input
                                type="checkbox"
                                checked={newRolePermissions.has(perm.id)}
                                onChange={() => toggleNewPerm(perm.id)}
                                className="w-3.5 h-3.5 rounded text-primary-600"
                              />
                              <span className="text-sm text-slate-600 dark:text-slate-400">{permLabel(perm)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
            <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">{t.common.cancel}</button>
            <button onClick={handleCreate} disabled={!newRole.name || !newRole.displayName} className="btn-primary flex-1">{t.common.create}</button>
          </div>
        </Modal>
      </motion.div>
    </div>
  );
}
