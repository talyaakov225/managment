import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest, authenticate } from '../middleware/auth';

export const dependencyRouter = Router();
dependencyRouter.use(authenticate);

dependencyRouter.get('/:taskId/dependencies', async (req: AuthRequest, res: Response, next) => {
  try {
    const [dependsOn, dependedBy] = await Promise.all([
      prisma.taskDependency.findMany({
        where: { taskId: req.params.taskId },
        include: { dependsOn: { select: { id: true, title: true, status: true } } },
      }),
      prisma.taskDependency.findMany({
        where: { dependsOnId: req.params.taskId },
        include: { task: { select: { id: true, title: true, status: true } } },
      }),
    ]);
    res.json({ dependsOn, dependedBy });
  } catch (err) { next(err); }
});

dependencyRouter.post('/:taskId/dependencies', async (req: AuthRequest, res: Response, next) => {
  try {
    const { dependsOnId, type } = z.object({
      dependsOnId: z.string(),
      type: z.string().optional(),
    }).parse(req.body);

    const dep = await prisma.taskDependency.create({
      data: { taskId: req.params.taskId, dependsOnId, type: type || 'blocks' },
      include: { dependsOn: { select: { id: true, title: true, status: true } } },
    });
    res.status(201).json(dep);
  } catch (err) { next(err); }
});

dependencyRouter.delete('/dependencies/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    await prisma.taskDependency.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});
