import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ListTodo, Clock, CheckCircle2, Eye, TrendingUp,
  Calendar, ArrowRight, ArrowLeft, FolderKanban,
  Activity, Users, AlertTriangle,
} from 'lucide-react';
import { taskApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { SkeletonDashboard } from '../components/Skeleton';
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
    return <SkeletonDashboard />;
  }

  const stats = data?.stats ?? { total: 0, todo: 0, inProgress: 0, review: 0, done: 0 };
  const completionRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  const overdueCount = data?.upcoming?.filter((t) => t.dueDate && new Date(t.dueDate) < new Date()).length || 0;

  const statCards = [
    { label: t.dashboard.todo, value: stats.todo, icon: ListTodo, gradient: 'from-slate-500 to-slate-600', lightBg: 'bg-slate-50 dark:bg-slate-800/50' },
    { label: t.dashboard.inProgress, value: stats.inProgress, icon: Clock, gradient: 'from-blue-500 to-blue-600', lightBg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: t.dashboard.inReview, value: stats.review, icon: Eye, gradient: 'from-amber-500 to-amber-600', lightBg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: t.dashboard.completed, value: stats.done, icon: CheckCircle2, gradient: 'from-emerald-500 to-emerald-600', lightBg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  ];

  const now = new Date();
  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return isRTL ? 'בוקר טוב' : 'Good morning';
    if (h < 17) return isRTL ? 'צהריים טובים' : 'Good afternoon';
    return isRTL ? 'ערב טוב' : 'Good evening';
  })();

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <motion.div variants={containerVariants} initial="hidden" animate="show">
        {/* Greeting Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
                {greeting}, {user?.name?.split(' ')[0]} 👋
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                {now.toLocaleDateString(dateLocale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            {overdueCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                  {overdueCount} {isRTL ? 'משימות באיחור' : 'overdue tasks'}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Stat Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => (
            <div key={stat.label} className="card p-5 group hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${stat.lightBg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <stat.icon className={`w-5 h-5 bg-gradient-to-r ${stat.gradient} bg-clip-text`} style={{ color: stat.gradient.includes('slate') ? '#64748b' : stat.gradient.includes('blue') ? '#3b82f6' : stat.gradient.includes('amber') ? '#f59e0b' : '#10b981' }} />
                </div>
                {stats.total > 0 && (
                  <span className="text-xs text-slate-400 font-medium">
                    {Math.round((stat.value / stats.total) * 100)}%
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Widget */}
            <motion.div variants={itemVariants} className="card p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-950/40 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t.dashboard.overallProgress}</h2>
              </div>
              <div className="flex items-center gap-4 mb-3">
                <div className="flex-1">
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${completionRate}%` }}
                      transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
                    />
                  </div>
                </div>
                <span className="text-2xl font-bold text-primary-600">{completionRate}%</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {stats.done} {t.dashboard.of} {stats.total} {t.dashboard.tasksCompleted}
              </p>
              {/* Mini status bar */}
              {stats.total > 0 && (
                <div className="flex gap-0.5 mt-4 h-2 rounded-full overflow-hidden">
                  {stats.done > 0 && <div className="bg-emerald-500" style={{ width: `${(stats.done / stats.total) * 100}%` }} />}
                  {stats.review > 0 && <div className="bg-amber-500" style={{ width: `${(stats.review / stats.total) * 100}%` }} />}
                  {stats.inProgress > 0 && <div className="bg-blue-500" style={{ width: `${(stats.inProgress / stats.total) * 100}%` }} />}
                  {stats.todo > 0 && <div className="bg-slate-300 dark:bg-slate-700" style={{ width: `${(stats.todo / stats.total) * 100}%` }} />}
                </div>
              )}
              {stats.total > 0 && (
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />{t.dashboard.completed}</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />{t.dashboard.inReview}</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" />{t.dashboard.inProgress}</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />{t.dashboard.todo}</span>
                </div>
              )}
            </motion.div>

            {/* Upcoming Tasks */}
            <motion.div variants={itemVariants} className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-amber-500" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t.dashboard.upcomingDeadlines}</h2>
              </div>
              {data?.upcoming && data.upcoming.length > 0 ? (
                <div className="space-y-2">
                  {data.upcoming.map((task) => {
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                    return (
                      <div
                        key={task.id}
                        onClick={() => navigate(`/projects/${task.projectId}`)}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                          isOverdue
                            ? 'bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_STYLE[task.priority].dotColor}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{task.title}</p>
                          <p className="text-xs text-slate-500">{task.project?.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {task.assignees && task.assignees.length > 0 && (
                            <div className="flex -space-x-1 rtl:space-x-reverse">
                              {task.assignees.slice(0, 2).map((a) => (
                                <Avatar key={a.userId} name={a.user.name} size="sm" />
                              ))}
                              {task.assignees.length > 2 && (
                                <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center">+{task.assignees.length - 2}</span>
                              )}
                            </div>
                          )}
                          <span className={`text-xs whitespace-nowrap font-medium ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                            {task.dueDate && new Date(task.dueDate).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={Calendar}
                  title={t.dashboard.noUpcoming}
                  description={isRTL ? 'אין משימות קרובות כרגע' : 'No upcoming tasks right now'}
                  compact
                />
              )}
            </motion.div>

            {/* Recent Activity */}
            <motion.div variants={itemVariants} className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-violet-500" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {isRTL ? 'פעילות אחרונה' : 'Recent Activity'}
                </h2>
              </div>
              {data?.recentTasks && data.recentTasks.length > 0 ? (
                <div className="space-y-2">
                  {data.recentTasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      onClick={() => navigate(`/projects/${task.projectId}`)}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        task.status === 'DONE' ? 'bg-emerald-500' : task.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-slate-400'
                      }`} />
                      <p className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1">{task.title}</p>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(task.updatedAt || task.createdAt).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">{isRTL ? 'אין פעילות אחרונה' : 'No recent activity'}</p>
              )}
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Projects Widget */}
            <motion.div variants={itemVariants} className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-950/40 flex items-center justify-center">
                    <FolderKanban className="w-4 h-4 text-primary-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t.nav.projects}</h2>
                </div>
                <span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">{projects.length}</span>
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
                  compact
                />
              )}
            </motion.div>

            {/* Team Widget */}
            <motion.div variants={itemVariants} className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-950/40 flex items-center justify-center">
                  <Users className="w-4 h-4 text-cyan-500" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {isRTL ? 'הצוות' : 'Team'}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {projects.slice(0, 1).flatMap((p) => p.members || []).filter((m, i, a) => a.findIndex((x) => x.userId === m.userId) === i).slice(0, 8).map((m) => (
                  <div key={m.userId} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <Avatar name={m.user.name} size="xs" />
                    <span className="text-xs text-slate-600 dark:text-slate-300">{m.user.name}</span>
                  </div>
                ))}
                {(projects.slice(0, 1).flatMap((p) => p.members || []).length === 0) && (
                  <p className="text-sm text-slate-400 text-center py-2 w-full">{isRTL ? 'אין חברי צוות עדיין' : 'No team members yet'}</p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
