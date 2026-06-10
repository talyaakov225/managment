import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const navPublicRouter = Router();

navPublicRouter.use(authenticate);

navPublicRouter.get('/', async (_req: AuthRequest, res: Response, next) => {
  try {
    const items = await prisma.navItem.findMany({
      where: { visible: true, parentId: null },
      include: { children: { where: { visible: true }, orderBy: { position: 'asc' } } },
      orderBy: { position: 'asc' },
    });
    res.json(items);
  } catch (err) { next(err); }
});

navPublicRouter.get('/pages/:slug', async (req: AuthRequest, res: Response, next) => {
  try {
    const page = await prisma.customPage.findUnique({
      where: { slug: req.params.slug, isPublished: true },
      include: { blocks: { orderBy: { position: 'asc' } } },
    });
    if (!page) { res.status(404).json({ error: 'Page not found' }); return; }
    res.json(page);
  } catch (err) { next(err); }
});
