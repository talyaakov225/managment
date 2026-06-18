import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Trash2, UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { teamApi2, Team } from '../../services/api';
import { adminUsersApi } from '../../services/adminApi';
import { useLang } from '../../context/LangContext';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Avatar } from '../../components/Avatar';
import type { AdminUser } from '../../types/admin';

const DEFAULT_COLOR = '#6366f1';

export function AdminTeams() {
  const { lang } = useLang();
  const he = lang === 'he';
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: DEFAULT_COLOR, memberIds: [] as string[] });
  const [edit, setEdit] = useState({ name: '', description: '', color: DEFAULT_COLOR });
  const [addUserId, setAddUserId] = useState('');
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [t, u] = await Promise.all([teamApi2.getAll(), adminUsersApi.getAll()]);
      setTeams(t.data);
      setUsers(u.data);
    } finally { setLoading(false); }
  }

  function expandTeam(team: Team) {
    if (expanded === team.id) { setExpanded(null); return; }
    setExpanded(team.id);
    setEdit({ name: team.name, description: team.description || '', color: team.color });
    setAddUserId('');
  }

  async function handleCreate() {
    if (!form.name.trim()) return;
    try {
      await teamApi2.create({
        name: form.name.trim(),
        description: form.description || undefined,
        color: form.color,
        memberIds: form.memberIds.length ? form.memberIds : undefined,
      });
      toast.success(he ? 'הצוות נוצר' : 'Team created');
      setShowCreate(false);
      setForm({ name: '', description: '', color: DEFAULT_COLOR, memberIds: [] });
      load();
    } catch { toast.error(he ? 'יצירה נכשלה' : 'Create failed'); }
  }

  async function handleUpdate(id: string) {
    try {
      await teamApi2.update(id, { name: edit.name.trim(), description: edit.description || undefined, color: edit.color });
      toast.success(he ? 'נשמר' : 'Saved');
      load();
    } catch { toast.error(he ? 'עדכון נכשל' : 'Update failed'); }
  }

  async function handleDelete(id: string) {
    try {
      await teamApi2.delete(id);
      toast.success(he ? 'נמחק' : 'Deleted');
      if (expanded === id) setExpanded(null);
      load();
    } catch { toast.error(he ? 'מחיקה נכשלה' : 'Delete failed'); }
  }

  async function handleAddMember(teamId: string) {
    if (!addUserId) return;
    try {
      await teamApi2.addMember(teamId, addUserId);
      setAddUserId('');
      load();
    } catch { toast.error(he ? 'הוספה נכשלה' : 'Add failed'); }
  }

  async function handleRemoveMember(teamId: string, userId: string) {
    try {
      await teamApi2.removeMember(teamId, userId);
      load();
    } catch { toast.error(he ? 'הסרה נכשלה' : 'Remove failed'); }
  }

  function toggleFormMember(userId: string) {
    setForm((f) => ({
      ...f,
      memberIds: f.memberIds.includes(userId) ? f.memberIds.filter((id) => id !== userId) : [...f.memberIds, userId],
    }));
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {he ? 'ניהול צוותים' : 'Team Management'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {he ? 'יצירה וניהול של צוותים וחברים' : 'Create and manage teams and members'}
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> {he ? 'צוות חדש' : 'New Team'}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">{he ? 'טוען...' : 'Loading...'}</div>
        ) : teams.length === 0 ? (
          <div className="card p-12 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            {he ? 'אין צוותים עדיין' : 'No teams yet'}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {teams.map((team) => {
              const isOpen = expanded === team.id;
              const available = users.filter((u) => !team.members.some((m) => m.userId === u.id));
              return (
                <motion.div key={team.id} layout className="card overflow-hidden">
                  <button type="button" onClick={() => expandTeam(team)} className="w-full p-4 text-start">
                    <div className="flex items-start gap-3">
                      <span className="w-3 h-3 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: team.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-slate-900 dark:text-white truncate">{team.name}</h3>
                          <span className="text-xs text-slate-400 shrink-0">{team._count.members} {he ? 'חברים' : 'members'}</span>
                        </div>
                        {team.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{team.description}</p>}
                        {team.members.length > 0 && (
                          <div className="flex -space-x-2 rtl:space-x-reverse mt-3">
                            {team.members.slice(0, 5).map((m) => (
                              <Avatar key={m.userId} name={m.user?.name || '?'} avatar={m.user?.avatar} size="xs" className="ring-2 ring-white dark:ring-slate-800" />
                            ))}
                            {team._count.members > 5 && (
                              <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-[9px] flex items-center justify-center text-slate-600 dark:text-slate-300 ring-2 ring-white dark:ring-slate-800">
                                +{team._count.members - 5}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-slate-200 dark:border-slate-700">
                        <div className="p-4 space-y-3">
                          <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="input w-full" placeholder={he ? 'שם' : 'Name'} />
                          <textarea value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} className="input w-full min-h-[60px]" placeholder={he ? 'תיאור' : 'Description'} />
                          <div className="flex items-center gap-2">
                            <input type="color" value={edit.color} onChange={(e) => setEdit({ ...edit, color: e.target.value })} className="w-8 h-8 rounded cursor-pointer" />
                            <button onClick={() => handleUpdate(team.id)} className="btn-primary text-sm">{he ? 'שמור' : 'Save'}</button>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-slate-500 uppercase">{he ? 'חברים' : 'Members'}</p>
                            {team.members.map((m) => (
                              <div key={m.userId} className="flex items-center justify-between gap-2 py-1">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Avatar name={m.user?.name || '?'} avatar={m.user?.avatar} size="xs" />
                                  <span className="text-sm truncate">{m.user?.name}</span>
                                </div>
                                <button onClick={() => handleRemoveMember(team.id, m.userId)} className="btn-ghost p-1 text-red-500"><X className="w-4 h-4" /></button>
                              </div>
                            ))}
                            {available.length > 0 && (
                              <div className="flex gap-2 pt-1">
                                <select value={addUserId} onChange={(e) => setAddUserId(e.target.value)} className="input flex-1 text-sm">
                                  <option value="">{he ? 'הוסף חבר...' : 'Add member...'}</option>
                                  {available.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                                <button onClick={() => handleAddMember(team.id)} disabled={!addUserId} className="btn-secondary p-2"><UserPlus className="w-4 h-4" /></button>
                              </div>
                            )}
                          </div>
                          <button onClick={() => setDeleteTeamId(team.id)} className="btn-ghost text-red-500 text-sm flex items-center gap-1 w-full justify-center pt-2">
                            <Trash2 className="w-4 h-4" /> {he ? 'מחק צוות' : 'Delete team'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={he ? 'צוות חדש' : 'New Team'} size="lg">
        <div className="space-y-4">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input w-full" placeholder={he ? 'שם הצוות *' : 'Team name *'} />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input w-full min-h-[60px]" placeholder={he ? 'תיאור' : 'Description'} />
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-500">{he ? 'צבע' : 'Color'}</label>
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-8 h-8 rounded cursor-pointer" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{he ? 'חברים' : 'Members'}</p>
            <div className="max-h-40 overflow-y-auto space-y-1 border border-slate-200 dark:border-slate-700 rounded-lg p-2">
              {users.map((u) => (
                <label key={u.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                  <input type="checkbox" checked={form.memberIds.includes(u.id)} onChange={() => toggleFormMember(u.id)} className="rounded" />
                  <Avatar name={u.name} avatar={u.avatar} size="xs" />
                  <span className="text-sm">{u.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowCreate(false)} className="btn-secondary">{he ? 'ביטול' : 'Cancel'}</button>
            <button onClick={handleCreate} disabled={!form.name.trim()} className="btn-primary">{he ? 'צור' : 'Create'}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTeamId}
        onClose={() => setDeleteTeamId(null)}
        onConfirm={() => { if (deleteTeamId) handleDelete(deleteTeamId); }}
        title={he ? 'מחיקת צוות' : 'Delete Team'}
        message={he ? 'למחוק את הצוות? פעולה זו אינה ניתנת לביטול' : 'Delete this team? This action cannot be undone'}
        confirmText={he ? 'מחק' : 'Delete'}
        cancelText={he ? 'ביטול' : 'Cancel'}
      />
    </div>
  );
}
