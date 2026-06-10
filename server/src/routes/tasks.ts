import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const taskRouter = Router();

taskRouter.use(authenticate);

async function verifyProjectAccess(projectId: string, userId: string): Promise<void> {
  const membership = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
  });
  if (!membership) throw new AppError('Project not found or access denied', 404);
}

taskRouter.get('/dashboard/stats', async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userId!;

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      select: { id: true },
    });
    const projectIds = projects.map((p) => p.id);

    const tasks = await prisma.task.findMany({
      where: { projectId: { in: projectIds } },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const stats = {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === 'TODO').length,
      inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      review: tasks.filter((t) => t.status === 'REVIEW').length,
      done: tasks.filter((t) => t.status === 'DONE').length,
    };

    const upcoming = tasks
      .filter((t) => t.dueDate && t.status !== 'DONE' && new Date(t.dueDate) >= new Date())
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5);

    const recentTasks = tasks.slice(0, 10);

    res.json({ stats, upcoming, recentTasks });
  } catch (err) {
    next(err);
  }
});

taskRouter.get('/history', async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userId!;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 20;
    const status = req.query.status as string | undefined;
    const priority = req.query.priority as string | undefined;
    const projectId = req.query.projectId as string | undefined;
    const assigneeId = req.query.assigneeId as string | undefined;
    const search = req.query.search as string | undefined;

    const userProjects = await prisma.project.findMany({
      where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
      select: { id: true },
    });
    const projectIds = userProjects.map((p) => p.id);

    const where: Record<string, unknown> = { projectId: { in: projectIds } };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (projectId && projectIds.includes(projectId)) where.projectId = projectId;
    if (assigneeId) where.assigneeId = assigneeId;
    if (search) where.title = { contains: search };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, avatar: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);

    res.json({ tasks, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

taskRouter.get('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        comments: {
          include: {
            author: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!task) throw new AppError('Task not found', 404);

    await verifyProjectAccess(task.projectId, req.userId!);

    res.json(task);
  } catch (err) {
    next(err);
  }
});

taskRouter.put('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      title: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
      status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
      assigneeId: z.string().nullable().optional(),
      dueDate: z.string().nullable().optional(),
    });

    const data = schema.parse(req.body);

    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) throw new AppError('Task not found', 404);

    await verifyProjectAccess(task.projectId, req.userId!);

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...data,
        dueDate: data.dueDate === null ? null : data.dueDate ? new Date(data.dueDate) : undefined,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        project: { select: { id: true, name: true } },
      },
    });

    if (data.assigneeId && data.assigneeId !== task.assigneeId && data.assigneeId !== req.userId) {
      const assigner = await prisma.user.findUnique({ where: { id: req.userId }, select: { name: true } });
      await prisma.notification.create({
        data: {
          type: 'task_assigned',
          title: 'משימה חדשה שויכה אליך',
          body: `${assigner?.name || 'מישהו'} שייך אליך את המשימה: ${updated.title}`,
          userId: data.assigneeId,
          linkUrl: `/projects/${task.projectId}`,
        },
      });
    }

    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    next(err);
  }
});

taskRouter.patch('/:id/position', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']),
      position: z.number().int().min(0),
    });

    const data = schema.parse(req.body);

    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) throw new AppError('Task not found', 404);

    await verifyProjectAccess(task.projectId, req.userId!);

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: { status: data.status, position: data.position },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

taskRouter.delete('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) throw new AppError('Task not found', 404);

    await verifyProjectAccess(task.projectId, req.userId!);

    await prisma.task.delete({ where: { id: req.params.id } });

    res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
});
