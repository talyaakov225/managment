import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const subtaskRouter = Router();

subtaskRouter.use(authenticate);

subtaskRouter.get('/:taskId/subtasks', async (req: AuthRequest, res: Response, next) => {
  try {
    const subtasks = await prisma.subtask.findMany({
      where: { taskId: req.params.taskId },
      orderBy: { position: 'asc' },
    });
    res.json(subtasks);
  } catch (err) {
    next(err);
  }
});

subtaskRouter.post('/:taskId/subtasks', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({ title: z.string().min(1) });
    const data = schema.parse(req.body);

    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!task) throw new AppError('Task not found', 404);

    const maxPos = await prisma.subtask.aggregate({
      where: { taskId: req.params.taskId },
      _max: { position: true },
    });

    const subtask = await prisma.subtask.create({
      data: {
        title: data.title,
        taskId: req.params.taskId,
        position: (maxPos._max.position ?? -1) + 1,
      },
    });

    await prisma.taskActivity.create({
      data: {
        action: 'subtask_added',
        field: 'subtasks',
        newValue: data.title,
        taskId: req.params.taskId,
        userId: req.userId!,
      },
    });

    res.status(201).json(subtask);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    next(err);
  }
});

subtaskRouter.put('/subtasks/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      title: z.string().min(1).optional(),
      completed: z.boolean().optional(),
    });
    const data = schema.parse(req.body);

    const subtask = await prisma.subtask.findUnique({ where: { id: req.params.id } });
    if (!subtask) throw new AppError('Subtask not found', 404);

    const updated = await prisma.subtask.update({
      where: { id: req.params.id },
      data,
    });

    if (data.completed !== undefined) {
      await prisma.taskActivity.create({
        data: {
          action: data.completed ? 'subtask_completed' : 'subtask_uncompleted',
          field: 'subtasks',
          newValue: subtask.title,
          taskId: subtask.taskId,
          userId: req.userId!,
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

subtaskRouter.delete('/subtasks/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const subtask = await prisma.subtask.findUnique({ where: { id: req.params.id } });
    if (!subtask) throw new AppError('Subtask not found', 404);

    await prisma.subtask.delete({ where: { id: req.params.id } });

    await prisma.taskActivity.create({
      data: {
        action: 'subtask_removed',
        field: 'subtasks',
        oldValue: subtask.title,
        taskId: subtask.taskId,
        userId: req.userId!,
      },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
