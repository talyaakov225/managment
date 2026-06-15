import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const projectTaskRouter = Router();

projectTaskRouter.use(authenticate);

const taskInclude = {
  creator: { select: { id: true, name: true, avatar: true } },
  assignees: {
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
  },
  _count: { select: { comments: true } },
};

async function verifyProjectAccess(projectId: string, _userId: string): Promise<void> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new AppError('Project not found', 404);
}

projectTaskRouter.get('/:id/tasks', async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userId!;
    await verifyProjectAccess(req.params.id, userId);

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { globalRole: true, seeAllTasks: true } });

    const where: Record<string, unknown> = { projectId: req.params.id, isDeleted: false };
    if (!user?.seeAllTasks) {
      where.OR = [
        { creatorId: userId },
        { creatorId: null },
        { assignees: { some: { userId } } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    });

    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

projectTaskRouter.post('/:id/tasks', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      title: z.string().min(1, 'Task title is required'),
      description: z.string().optional(),
      status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).optional().default('TODO'),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
      color: z.string().nullable().optional(),
      assigneeIds: z.array(z.string()).optional().default([]),
      dueDate: z.string().nullable().optional(),
    });

    const data = schema.parse(req.body);
    const userId = req.userId!;

    await verifyProjectAccess(req.params.id, userId);

    const maxPosition = await prisma.task.findFirst({
      where: { projectId: req.params.id, status: data.status },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        color: data.color,
        position: (maxPosition?.position ?? -1) + 1,
        creatorId: userId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        projectId: req.params.id,
        assignees: data.assigneeIds.length > 0
          ? { create: data.assigneeIds.map((uid) => ({ userId: uid })) }
          : undefined,
      },
      include: taskInclude,
    });

    const toNotify = data.assigneeIds.filter((id) => id !== userId);
    if (toNotify.length > 0) {
      const assigner = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      await prisma.notification.createMany({
        data: toNotify.map((uid) => ({
          type: 'task_assigned',
          title: 'משימה חדשה שויכה אליך',
          body: `${assigner?.name || 'מישהו'} שייך אליך את המשימה: ${task.title}`,
          userId: uid,
          linkUrl: `/projects/${req.params.id}`,
        })),
      });
    }

    res.status(201).json(task);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    next(err);
  }
});
