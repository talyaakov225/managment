import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { adminSettingsApi } from '../../services/adminApi';
import { useLang } from '../../context/LangContext';
import type { SystemSetting } from '../../types/admin';

const NOTIFY_TYPES = [
  { key: 'notify.task_assigned', he: 'שיוך משימה', en: 'Task Assigned' },
  { key: 'notify.task_comment', he: 'תגובה על משימה', en: 'Task Comment' },
  { key: 'notify.task_status_change', he: 'שינוי סטטוס משימה', en: 'Task Status Change' },
  { key: 'notify.chat_message', he: 'הודעת צ׳אט', en: 'Chat Message' },
  { key: 'notify.reminder', he: 'תזכורת', en: 'Reminder' },
] as const;

interface AppNotification {
  id: string; type: string; title: string; body: string; read: boolean; createdAt: string;
}

function Toggle({ on, onToggle, rtl }: { on: boolean; onToggle: () => void; rtl: boolean }) {
  return (
    <button onClick={onToggle} className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border-2 border-transparent transition-colors ${on ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
      <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition ${on ? (rtl ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'}`} />
    </button>
  );
}

export function AdminNotifications() {
  const { t, lang, dateLocale } = useLang();
  const he = lang === 'he';
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [settingsRes, notifRes] = await Promise.all([
        adminSettingsApi.getAll(),
        api.get<AppNotification[]>('/notifications').catch(() => ({ data: [] as AppNotification[] })),
      ]);
      setSettings(settingsRes.data);
      setNotifications(notifRes.data.slice(0, 20));
      const map: Record<string, boolean> = {};
      NOTIFY_TYPES.forEach(({ key }) => {
        const s = settingsRes.data.find((x) => x.key === key);
        map[key] = s ? s.value === 'true' : true;
      });
      setToggles(map);
    } finally { setLoading(false); }
  }

  async function handleToggle(key: string) {
    const newVal = !toggles[key];
    setToggles((p) => ({ ...p, [key]: newVal }));
    try {
      const existing = settings.find((s) => s.key === key);
      if (existing) await adminSettingsApi.update(existing.id, String(newVal));
      else await adminSettingsApi.create({ key, value: String(newVal), type: 'boolean', group: 'notifications', label_he: key, label_en: key });
      toast.success(t.common.saved);
      load();
    } catch {
      setToggles((p) => ({ ...p, [key]: !newVal }));
      toast.error(t.admin.updateFailed);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{he ? 'ניהול התראות' : 'Notification Management'}</h1>
          <p className="text-sm text-slate-500 mt-1">{he ? 'הגדרת סוגי ההתראות שנשלחות למשתמשים' : 'Configure which notification types are sent to users'}</p>
        </div>

        <div className="space-y-3 mb-8">
          {NOTIFY_TYPES.map(({ key, he: labelHe, en }) => (
            <div key={key} className="card p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {toggles[key] ? <Bell className="w-5 h-5 text-blue-500" /> : <BellOff className="w-5 h-5 text-slate-400" />}
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{he ? labelHe : en}</p>
                  <p className="text-xs text-slate-400 font-mono">{key}</p>
                </div>
              </div>
              <Toggle on={!!toggles[key]} onToggle={() => handleToggle(key)} rtl={he} />
            </div>
          ))}
        </div>

        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">{he ? 'התראות אחרונות' : 'Recent Notifications'}</h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
              <th className="text-start p-3 font-medium">{he ? 'סוג' : 'Type'}</th>
              <th className="text-start p-3 font-medium">{he ? 'כותרת' : 'Title'}</th>
              <th className="text-start p-3 font-medium">{he ? 'תאריך' : 'Date'}</th>
            </tr></thead>
            <tbody>
              {notifications.length === 0 ? (
                <tr><td colSpan={3} className="p-8 text-center text-slate-400">{he ? 'אין התראות' : 'No notifications'}</td></tr>
              ) : notifications.map((n) => (
                <tr key={n.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <td className="p-3 font-mono text-xs text-slate-500">{n.type}</td>
                  <td className="p-3 text-slate-700 dark:text-slate-300">{n.title}</td>
                  <td className="p-3 text-slate-400 whitespace-nowrap">{new Date(n.createdAt).toLocaleString(dateLocale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
