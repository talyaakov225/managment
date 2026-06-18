import { Router, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { AuthRequest } from '../../middleware/auth';

export const adminDashboardRouter = Router();

adminDashboardRouter.get('/', async (_req: AuthRequest, res: Response, next) => {
  try {
    const [usersCount, projectsCount, tasksCount, recentLogs] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.task.count(),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
    ]);

    const tasksByStatus = await prisma.task.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    res.json({
      users: usersCount,
      projects: projectsCount,
      tasks: tasksCount,
      tasksByStatus: tasksByStatus.map((t) => ({ status: t.status, count: t._count.id })),
      recentActivity: recentLogs,
    });
  } catch (err) { next(err); }
});

adminDashboardRouter.get('/analytics', async (_req: AuthRequest, res: Response, next) => {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const tasks = await prisma.task.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { status: true, priority: true, createdAt: true, updatedAt: true, creatorId: true },
    });

    const completedTasks = await prisma.task.findMany({
      where: { status: 'DONE', updatedAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, updatedAt: true },
    });

    const monthlyData: Record<string, { created: number; completed: number }> = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = { created: 0, completed: 0 };
    }

    for (const t of tasks) {
      const key = `${t.createdAt.getFullYear()}-${String(t.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[key]) monthlyData[key].created++;
    }

    for (const t of completedTasks) {
      const key = `${t.updatedAt.getFullYear()}-${String(t.updatedAt.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[key]) monthlyData[key].completed++;
    }

    const avgCompletionTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => sum + (t.updatedAt.getTime() - t.createdAt.getTime()), 0) / completedTasks.length / (1000 * 60 * 60 * 24)
      : 0;

    const tasksByPriority = await prisma.task.groupBy({ by: ['priority'], _count: { id: true } });

    const userStats = await prisma.user.findMany({
      select: {
        id: true, name: true, avatar: true,
        _count: { select: { createdTasks: true, taskAssignments: true } },
      },
    });

    res.json({
      monthly: Object.entries(monthlyData).map(([month, data]) => ({ month, ...data })),
      avgCompletionDays: Math.round(avgCompletionTime * 10) / 10,
      tasksByPriority: tasksByPriority.map((p) => ({ priority: p.priority, count: p._count.id })),
      userStats: userStats.map((u) => ({
        id: u.id, name: u.name, avatar: u.avatar,
        created: u._count.createdTasks, assigned: u._count.taskAssignments,
      })),
      totalCompleted: completedTasks.length,
    });
  } catch (err) { next(err); }
});

adminDashboardRouter.get('/login-logs', async (req: AuthRequest, res: Response, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const [logs, total] = await Promise.all([
      prisma.loginLog.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.loginLog.count(),
    ]);
    res.json({ logs, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});
