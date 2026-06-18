import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Trash2, Save, Eye, EyeOff,
  LayoutDashboard, ListTodo, Clock, MessageCircle, CalendarDays,
  LayoutTemplate, GanttChart, UsersRound, StickyNote, AlarmClock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminSettingsApi } from '../../services/adminApi';
import { authApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import type { SystemSetting } from '../../types/admin';

const NAV_ITEMS = [
  { key: 'dashboard', icon: LayoutDashboard, label_he: 'דשבורד', label_en: 'Dashboard' },
  { key: 'tasks', icon: ListTodo, label_he: 'משימות', label_en: 'Tasks' },
  { key: 'history', icon: Clock, label_he: 'היסטוריה', label_en: 'History' },
  { key: 'chat', icon: MessageCircle, label_he: "צ'אט", label_en: 'Chat' },
  { key: 'calendar', icon: CalendarDays, label_he: 'לוח שנה', label_en: 'Calendar' },
  { key: 'templates', icon: LayoutTemplate, label_he: 'תבניות', label_en: 'Templates' },
  { key: 'gantt', icon: GanttChart, label_he: 'ציר זמן', label_en: 'Timeline' },
  { key: 'team-board', icon: UsersRound, label_he: 'לוח צוות', label_en: 'Team Board' },
  { key: 'notes', icon: StickyNote, label_he: 'פתקים', label_en: 'Notes' },
  { key: 'reminders', icon: AlarmClock, label_he: 'תזכורות', label_en: 'Reminders' },
];

export function AdminSettings() {
  const { t, lang } = useLang();
  const { user, updateUser } = useAuth();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [newSetting, setNewSetting] = useState({ key: '', value: '', type: 'string', group: 'general', label_he: '', label_en: '' });
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [hiddenNav, setHiddenNav] = useState<Set<string>>(new Set());
  const [savingNav, setSavingNav] = useState(false);
  const [deleteSettingId, setDeleteSettingId] = useState<string | null>(null);

  useEffect(() => { load(); loadNavConfig(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await adminSettingsApi.getAll();
      setSettings(data);
      const editMap: Record<string, string> = {};
      data.forEach((s) => { editMap[s.id] = s.value; });
      setEditing(editMap);
    } finally { setLoading(false); }
  }

  async function loadNavConfig() {
    try {
      const { data } = await adminSettingsApi.getNavConfig();
      setHiddenNav(new Set(data.hidden));
    } catch { /* silent */ }
  }

  async function toggleNavItem(key: string) {
    setSavingNav(true);
    const newSet = new Set(hiddenNav);
    if (newSet.has(key)) newSet.delete(key); else newSet.add(key);
    try {
      await adminSettingsApi.updateNavConfig(Array.from(newSet));
      setHiddenNav(newSet);
      toast.success(lang === 'he' ? 'התפריט עודכן' : 'Menu updated');
    } catch { toast.error(lang === 'he' ? 'שגיאה בעדכון' : 'Update failed'); }
    finally { setSavingNav(false); }
  }

  async function handleSave(setting: SystemSetting) {
    const newValue = editing[setting.id];
    if (newValue === setting.value) return;
    try {
      await adminSettingsApi.update(setting.id, newValue);
      toast.success(t.common.saved);
      load();
    } catch { toast.error(t.admin.updateFailed); }
  }

  async function handleCreate() {
    if (!newSetting.key || !newSetting.value) return;
    try {
      await adminSettingsApi.create(newSetting);
      toast.success(t.admin.created);
      setShowCreate(false);
      setNewSetting({ key: '', value: '', type: 'string', group: 'general', label_he: '', label_en: '' });
      load();
    } catch { toast.error(t.admin.createFailed); }
  }

  async function handleDelete(id: string) {
    try {
      await adminSettingsApi.delete(id);
      toast.success(t.admin.deleted);
      load();
    } catch { toast.error(t.admin.deleteFailed); }
  }

  async function toggleSeeAllTasks() {
    setTogglingVisibility(true);
    try {
      const newVal = !user?.seeAllTasks;
      const { data } = await authApi.updatePreferences({ seeAllTasks: newVal });
      updateUser(data);
      toast.success(lang === 'he'
        ? (newVal ? 'כעת תראה את כל המשימות במערכת' : 'כעת תראה רק משימות שהוקצו/נוצרו על ידך')
        : (newVal ? 'Now viewing all tasks in the system' : 'Now viewing only your tasks'));
    } catch { toast.error(lang === 'he' ? 'שגיאה בעדכון' : 'Update failed'); }
    finally { setTogglingVisibility(false); }
  }

  const groups = settings.reduce<Record<string, SystemSetting[]>>((acc, s) => {
    (acc[s.group] ??= []).push(s);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.admin.systemSettings}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.admin.settingsDesc}</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" />{t.admin.addSetting}
          </button>
        </div>

        {/* Admin Preferences */}
        <div className="mb-8">
          <h2 className="text-sm font-bold uppercase text-slate-400 mb-3">
            {lang === 'he' ? 'העדפות אדמין' : 'Admin Preferences'}
          </h2>
          <div className="card p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${user?.seeAllTasks ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                  {user?.seeAllTasks ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {lang === 'he' ? 'הצגת כל המשימות' : 'Show all tasks'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {lang === 'he'
                      ? 'כשמופעל, תראה את כל המשימות במערכת כולל כאלה שלא הוקצו אליך'
                      : 'When enabled, you\'ll see all tasks in the system including ones not assigned to you'}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleSeeAllTasks}
                disabled={togglingVisibility}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  user?.seeAllTasks ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                } ${togglingVisibility ? 'opacity-50' : ''}`}
              >
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                  user?.seeAllTasks ? (lang === 'he' ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
                }`} />
              </button>
            </div>
            {user?.seeAllTasks && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {lang === 'he'
                    ? '⚡ מצב פעיל – אתה רואה את כל המשימות במערכת, כולל כאלה שנוצרו על ידי משתמשים אחרים ולא הוקצו אליך.'
                    : '⚡ Active – You are viewing all tasks in the system, including those created by other users and not assigned to you.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Navigation Management */}
        <div className="mb-8">
          <h2 className="text-sm font-bold uppercase text-slate-400 mb-3">
            {lang === 'he' ? 'ניהול תפריט צדדי' : 'Sidebar Navigation'}
          </h2>
          <div className="card p-5">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {lang === 'he' ? 'בחר אילו כפתורים להציג בתפריט הצדדי. כפתורים מוסתרים לא יופיעו לאף משתמש.' : 'Choose which buttons to show in the sidebar. Hidden items won\'t appear for any user.'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {NAV_ITEMS.map((item) => {
                const isHidden = hiddenNav.has(item.key);
                return (
                  <button
                    key={item.key}
                    onClick={() => toggleNavItem(item.key)}
                    disabled={savingNav}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                      isHidden
                        ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                        : 'bg-white dark:bg-slate-800 border-primary-200 dark:border-primary-800 text-slate-700 dark:text-slate-200'
                    } ${savingNav ? 'opacity-50' : 'hover:shadow-sm'}`}
                  >
                    <item.icon className={`w-5 h-5 shrink-0 ${isHidden ? 'text-slate-300 dark:text-slate-600' : 'text-primary-500'}`} />
                    <span className="flex-1 text-start">{lang === 'he' ? item.label_he : item.label_en}</span>
                    {isHidden
                      ? <EyeOff className="w-4 h-4 text-slate-400" />
                      : <Eye className="w-4 h-4 text-emerald-500" />
                    }
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {Object.entries(groups).map(([group, groupSettings]) => (
          <div key={group} className="mb-8">
            <h2 className="text-sm font-bold uppercase text-slate-400 mb-3">{group}</h2>
            <div className="space-y-3">
              {groupSettings.map((setting) => (
                <div key={setting.id} className="card p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {(lang === 'he' ? setting.label_he : setting.label_en) || setting.key}
                      </p>
                      <p className="text-xs text-slate-400 font-mono">{setting.key}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded">{setting.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    {setting.type === 'boolean' ? (
                      <button
                        onClick={() => { setEditing((p) => ({ ...p, [setting.id]: editing[setting.id] === 'true' ? 'false' : 'true' })); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          editing[setting.id] === 'true'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {editing[setting.id] === 'true' ? 'ON' : 'OFF'}
                      </button>
                    ) : (
                      <input
                        className="input flex-1"
                        value={editing[setting.id] || ''}
                        onChange={(e) => setEditing((p) => ({ ...p, [setting.id]: e.target.value }))}
                      />
                    )}
                    <button
                      onClick={() => handleSave(setting)}
                      disabled={editing[setting.id] === setting.value}
                      className="btn-primary p-2"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteSettingId(setting.id)} className="btn-ghost p-2 text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {settings.length === 0 && (
          <div className="card p-12 text-center">
            <p className="text-slate-400">{t.admin.noSettings}</p>
          </div>
        )}

        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={t.admin.addSetting} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Key</label>
              <input className="input" dir="ltr" placeholder="e.g. app.maintenance" value={newSetting.key} onChange={(e) => setNewSetting((p) => ({ ...p, key: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Value</label>
              <input className="input" value={newSetting.value} onChange={(e) => setNewSetting((p) => ({ ...p, value: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Type</label>
                <select className="input" value={newSetting.type} onChange={(e) => setNewSetting((p) => ({ ...p, type: e.target.value }))}>
                  <option value="string">string</option>
                  <option value="boolean">boolean</option>
                  <option value="number">number</option>
                  <option value="json">json</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Group</label>
                <input className="input" value={newSetting.group} onChange={(e) => setNewSetting((p) => ({ ...p, group: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.labelHe}</label>
                <input className="input" value={newSetting.label_he} onChange={(e) => setNewSetting((p) => ({ ...p, label_he: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.labelEn}</label>
                <input className="input" value={newSetting.label_en} onChange={(e) => setNewSetting((p) => ({ ...p, label_en: e.target.value }))} />
              </div>
            </div>
            <button onClick={handleCreate} disabled={!newSetting.key} className="btn-primary w-full">{t.common.create}</button>
          </div>
        </Modal>

        <ConfirmDialog
          isOpen={!!deleteSettingId}
          onClose={() => setDeleteSettingId(null)}
          onConfirm={() => { if (deleteSettingId) handleDelete(deleteSettingId); }}
          title={t.admin.deleteSettingConfirm}
          message={he ? 'פעולה זו אינה ניתנת לביטול' : 'This action cannot be undone'}
          confirmText={he ? 'מחק' : 'Delete'}
          cancelText={he ? 'ביטול' : 'Cancel'}
        />
      </motion.div>
    </div>
  );
}
