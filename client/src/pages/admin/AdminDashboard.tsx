import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, FolderKanban, CheckSquare, Activity, Bell } from 'lucide-react';
import { adminDashboardApi, adminUsersApi } from '../../services/adminApi';
import { useLang } from '../../context/LangContext';
import type { AdminDashboardData } from '../../types/admin';

export function AdminDashboard() {
  const { t, dateLocale } = useLang();
  const navigate = useNavigate();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    adminDashboardApi.get().then((res) => setData(res.data));
    adminUsersApi.getPendingCount().then((res) => setPendingCount(res.data.count)).catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = [
    { label: t.admin.totalUsers, value: data.users, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: t.admin.totalProjects, value: data.projects, icon: FolderKanban, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { label: t.admin.totalTasks, value: data.tasks, icon: CheckSquare, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">{t.admin.dashboard}</h1>

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
              onClick={() => navigate('/admin/users')}
              className="btn-primary text-sm bg-amber-500 hover:bg-amber-600"
            >
              {t.admin.viewPending}
            </button>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className={`card p-5 ${stat.bg}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckSquare className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t.admin.tasksByStatus}</h2>
            </div>
            <div className="space-y-3">
              {data.tasksByStatus.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">{item.status}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{ width: `${data.tasks > 0 ? (item.count / data.tasks) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-900 dark:text-white w-8 text-end">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t.admin.recentActivity}</h2>
            </div>
            <div className="space-y-3">
              {data.recentActivity.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">{t.admin.noActivity}</p>
              )}
              {data.recentActivity.slice(0, 8).map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      <span className="font-medium">{log.user.name}</span>
                      {' — '}
                      <span className="text-slate-500">{log.action}</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(log.createdAt).toLocaleString(dateLocale)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
