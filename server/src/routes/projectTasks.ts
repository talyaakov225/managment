import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const projectTaskRouter = Router();

projectTaskRouter.use(authenticate);

async function verifyProjectAccess(projectId: string, userId: string): Promise<void> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
  });
  if (!project) throw new AppError('Project not found or access denied', 404);
}

projectTaskRouter.get('/:id/tasks', async (req: AuthRequest, res: Response, next) => {
  try {
    await verifyProjectAccess(req.params.id, req.userId!);

    const tasks = await prisma.task.findMany({
      where: { projectId: req.params.id },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        _count: { select: { comments: true } },
      },
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
      assigneeId: z.string().nullable().optional(),
      dueDate: z.string().nullable().optional(),
    });

    const data = schema.parse(req.body);

    await verifyProjectAccess(req.params.id, req.userId!);

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
        position: (maxPosition?.position ?? -1) + 1,
        assigneeId: data.assigneeId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        projectId: req.params.id,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        _count: { select: { comments: true } },
      },
    });

    res.status(201).json(task);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    next(err);
  }
});
