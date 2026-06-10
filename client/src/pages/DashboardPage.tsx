import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ListTodo, Clock, CheckCircle2, Eye, TrendingUp,
  Calendar, ArrowRight, ArrowLeft, FolderKanban, Loader2,
} from 'lucide-react';
import { taskApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import type { DashboardStats, Project } from '../types';
import { PRIORITY_STYLE } from '../types';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export function DashboardPage() {
  const { user } = useAuth();
  const { t, isRTL, dateLocale } = useLang();
  const { projects } = useOutletContext<{ projects: Project[] }>();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  useEffect(() => {
    taskApi
      .getDashboard()
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  const stats = data?.stats ?? { total: 0, todo: 0, inProgress: 0, review: 0, done: 0 };
  const completionRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  const statCards = [
    { label: t.dashboard.todo, value: stats.todo, icon: ListTodo, iconColor: '#64748b', bg: 'bg-slate-50 dark:bg-slate-800/50' },
    { label: t.dashboard.inProgress, value: stats.inProgress, icon: Clock, iconColor: '#3b82f6', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: t.dashboard.inReview, value: stats.review, icon: Eye, iconColor: '#f59e0b', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: t.dashboard.completed, value: stats.done, icon: CheckCircle2, iconColor: '#10b981', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <motion.div variants={containerVariants} initial="hidden" animate="show">
        <motion.div variants={itemVariants} className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
            {t.dashboard.welcomeUser} {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t.dashboard.overview}</p>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => (
            <div key={stat.label} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5" style={{ color: stat.iconColor }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <motion.div variants={itemVariants} className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t.dashboard.overallProgress}</h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${completionRate}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
                    />
                  </div>
                </div>
                <span className="text-2xl font-bold text-primary-600">{completionRate}%</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                {stats.done} {t.dashboard.of} {stats.total} {t.dashboard.tasksCompleted}
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t.dashboard.upcomingDeadlines}</h2>
              </div>
              {data?.upcoming && data.upcoming.length > 0 ? (
                <div className="space-y-3">
                  {data.upcoming.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => navigate(`/projects/${task.projectId}`)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <div className={`w-2 h-2 rounded-full ${PRIORITY_STYLE[task.priority].dotColor}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{task.title}</p>
                        <p className="text-xs text-slate-500">{task.project?.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.assignee && <Avatar name={task.assignee.name} size="sm" />}
                        <span className="text-xs text-slate-500 whitespace-nowrap">
                          {task.dueDate && new Date(task.dueDate).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">{t.dashboard.noUpcoming}</p>
              )}
            </motion.div>
          </div>

          <motion.div variants={itemVariants} className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FolderKanban className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t.nav.projects}</h2>
              </div>
              <span className="text-sm text-slate-400">{projects.length}</span>
            </div>
            {projects.length > 0 ? (
              <div className="space-y-2">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{project.name}</p>
                      <p className="text-xs text-slate-500">{project._count.tasks} {t.common.tasks}</p>
                    </div>
                    <ArrowIcon className="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-colors shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FolderKanban}
                title={t.dashboard.noProjectsTitle}
                description={t.dashboard.noProjectsDesc}
              />
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
