import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Shield, Trash2, ChevronDown, CheckCircle2, XCircle, Clock, Bell, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { adminUsersApi, adminRolesApi } from '../../services/adminApi';
import { useLang } from '../../context/LangContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/Modal';
import { Avatar } from '../../components/Avatar';
import type { AdminUser, AdminRole } from '../../types/admin';

export function AdminUsers() {
  const { t, dateLocale } = useLang();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [openRoleDropdown, setOpenRoleDropdown] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUser, setResetUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { load(); }, [filter]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenRoleDropdown(null);
      }
    }
    if (openRoleDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openRoleDropdown]);

  async function load() {
    setLoading(true);
    try {
      const [usersRes, rolesRes, pendingRes] = await Promise.all([
        adminUsersApi.getAll(search || undefined, filter),
        adminRolesApi.getAll(),
        adminUsersApi.getPendingCount(),
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
      setPendingCount(pendingRes.data.count);
    } finally { setLoading(false); }
  }

  async function handleSearch() {
    const { data } = await adminUsersApi.getAll(search || undefined, filter);
    setUsers(data);
  }

  async function handleApprove(userId: string) {
    try {
      await adminUsersApi.approve(userId);
      toast.success(t.admin.userApproved);
      load();
    } catch { toast.error(t.admin.updateFailed); }
  }

  async function handleReject(userId: string) {
    if (!confirm(t.admin.rejectUserConfirm)) return;
    try {
      await adminUsersApi.reject(userId);
      toast.success(t.admin.userRejected);
      load();
    } catch { toast.error(t.admin.deleteFailed); }
  }

  async function handleGlobalRoleChange(userId: string, globalRole: string) {
    try {
      await adminUsersApi.updateGlobalRole(userId, globalRole);
      toast.success(t.admin.roleUpdated);
      load();
    } catch { toast.error(t.admin.updateFailed); }
  }

  async function handleDelete(userId: string) {
    if (!confirm(t.admin.deleteUserConfirm)) return;
    try {
      await adminUsersApi.delete(userId);
      toast.success(t.admin.userDeleted);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      load();
    } catch { toast.error(t.admin.deleteFailed); }
  }

  async function handleResetPassword() {
    if (!resetUser || !newPassword || newPassword.length < 6) {
      toast.error(t.admin.passwordMinLength || 'הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }
    setResettingPassword(true);
    try {
      await api.put('/auth/admin-reset-password', { email: resetUser.email, newPassword });
      toast.success(t.admin.passwordResetSuccess || 'הסיסמה אופסה בהצלחה');
      setShowResetModal(false);
      setNewPassword('');
      setResetUser(null);
    } catch {
      toast.error(t.admin.passwordResetFailed || 'שגיאה באיפוס הסיסמה');
    } finally {
      setResettingPassword(false);
    }
  }

  async function handleCustomRolesUpdate(userId: string, roleIds: string[]) {
    try {
      await adminUsersApi.updateCustomRoles(userId, roleIds);
      toast.success(t.admin.rolesUpdated);
      load();
      setShowRoleModal(false);
    } catch { toast.error(t.admin.updateFailed); }
  }

  const roleColors: Record<string, string> = {
    SUPER_ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    ADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    USER: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.admin.userManagement}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.admin.usersDesc}</p>
          </div>
          <span className="text-sm text-slate-400">{users.length} {t.admin.users}</span>
        </div>

        {pendingCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t.admin.pendingApprovals}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">{pendingCount} {t.admin.usersWaitingApproval}</p>
            </div>
            <button
              onClick={() => setFilter('pending')}
              className="btn-primary text-sm bg-amber-500 hover:bg-amber-600"
            >
              {t.admin.viewPending}
            </button>
          </motion.div>
        )}

        <div className="card p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                className="input ps-11"
                placeholder={t.admin.searchUsers}
                value={search}
                onChange={(e) => { setSearch(e.target.value); handleSearch(); }}
              />
            </div>
            <div className="flex gap-2">
              {[
                { key: 'all', label: t.admin.allUsers },
                { key: 'pending', label: t.admin.pending, count: pendingCount },
                { key: 'approved', label: t.admin.approved },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    filter === f.key
                      ? 'bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {f.label}
                  {f.count !== undefined && f.count > 0 && (
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center">{f.count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((u) => (
              <div key={u.id} className={`card p-4 flex items-center gap-4 ${!u.isApproved ? 'border-2 border-amber-300 dark:border-amber-700' : ''}`}>
                <Avatar name={u.name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900 dark:text-white">
                      {u.name}
                      {u.id === currentUser?.id && <span className="text-xs text-slate-400 ms-2">({t.common.you})</span>}
                    </p>
                    {!u.isApproved && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">
                        <Clock className="w-3 h-3" />
                        {t.admin.pendingApproval}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 truncate">{u.email}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(u.createdAt).toLocaleDateString(dateLocale)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  {!u.isApproved ? (
                    <>
                      <button
                        onClick={() => handleApprove(u.id)}
                        className="btn-primary text-sm flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {t.admin.approve}
                      </button>
                      <button
                        onClick={() => handleReject(u.id)}
                        className="btn-ghost text-sm flex items-center gap-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <XCircle className="w-4 h-4" />
                        {t.admin.reject}
                      </button>
                    </>
                  ) : (
                    <>
                      {u.userRoles.map((ur) => (
                        <span
                          key={ur.role.id}
                          className="text-xs px-2 py-1 rounded-md font-medium"
                          style={{ backgroundColor: ur.role.color + '20', color: ur.role.color }}
                        >
                          {ur.role.displayName}
                        </span>
                      ))}

                      <button
                        onClick={() => { setSelectedUser(u); setShowRoleModal(true); }}
                        className="btn-ghost p-1.5"
                        title={t.admin.manageRoles}
                      >
                        <Shield className="w-4 h-4" />
                      </button>

                      {currentUser?.globalRole === 'SUPER_ADMIN' && (
                        <div className="relative" ref={openRoleDropdown === u.id ? dropdownRef : undefined}>
                          <button
                            onClick={() => setOpenRoleDropdown(openRoleDropdown === u.id ? null : u.id)}
                            className={`text-xs px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1 ${roleColors[u.globalRole] || roleColors.USER}`}
                          >
                            {u.globalRole}
                            <ChevronDown className={`w-3 h-3 transition-transform ${openRoleDropdown === u.id ? 'rotate-180' : ''}`} />
                          </button>
                          {openRoleDropdown === u.id && (
                            <div className="absolute end-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-10 min-w-[140px]">
                              {['USER', 'ADMIN', 'SUPER_ADMIN'].map((role) => (
                                <button
                                  key={role}
                                  onClick={() => { handleGlobalRoleChange(u.id, role); setOpenRoleDropdown(null); }}
                                  className={`w-full text-start px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${u.globalRole === role ? 'font-bold text-primary-600' : 'text-slate-700 dark:text-slate-300'}`}
                                >
                                  {role}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {(currentUser?.globalRole === 'SUPER_ADMIN' || currentUser?.globalRole === 'ADMIN') && u.id !== currentUser.id && (
                        <button
                          onClick={() => { setResetUser(u); setNewPassword(''); setShowResetModal(true); }}
                          className="btn-ghost p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                          title={t.admin.resetPassword || 'איפוס סיסמה'}
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                      )}

                      {currentUser?.globalRole === 'SUPER_ADMIN' && u.id !== currentUser.id && (
                        <button onClick={() => handleDelete(u.id)} className="btn-ghost p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Modal isOpen={showRoleModal} onClose={() => setShowRoleModal(false)} title={t.admin.manageRoles} size="sm">
          {selectedUser && (
            <RoleAssigner
              user={selectedUser}
              roles={roles}
              onSave={(roleIds) => handleCustomRolesUpdate(selectedUser.id, roleIds)}
              t={t}
            />
          )}
        </Modal>

        <Modal isOpen={showResetModal} onClose={() => { setShowResetModal(false); setResetUser(null); setNewPassword(''); }} title={t.admin.resetPassword || 'איפוס סיסמה'} size="sm">
          {resetUser && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t.admin.resetPasswordFor || 'איפוס סיסמה עבור'}: <strong>{resetUser.name}</strong> ({resetUser.email})
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.admin.newPassword || 'סיסמה חדשה'}
                </label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder={t.admin.enterNewPassword || 'הזינו סיסמה חדשה (מינימום 6 תווים)'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setShowResetModal(false); setResetUser(null); }} className="btn-ghost px-4 py-2">
                  {t.common.cancel}
                </button>
                <button onClick={handleResetPassword} disabled={resettingPassword || newPassword.length < 6} className="btn-primary px-4 py-2">
                  {resettingPassword ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    t.admin.resetPasswordBtn || 'אפס סיסמה'
                  )}
                </button>
              </div>
            </div>
          )}
        </Modal>
      </motion.div>
    </div>
  );
}

function RoleAssigner({ user, roles, onSave, t }: {
  user: AdminUser;
  roles: AdminRole[];
  onSave: (roleIds: string[]) => void;
  t: ReturnType<typeof useLang>['t'];
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(user.userRoles.map((ur) => ur.role.id))
  );

  function toggle(roleId: string) {
    const next = new Set(selected);
    if (next.has(roleId)) next.delete(roleId);
    else next.add(roleId);
    setSelected(next);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">{t.admin.selectRolesFor} <strong>{user.name}</strong></p>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {roles.map((role) => (
          <label key={role.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={selected.has(role.id)}
              onChange={() => toggle(role.id)}
              className="w-4 h-4 rounded text-primary-600"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">{role.displayName}</p>
              <p className="text-xs text-slate-400">{role.permissions.length} {t.admin.permissions}</p>
            </div>
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color }} />
          </label>
        ))}
      </div>
      <button onClick={() => onSave(Array.from(selected))} className="btn-primary w-full">
        {t.common.save}
      </button>
    </div>
  );
}
