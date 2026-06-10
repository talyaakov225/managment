import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const memberRouter = Router();

memberRouter.use(authenticate);

memberRouter.get('/:id/members', async (req: AuthRequest, res: Response, next) => {
  try {
    const members = await prisma.projectMember.findMany({
      where: { projectId: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(members);
  } catch (err) {
    next(err);
  }
});

memberRouter.post('/:id/members', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      email: z.string().email('Invalid email address'),
      role: z.enum(['ADMIN', 'MEMBER']).optional().default('MEMBER'),
    });

    const data = schema.parse(req.body);

    const project = await prisma.project.findFirst({
      where: {
        id: req.params.id,
        OR: [
          { ownerId: req.userId },
          { members: { some: { userId: req.userId, role: { in: ['OWNER', 'ADMIN'] } } } },
        ],
      },
    });
    if (!project) throw new AppError('Project not found or insufficient permissions', 404);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new AppError('User not found with that email', 404);

    const existingMember = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: user.id, projectId: req.params.id } },
    });
    if (existingMember) throw new AppError('User is already a member', 409);

    const member = await prisma.projectMember.create({
      data: {
        userId: user.id,
        projectId: req.params.id,
        role: data.role,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    res.status(201).json(member);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    next(err);
  }
});

memberRouter.delete('/:id/members/:userId', async (req: AuthRequest, res: Response, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: {
        id: req.params.id,
        OR: [
          { ownerId: req.userId },
          { members: { some: { userId: req.userId, role: { in: ['OWNER', 'ADMIN'] } } } },
        ],
      },
    });
    if (!project) throw new AppError('Project not found or insufficient permissions', 404);

    if (req.params.userId === project.ownerId) {
      throw new AppError('Cannot remove the project owner', 400);
    }

    await prisma.projectMember.delete({
      where: {
        userId_projectId: { userId: req.params.userId, projectId: req.params.id },
      },
    });

    res.json({ message: 'Member removed' });
  } catch (err) {
    next(err);
  }
});
