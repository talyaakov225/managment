import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { AuthRequest } from '../../middleware/auth';

export const adminProjectsRouter = Router();

adminProjectsRouter.get('/', async (_req: AuthRequest, res: Response, next) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { tasks: true, members: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(projects);
  } catch (err) { next(err); }
});

adminProjectsRouter.put('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
    });
    const data = schema.parse(req.body);

    const updated = await prisma.project.update({
      where: { id: req.params.id },
      data,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { tasks: true, members: true } },
      },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

adminProjectsRouter.delete('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ message: 'Project deleted' });
  } catch (err) { next(err); }
});
