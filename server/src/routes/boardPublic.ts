import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const boardPublicRouter = Router();

boardPublicRouter.use(authenticate);

boardPublicRouter.get('/statuses', async (_req: AuthRequest, res: Response, next) => {
  try {
    const statuses = await prisma.boardStatus.findMany({ orderBy: { position: 'asc' } });
    res.json(statuses);
  } catch (err) { next(err); }
});

boardPublicRouter.get('/priorities', async (_req: AuthRequest, res: Response, next) => {
  try {
    const priorities = await prisma.boardPriority.findMany({ orderBy: { position: 'asc' } });
    res.json(priorities);
  } catch (err) { next(err); }
});

boardPublicRouter.get('/categories', async (_req: AuthRequest, res: Response, next) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { position: 'asc' } });
    res.json(categories);
  } catch (err) { next(err); }
});
