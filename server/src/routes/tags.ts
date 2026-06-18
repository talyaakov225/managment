import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest, authenticate } from '../middleware/auth';

export const tagRouter = Router();
tagRouter.use(authenticate);

tagRouter.get('/', async (_req: AuthRequest, res: Response, next) => {
  try {
    const tags = await prisma.tag.findMany({
      include: { _count: { select: { tasks: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(tags);
  } catch (err) { next(err); }
});

tagRouter.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = z.object({ name: z.string().min(1), color: z.string().optional() }).parse(req.body);
    const tag = await prisma.tag.create({ data });
    res.status(201).json(tag);
  } catch (err) { next(err); }
});

tagRouter.put('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = z.object({ name: z.string().min(1).optional(), color: z.string().optional() }).parse(req.body);
    const tag = await prisma.tag.update({ where: { id: req.params.id }, data });
    res.json(tag);
  } catch (err) { next(err); }
});

tagRouter.delete('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    await prisma.tag.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

tagRouter.post('/task/:taskId', async (req: AuthRequest, res: Response, next) => {
  try {
    const { tagIds } = z.object({ tagIds: z.array(z.string()) }).parse(req.body);
    await prisma.taskTag.deleteMany({ where: { taskId: req.params.taskId } });
    if (tagIds.length > 0) {
      await prisma.taskTag.createMany({
        data: tagIds.map((tagId) => ({ taskId: req.params.taskId, tagId })),
      });
    }
    const tags = await prisma.taskTag.findMany({
      where: { taskId: req.params.taskId },
      include: { tag: true },
    });
    res.json(tags.map((t) => t.tag));
  } catch (err) { next(err); }
});

tagRouter.get('/task/:taskId', async (req: AuthRequest, res: Response, next) => {
  try {
    const tags = await prisma.taskTag.findMany({
      where: { taskId: req.params.taskId },
      include: { tag: true },
    });
    res.json(tags.map((t) => t.tag));
  } catch (err) { next(err); }
});
