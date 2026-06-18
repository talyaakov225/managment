import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export const publicApiRouter = Router();

async function apiKeyAuth(req: Request, _res: Response, next: Function) {
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) return next(new AppError('API key required', 401));

  const setting = await prisma.systemSetting.findUnique({ where: { key: 'public_api_key' } });
  if (!setting || setting.value !== apiKey) return next(new AppError('Invalid API key', 401));
  next();
}

publicApiRouter.use(apiKeyAuth as never);

publicApiRouter.get('/projects', async (_req: Request, res: Response, next) => {
  try {
    const projects = await prisma.project.findMany({
      select: { id: true, name: true, description: true, createdAt: true, _count: { select: { tasks: true, members: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: projects });
  } catch (err) { next(err); }
});

publicApiRouter.get('/projects/:id/tasks', async (req: Request, res: Response, next) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { projectId: req.params.id, isDeleted: false },
      select: { id: true, title: true, status: true, priority: true, dueDate: true, createdAt: true, updatedAt: true },
      orderBy: { position: 'asc' },
    });
    res.json({ data: tasks });
  } catch (err) { next(err); }
});

publicApiRouter.get('/tasks/:id', async (req: Request, res: Response, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, title: true, description: true, status: true, priority: true,
        dueDate: true, createdAt: true, updatedAt: true,
        assignees: { select: { user: { select: { id: true, name: true, email: true } } } },
        subtasks: { select: { id: true, title: true, completed: true } },
      },
    });
    if (!task) return next(new AppError('Task not found', 404));
    res.json({ data: task });
  } catch (err) { next(err); }
});

publicApiRouter.post('/tasks', async (req: Request, res: Response, next) => {
  try {
    const { title, projectId, status, priority, dueDate, description } = req.body;
    if (!title || !projectId) return next(new AppError('title and projectId required', 400));

    const maxPos = await prisma.task.findFirst({
      where: { projectId, status: status || 'TODO' },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const task = await prisma.task.create({
      data: {
        title,
        projectId,
        status: status || 'TODO',
        priority: priority || 'MEDIUM',
        description,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        position: (maxPos?.position ?? -1) + 1,
      },
    });
    res.status(201).json({ data: task });
  } catch (err) { next(err); }
});

publicApiRouter.patch('/tasks/:id', async (req: Request, res: Response, next) => {
  try {
    const { title, status, priority, dueDate, description } = req.body;
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(status && { status }),
        ...(priority && { priority }),
        ...(description !== undefined && { description }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      },
    });
    res.json({ data: task });
  } catch (err) { next(err); }
});

publicApiRouter.get('/users', async (_req: Request, res: Response, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { isApproved: true },
      select: { id: true, name: true, email: true, avatar: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
    res.json({ data: users });
  } catch (err) { next(err); }
});
