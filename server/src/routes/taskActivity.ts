import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const taskActivityRouter = Router();

taskActivityRouter.use(authenticate);

taskActivityRouter.get('/:taskId/activity', async (req: AuthRequest, res: Response, next) => {
  try {
    const activities = await prisma.taskActivity.findMany({
      where: { taskId: req.params.taskId },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(activities);
  } catch (err) {
    next(err);
  }
});
