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
