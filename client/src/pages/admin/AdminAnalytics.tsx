import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, Users, TrendingUp, BarChart3 } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { adminAnalyticsApi } from '../../services/adminApi';
import { useLang } from '../../context/LangContext';
import { Avatar } from '../../components/Avatar';

interface AnalyticsData {
  monthly: { month: string; created: number; completed: number }[];
  avgCompletionDays: number;
  tasksByPriority: { priority: string; count: number }[];
  userStats: { id: string; name: string; avatar: string | null; created: number; assigned: number }[];
  totalCompleted: number;
}

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444'];

function formatMonth(month: string, locale: string) {
  const [y, m] = month.split('-');
  return new Date(+y, +m - 1).toLocaleDateString(locale, { month: 'short' });
}

export function AdminAnalytics() {
  const { t, lang, dateLocale } = useLang();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const he = lang === 'he';

  const l = {
    title: he ? 'אנליטיקה' : 'Analytics',
    desc: he ? 'סקירת ביצועים ומגמות משימות' : 'Task performance overview and trends',
    totalCompleted: he ? 'משימות שהושלמו' : 'Total Completed',
    avgDays: he ? 'זמן השלמה ממוצע (ימים)' : 'Avg Completion Time (days)',
    activeUsers: he ? 'משתמשים פעילים' : 'Active Users',
    monthlyTrend: he ? 'משימות חודשיות' : 'Monthly Tasks',
    created: he ? 'נוצרו' : 'Created',
    completed: he ? 'הושלמו' : 'Completed',
    byPriority: he ? 'משימות לפי עדיפות' : 'Tasks by Priority',
    userPerf: he ? 'ביצועי משתמשים' : 'User Performance',
    name: he ? 'שם' : 'Name',
    tasksCreated: he ? 'נוצרו' : 'Created',
    tasksAssigned: he ? 'שויכו' : 'Assigned',
  };

  useEffect(() => {
    adminAnalyticsApi.get().then((res) => setData(res.data));
  }, []);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-400">{t.common.loading}</span>
      </div>
    );
  }

  const monthly = data.monthly.map((m) => ({
    ...m,
    label: formatMonth(m.month, dateLocale),
  }));

  const stats = [
    { label: l.totalCompleted, value: data.totalCompleted, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: l.avgDays, value: data.avgCompletionDays, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: l.activeUsers, value: data.userStats.length, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  ];

  const tooltipStyle = {
    backgroundColor: 'var(--tw-bg-opacity, 1)',
    border: '1px solid rgb(226 232 240)',
    borderRadius: '8px',
    fontSize: '12px',
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{l.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{l.desc}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className={`card p-6 ${s.bg}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.bg}`}>
                  <s.icon className={`w-6 h-6 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                  <p className="text-sm text-slate-500">{s.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{l.monthlyTrend}</h2>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="created" name={l.created} stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="completed" name={l.completed} stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{l.byPriority}</h2>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.tasksByPriority}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="priority" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {data.tasksByPriority.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{l.userPerf}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                  <th className="text-start py-3 px-2 font-medium">{l.name}</th>
                  <th className="text-end py-3 px-2 font-medium">{l.tasksCreated}</th>
                  <th className="text-end py-3 px-2 font-medium">{l.tasksAssigned}</th>
                </tr>
              </thead>
              <tbody>
                {data.userStats.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} avatar={u.avatar} size="sm" />
                        <span className="font-medium text-slate-900 dark:text-white">{u.name}</span>
                      </div>
                    </td>
                    <td className="text-end py-3 px-2 text-slate-700 dark:text-slate-300">{u.created}</td>
                    <td className="text-end py-3 px-2 text-slate-700 dark:text-slate-300">{u.assigned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
