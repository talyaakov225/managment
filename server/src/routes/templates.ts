import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest, authenticate } from '../middleware/auth';

export const templateRouter = Router();
templateRouter.use(authenticate);

templateRouter.get('/', async (_req: AuthRequest, res: Response, next) => {
  try {
    const templates = await prisma.taskTemplate.findMany({
      include: { subtasks: { orderBy: { position: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(templates);
  } catch (err) { next(err); }
});

templateRouter.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      priority: z.string().optional(),
      color: z.string().optional(),
      subtasks: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
    }).parse(req.body);

    const template = await prisma.taskTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        priority: data.priority || 'MEDIUM',
        color: data.color,
        creatorId: req.userId!,
        tags: data.tags || [],
        subtasks: data.subtasks?.length ? {
          create: data.subtasks.map((title, i) => ({ title, position: i })),
        } : undefined,
      },
      include: { subtasks: true },
    });
    res.status(201).json(template);
  } catch (err) { next(err); }
});

templateRouter.delete('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    await prisma.taskTemplate.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

templateRouter.post('/:id/apply', async (req: AuthRequest, res: Response, next) => {
  try {
    const { projectId } = z.object({ projectId: z.string() }).parse(req.body);
    const template = await prisma.taskTemplate.findUnique({
      where: { id: req.params.id },
      include: { subtasks: { orderBy: { position: 'asc' } } },
    });
    if (!template) return res.status(404).json({ message: 'Template not found' });

    const maxPos = await prisma.task.findFirst({
      where: { projectId, status: 'TODO' },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const task = await prisma.task.create({
      data: {
        title: template.name,
        description: template.description,
        priority: template.priority,
        color: template.color,
        position: (maxPos?.position ?? -1) + 1,
        projectId,
        creatorId: req.userId!,
        templateId: template.id,
        subtasks: template.subtasks.length ? {
          create: template.subtasks.map((s) => ({ title: s.title, position: s.position })),
        } : undefined,
      },
      include: {
        subtasks: true,
        assignees: { include: { user: true } },
        creator: true,
      },
    });
    res.status(201).json(task);
  } catch (err) { next(err); }
});
