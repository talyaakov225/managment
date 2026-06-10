import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit3, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminRolesApi } from '../../services/adminApi';
import { useLang } from '../../context/LangContext';
import { Modal } from '../../components/Modal';
import type { AdminRole, Permission } from '../../types/admin';

export function AdminRoles() {
  const { t } = useLang();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', displayName: '', color: '#6366f1' });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([adminRolesApi.getAll(), adminRolesApi.getPermissions()]);
      setRoles(rolesRes.data);
      setPermissions(permsRes.data);
    } finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!newRole.name || !newRole.displayName) return;
    try {
      await adminRolesApi.create(newRole);
      toast.success(t.admin.roleCreated);
      setShowCreate(false);
      setNewRole({ name: '', displayName: '', color: '#6366f1' });
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
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || t.admin.deleteFailed;
      toast.error(msg);
    }
  }

  async function handlePermissionToggle(roleId: string, permissionId: string, currentlyAssigned: boolean) {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;
    const currentIds = role.permissions.map((rp) => rp.permission.id);
    const newIds = currentlyAssigned ? currentIds.filter((id) => id !== permissionId) : [...currentIds, permissionId];
    try {
      await adminRolesApi.updatePermissions(roleId, newIds);
      load();
    } catch { toast.error(t.admin.updateFailed); }
  }

  const permissionGroups = permissions.reduce<Record<string, Permission[]>>((groups, p) => {
    (groups[p.group] ??= []).push(p);
    return groups;
  }, {});

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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.admin.roleManagement}</h1>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            {t.admin.newRole}
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
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

          <div className="lg:col-span-2">
            {selectedRole ? (
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-5 h-5 rounded-full" style={{ backgroundColor: selectedRole.color }} />
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{selectedRole.displayName}</h2>
                  <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{selectedRole.name}</span>
                </div>

                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">{t.admin.permissionMatrix}</h3>

                <div className="space-y-6">
                  {Object.entries(permissionGroups).map(([group, perms]) => (
                    <div key={group}>
                      <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">{group}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {perms.map((perm) => {
                          const isAssigned = selectedRole.permissions.some((rp) => rp.permission.id === perm.id);
                          return (
                            <label
                              key={perm.id}
                              className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                                isAssigned
                                  ? 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-950/20'
                                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isAssigned}
                                onChange={() => handlePermissionToggle(selectedRole.id, perm.id, isAssigned)}
                                className="w-4 h-4 rounded text-primary-600"
                              />
                              <span className="text-sm text-slate-700 dark:text-slate-300">{perm.displayName}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}

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

        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={t.admin.newRole} size="sm">
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
              <input
                type="color"
                value={newRole.color}
                onChange={(e) => setNewRole((p) => ({ ...p, color: e.target.value }))}
                className="w-full h-10 rounded-lg cursor-pointer"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">{t.common.cancel}</button>
              <button onClick={handleCreate} disabled={!newRole.name || !newRole.displayName} className="btn-primary flex-1">{t.common.create}</button>
            </div>
          </div>
        </Modal>
      </motion.div>
    </div>
  );
}
