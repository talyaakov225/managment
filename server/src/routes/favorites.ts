import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const favoriteRouter = Router();

favoriteRouter.use(authenticate);

favoriteRouter.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.userId! },
      include: {
        project: {
          select: { id: true, name: true, description: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(favorites);
  } catch (err) {
    next(err);
  }
});

favoriteRouter.post('/toggle', async (req: AuthRequest, res: Response, next) => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      res.status(400).json({ error: 'projectId is required' });
      return;
    }

    const existing = await prisma.favorite.findUnique({
      where: { userId_projectId: { userId: req.userId!, projectId } },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      res.json({ favorited: false });
    } else {
      await prisma.favorite.create({
        data: { userId: req.userId!, projectId },
      });
      res.json({ favorited: true });
    }
  } catch (err) {
    next(err);
  }
});
