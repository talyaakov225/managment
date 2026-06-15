import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const projectRouter = Router();

projectRouter.use(authenticate);

projectRouter.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
          },
        },
        _count: { select: { tasks: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(projects);
  } catch (err) {
    next(err);
  }
});

projectRouter.get('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
          },
        },
        _count: { select: { tasks: true } },
      },
    });

    if (!project) throw new AppError('Project not found', 404);

    res.json(project);
  } catch (err) {
    next(err);
  }
});

projectRouter.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1, 'Project name is required'),
      description: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const project = await prisma.project.create({
      data: {
        ...data,
        ownerId: req.userId!,
        members: {
          create: { userId: req.userId!, role: 'OWNER' },
        },
      },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
          },
        },
        _count: { select: { tasks: true } },
      },
    });

    res.status(201).json(project);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    next(err);
  }
});

projectRouter.put('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const project = await prisma.project.findFirst({
      where: { id: req.params.id, ownerId: req.userId },
    });
    if (!project) throw new AppError('Project not found or access denied', 404);

    const updated = await prisma.project.update({
      where: { id: req.params.id },
      data,
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
          },
        },
        _count: { select: { tasks: true } },
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

projectRouter.delete('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, ownerId: req.userId },
    });
    if (!project) throw new AppError('Project not found or access denied', 404);

    await prisma.project.delete({ where: { id: req.params.id } });

    res.json({ message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
});
