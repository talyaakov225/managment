import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Database, Users, FolderKanban, CheckSquare, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  adminDashboardApi, adminAnalyticsApi, adminUsersApi,
  adminProjectsApi, adminSettingsApi,
} from '../../services/adminApi';
import { useLang } from '../../context/LangContext';
import type { AdminDashboardData } from '../../types/admin';

const BACKUP_KEY = 'admin_last_backup';

export function AdminBackup() {
  const { t, lang, dateLocale } = useLang();
  const he = lang === 'he';
  const [stats, setStats] = useState<AdminDashboardData | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const l = {
    title: he ? 'גיבוי ושחזור' : 'Backup & Restore',
    desc: he ? 'ייצוא נתוני המערכת כקובץ JSON' : 'Export system data as a JSON file',
    lastBackup: he ? 'גיבוי אחרון' : 'Last Backup',
    never: he ? 'טרם בוצע גיבוי' : 'No backup taken yet',
    export: he ? 'ייצוא כל הנתונים' : 'Export All Data',
    included: he ? 'כולל: משתמשים, פרויקטים, הגדרות, אנליטיקה וסטטיסטיקות' : 'Includes: users, projects, settings, analytics & stats',
    exporting: he ? 'מייצא...' : 'Exporting...',
    success: he ? 'הגיבוי הורד בהצלחה' : 'Backup downloaded successfully',
    failed: he ? 'ייצוא הגיבוי נכשל' : 'Backup export failed',
  };

  useEffect(() => {
    setLastBackup(localStorage.getItem(BACKUP_KEY));
    adminDashboardApi.get()
      .then((res) => { setStats(res.data); setLoadError(false); })
      .catch(() => setLoadError(true));
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      const [dashboard, analytics, users, projects, settings] = await Promise.all([
        adminDashboardApi.get().then((r) => r.data),
        adminAnalyticsApi.get().then((r) => r.data),
        adminUsersApi.getAll().then((r) => r.data),
        adminProjectsApi.getAll().then((r) => r.data),
        adminSettingsApi.getAll().then((r) => r.data),
      ]);
      const payload = { exportedAt: new Date().toISOString(), dashboard, analytics, users, projects, settings };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      const now = new Date().toISOString();
      localStorage.setItem(BACKUP_KEY, now);
      setLastBackup(now);
      toast.success(l.success);
    } catch {
      toast.error(l.failed);
    } finally {
      setExporting(false);
    }
  }

  const statCards = stats ? [
    { label: t.admin.totalUsers, value: stats.users, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: t.admin.totalProjects, value: stats.projects, icon: FolderKanban, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { label: t.admin.totalTasks, value: stats.tasks, icon: CheckSquare, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  ] : [];

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{l.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{l.desc}</p>
        </div>

        {loadError && (
          <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {he ? 'לא ניתן לטעון סטטיסטיקות. ניתן עדיין לייצא נתונים.' : 'Could not load stats. You can still export data.'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {statCards.map((s) => (
            <div key={s.label} className={`card p-5 ${s.bg}`}>
              <div className="flex items-center gap-4">
                <s.icon className={`w-6 h-6 ${s.color}`} />
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                  <p className="text-sm text-slate-500">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-500">{l.lastBackup}</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {lastBackup ? new Date(lastBackup).toLocaleString(dateLocale) : l.never}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-4 flex items-center gap-2">
            <Database className="w-3.5 h-3.5" />{l.included}
          </p>
          <button onClick={handleExport} disabled={exporting} className="btn-primary">
            <Download className="w-4 h-4" />
            {exporting ? l.exporting : l.export}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
