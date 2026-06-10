import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const notificationRouter = Router();
notificationRouter.use(authenticate);

notificationRouter.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    res.json(notifications);
  } catch (err) { next(err); }
});

notificationRouter.get('/unread-count', async (req: AuthRequest, res: Response, next) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.userId!, read: false },
    });
    res.json({ count });
  } catch (err) { next(err); }
});

notificationRouter.get('/new', async (req: AuthRequest, res: Response, next) => {
  try {
    const since = req.query.since as string;
    const where: Record<string, unknown> = { userId: req.userId!, read: false };
    if (since) where.createdAt = { gt: new Date(since) };

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    res.json(notifications);
  } catch (err) { next(err); }
});

notificationRouter.put('/read-all', async (req: AuthRequest, res: Response, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId!, read: false },
      data: { read: true },
    });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) { next(err); }
});

notificationRouter.put('/:id/read', async (req: AuthRequest, res: Response, next) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    });
    res.json({ message: 'Notification marked as read' });
  } catch (err) { next(err); }
});
