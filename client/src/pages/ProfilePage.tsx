import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, BarChart3, CheckCircle, Clock } from 'lucide-react';
import { taskApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { Avatar } from '../components/Avatar';
import type { DashboardStats } from '../types';

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  USER: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
};

export function ProfilePage() {
  const { user } = useAuth();
  const { t, lang, dateLocale } = useLang();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardStats | null>(null);

  useEffect(() => {
    taskApi.getDashboard().then((res) => setData(res.data)).catch(() => {});
  }, []);

  const stats = data?.stats ?? { total: 0, todo: 0, inProgress: 0, review: 0, done: 0 };
  const completionRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  const role = user?.globalRole || 'USER';

  const statCards = [
    { label: lang === 'he' ? 'סה"כ משימות' : 'Total Tasks', value: stats.total, icon: User, bg: 'bg-slate-50 dark:bg-slate-800/50' },
    { label: t.dashboard.completed, value: stats.done, icon: CheckCircle, bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: t.dashboard.inProgress, value: stats.inProgress, icon: Clock, bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: lang === 'he' ? 'אחוז השלמה' : 'Completion Rate', value: `${completionRate}%`, icon: BarChart3, bg: 'bg-violet-50 dark:bg-violet-900/20' },
  ];

  const distribution = [
    { key: 'done', label: t.dashboard.completed, count: stats.done, color: 'bg-emerald-500' },
    { key: 'review', label: t.dashboard.inReview, count: stats.review, color: 'bg-amber-500' },
    { key: 'inProgress', label: t.dashboard.inProgress, count: stats.inProgress, color: 'bg-blue-500' },
    { key: 'todo', label: t.dashboard.todo, count: stats.todo, color: 'bg-slate-300 dark:bg-slate-600' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
        {/* Profile Header */}
        <motion.div variants={fade} className="card p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar name={user?.name || '?'} avatar={user?.avatar} size="xl" className="!w-24 !h-24 !text-3xl ring-4 ring-primary-100 dark:ring-primary-900/40" />
            <div className="flex-1 text-center sm:text-start">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{user?.name}</h1>
              <p className="flex items-center justify-center sm:justify-start gap-2 mt-1 text-slate-500 dark:text-slate-400">
                <Mail className="w-4 h-4 shrink-0" />
                {user?.email}
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-4">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${roleColors[role] || roleColors.USER}`}>
                  <User className="w-3.5 h-3.5" />
                  {role.replace('_', ' ')}
                </span>
                {user?.createdAt && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                    <Calendar className="w-4 h-4" />
                    {lang === 'he' ? 'חבר מאז' : 'Member since'}{' '}
                    {new Date(user.createdAt).toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Statistics */}
        <motion.div variants={fade} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div key={card.label} className="card p-5">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                <card.icon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{card.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Activity Chart */}
        <motion.div variants={fade} className="card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-950/40 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {lang === 'he' ? 'התפלגות משימות' : 'Task Distribution'}
            </h2>
          </div>
          {stats.total > 0 ? (
            <>
              <div className="flex gap-0.5 h-4 rounded-full overflow-hidden mb-4">
                {distribution.filter((d) => d.count > 0).map((d) => (
                  <motion.div
                    key={d.key}
                    initial={{ width: 0 }}
                    animate={{ width: `${(d.count / stats.total) * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`${d.color} min-w-[2px]`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                {distribution.map((d) => (
                  <span key={d.key} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${d.color}`} />
                    {d.label} ({d.count})
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">
              {lang === 'he' ? 'אין משימות עדיין' : 'No tasks yet'}
            </p>
          )}
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={fade} className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            {lang === 'he' ? 'פעילות אחרונה' : 'Recent Activity'}
          </h2>
          {data?.recentTasks && data.recentTasks.length > 0 ? (
            <div className="space-y-2">
              {data.recentTasks.slice(0, 8).map((task) => (
                <div
                  key={task.id}
                  onClick={() => navigate(`/projects/${task.projectId}`)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    task.status === 'DONE' ? 'bg-emerald-500' : task.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-slate-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{task.title}</p>
                    {task.project?.name && <p className="text-xs text-slate-500 truncate">{task.project.name}</p>}
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {new Date(task.updatedAt || task.createdAt).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">
              {lang === 'he' ? 'אין פעילות אחרונה' : 'No recent activity'}
            </p>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
