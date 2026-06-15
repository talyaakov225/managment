import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const reminderRouter = Router();
reminderRouter.use(authenticate);

reminderRouter.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const reminders = await prisma.reminder.findMany({
      where: { userId: req.userId! },
      orderBy: { triggerAt: 'asc' },
    });
    res.json(reminders);
  } catch (err) { next(err); }
});

reminderRouter.get('/due', async (req: AuthRequest, res: Response, next) => {
  try {
    const due = await prisma.reminder.findMany({
      where: {
        userId: req.userId!,
        triggered: false,
        dismissed: false,
        triggerAt: { lte: new Date() },
      },
      orderBy: { triggerAt: 'asc' },
    });

    if (due.length > 0) {
      await prisma.reminder.updateMany({
        where: { id: { in: due.map((r) => r.id) } },
        data: { triggered: true },
      });
    }

    res.json(due);
  } catch (err) { next(err); }
});

reminderRouter.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const { title, content, color, triggerAt } = req.body;
    if (!title || !triggerAt) {
      res.status(400).json({ error: 'Title and triggerAt are required' });
      return;
    }
    const reminder = await prisma.reminder.create({
      data: {
        title,
        content: content || null,
        color: color || '#3b82f6',
        triggerAt: new Date(triggerAt),
        userId: req.userId!,
      },
    });
    res.status(201).json(reminder);
  } catch (err) { next(err); }
});

reminderRouter.put('/:id/dismiss', async (req: AuthRequest, res: Response, next) => {
  try {
    const reminder = await prisma.reminder.findUnique({ where: { id: req.params.id } });
    if (!reminder || reminder.userId !== req.userId) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const updated = await prisma.reminder.update({
      where: { id: req.params.id },
      data: { dismissed: true },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

reminderRouter.delete('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const reminder = await prisma.reminder.findUnique({ where: { id: req.params.id } });
    if (!reminder || reminder.userId !== req.userId) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    await prisma.reminder.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});
