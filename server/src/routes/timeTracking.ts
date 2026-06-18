import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest, authenticate } from '../middleware/auth';

export const timeTrackingRouter = Router();
timeTrackingRouter.use(authenticate);

timeTrackingRouter.get('/:taskId/time-entries', async (req: AuthRequest, res: Response, next) => {
  try {
    const entries = await prisma.timeEntry.findMany({
      where: { taskId: req.params.taskId },
      orderBy: { startTime: 'desc' },
    });
    res.json(entries);
  } catch (err) { next(err); }
});

timeTrackingRouter.post('/:taskId/time-entries', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = z.object({
      startTime: z.string(),
      endTime: z.string().optional(),
      duration: z.number().optional(),
      note: z.string().optional(),
    }).parse(req.body);

    const entry = await prisma.timeEntry.create({
      data: {
        taskId: req.params.taskId,
        userId: req.userId!,
        startTime: new Date(data.startTime),
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        duration: data.duration,
        note: data.note,
      },
    });
    res.status(201).json(entry);
  } catch (err) { next(err); }
});

timeTrackingRouter.put('/time-entries/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = z.object({
      endTime: z.string().optional(),
      duration: z.number().optional(),
      note: z.string().optional(),
    }).parse(req.body);

    const entry = await prisma.timeEntry.update({
      where: { id: req.params.id },
      data: {
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        duration: data.duration,
        note: data.note,
      },
    });
    res.json(entry);
  } catch (err) { next(err); }
});

timeTrackingRouter.delete('/time-entries/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    await prisma.timeEntry.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

timeTrackingRouter.get('/time-report', async (req: AuthRequest, res: Response, next) => {
  try {
    const { projectId, userId, from, to } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (projectId) where.task = { projectId };
    if (userId) where.userId = userId;
    if (from || to) {
      where.startTime = {};
      if (from) (where.startTime as Record<string, unknown>).gte = new Date(from);
      if (to) (where.startTime as Record<string, unknown>).lte = new Date(to);
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      include: { task: { select: { id: true, title: true, projectId: true, project: { select: { name: true } } } } },
      orderBy: { startTime: 'desc' },
    });

    const totalDuration = entries.reduce((sum, e) => sum + (e.duration || 0), 0);
    res.json({ entries, totalDuration });
  } catch (err) { next(err); }
});
