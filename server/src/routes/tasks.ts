import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const taskRouter = Router();

taskRouter.use(authenticate);

const taskInclude = {
  project: { select: { id: true, name: true } },
  creator: { select: { id: true, name: true, avatar: true } },
  assignees: {
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
  },
  _count: { select: { comments: true } },
};

function taskVisibilityFilter(userId: string, includeDeleted = false) {
  return {
    ...(includeDeleted ? {} : { isDeleted: false }),
    OR: [
      { creatorId: userId },
      { creatorId: null },
      { assignees: { some: { userId } } },
    ],
  };
}

async function verifyProjectAccess(projectId: string, _userId: string): Promise<void> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new AppError('Project not found', 404);
}

taskRouter.get('/dashboard/stats', async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userId!;

    const tasks = await prisma.task.findMany({
      where: {
        ...taskVisibilityFilter(userId),
      },
      include: taskInclude,
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
      .filter((t) => t.dueDate && t.status !== 'DONE')
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 8);

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
    const tab = (req.query.tab as string) || 'all';
    const status = req.query.status as string | undefined;
    const priority = req.query.priority as string | undefined;
    const projectId = req.query.projectId as string | undefined;
    const search = req.query.search as string | undefined;

    const where: Record<string, unknown> = {
      ...taskVisibilityFilter(userId, tab === 'deleted'),
    };

    if (tab === 'completed') {
      where.status = 'DONE';
      where.isDeleted = false;
    } else if (tab === 'deleted') {
      where.isDeleted = true;
    } else if (tab === 'active') {
      where.status = { not: 'DONE' };
      where.isDeleted = false;
    }

    if (status && tab !== 'completed' && tab !== 'deleted') where.status = status;
    if (priority) where.priority = priority;
    if (projectId) where.projectId = projectId;
    if (search) where.title = { contains: search };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: taskInclude,
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
        ...taskInclude,
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
      color: z.string().nullable().optional(),
      assigneeIds: z.array(z.string()).optional(),
      assigneeRoles: z.record(z.string(), z.enum(['EDITOR', 'VIEWER'])).optional(),
      dueDate: z.string().nullable().optional(),
    });

    const data = schema.parse(req.body);

    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { assignees: { select: { userId: true, role: true } } },
    });
    if (!task) throw new AppError('Task not found', 404);

    await verifyProjectAccess(task.projectId, req.userId!);

    const myAssignment = task.assignees.find(a => a.userId === req.userId);
    const isCreator = task.creatorId === req.userId;
    const isViewer = myAssignment?.role === 'VIEWER' && !isCreator;
    if (isViewer && !data.assigneeIds && !data.assigneeRoles) {
      throw new AppError('You have view-only access to this task', 403);
    }

    const { assigneeIds, assigneeRoles, ...taskFields } = data;

    const changes: { field: string; oldValue: string | null; newValue: string | null }[] = [];
    if (data.status && data.status !== task.status) changes.push({ field: 'status', oldValue: task.status, newValue: data.status });
    if (data.priority && data.priority !== task.priority) changes.push({ field: 'priority', oldValue: task.priority, newValue: data.priority });
    if (data.title && data.title !== task.title) changes.push({ field: 'title', oldValue: task.title, newValue: data.title });
    if (data.color !== undefined && data.color !== task.color) changes.push({ field: 'color', oldValue: task.color, newValue: data.color });
    if (data.dueDate !== undefined) {
      const oldDue = task.dueDate ? task.dueDate.toISOString().split('T')[0] : null;
      const newDue = data.dueDate || null;
      if (oldDue !== newDue) changes.push({ field: 'dueDate', oldValue: oldDue, newValue: newDue });
    }

    if (changes.length > 0) {
      await prisma.taskActivity.createMany({
        data: changes.map((c) => ({
          action: 'field_changed',
          field: c.field,
          oldValue: c.oldValue,
          newValue: c.newValue,
          taskId: task.id,
          userId: req.userId!,
        })),
      });
    }

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...taskFields,
        dueDate: taskFields.dueDate === null ? null : taskFields.dueDate ? new Date(taskFields.dueDate) : undefined,
      },
      include: taskInclude,
    });

    if (assigneeIds !== undefined) {
      const oldIds = new Set(task.assignees.map((a) => a.userId));
      const newIds = new Set(assigneeIds);

      const toRemove = [...oldIds].filter((id) => !newIds.has(id));
      const toAdd = [...newIds].filter((id) => !oldIds.has(id));

      if (toRemove.length > 0) {
        await prisma.taskAssignee.deleteMany({
          where: { taskId: task.id, userId: { in: toRemove } },
        });
      }
      if (toAdd.length > 0) {
        await prisma.taskAssignee.createMany({
          data: toAdd.map((userId) => ({
            taskId: task.id,
            userId,
            role: assigneeRoles?.[userId] || 'EDITOR',
          })),
        });
      }

      if (assigneeRoles) {
        const existing = [...oldIds].filter((id) => newIds.has(id));
        for (const userId of existing) {
          const newRole = assigneeRoles[userId];
          if (newRole) {
            await prisma.taskAssignee.update({
              where: { taskId_userId: { taskId: task.id, userId } },
              data: { role: newRole },
            });
          }
        }
      }

      const newlyAssigned = toAdd.filter((id) => id !== req.userId);
      if (newlyAssigned.length > 0) {
        const assigner = await prisma.user.findUnique({ where: { id: req.userId }, select: { name: true } });
        await prisma.notification.createMany({
          data: newlyAssigned.map((uid) => ({
            type: 'task_assigned',
            title: 'משימה חדשה שויכה אליך',
            body: `${assigner?.name || 'מישהו'} שייך אליך את המשימה: ${updated.title}`,
            userId: uid,
            linkUrl: `/projects/${task.projectId}`,
          })),
        });
      }

      const refreshed = await prisma.task.findUnique({
        where: { id: req.params.id },
        include: taskInclude,
      });
      res.json(refreshed);
      return;
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
      include: taskInclude,
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

    await prisma.task.update({
      where: { id: req.params.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
});
