import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest, authenticate } from '../middleware/auth';

export const teamRouter = Router();
teamRouter.use(authenticate);

teamRouter.get('/', async (_req: AuthRequest, res: Response, next) => {
  try {
    const teams = await prisma.team.findMany({
      include: {
        members: { include: { } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const users = await prisma.user.findMany({ select: { id: true, name: true, avatar: true, email: true } });
    const teamsWithUsers = teams.map((t) => ({
      ...t,
      members: t.members.map((m) => ({
        ...m,
        user: users.find((u) => u.id === m.userId),
      })),
    }));
    res.json(teamsWithUsers);
  } catch (err) { next(err); }
});

teamRouter.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      color: z.string().optional(),
      memberIds: z.array(z.string()).optional(),
    }).parse(req.body);

    const team = await prisma.team.create({
      data: {
        name: data.name,
        description: data.description,
        color: data.color,
        members: data.memberIds?.length ? {
          create: data.memberIds.map((userId) => ({ userId, role: 'MEMBER' })),
        } : undefined,
      },
      include: { members: true, _count: { select: { members: true } } },
    });
    res.status(201).json(team);
  } catch (err) { next(err); }
});

teamRouter.put('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      color: z.string().optional(),
    }).parse(req.body);
    const team = await prisma.team.update({ where: { id: req.params.id }, data });
    res.json(team);
  } catch (err) { next(err); }
});

teamRouter.delete('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    await prisma.team.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

teamRouter.post('/:id/members', async (req: AuthRequest, res: Response, next) => {
  try {
    const { userId, role } = z.object({ userId: z.string(), role: z.string().optional() }).parse(req.body);
    const member = await prisma.teamMember.create({
      data: { teamId: req.params.id, userId, role: role || 'MEMBER' },
    });
    res.status(201).json(member);
  } catch (err) { next(err); }
});

teamRouter.delete('/:id/members/:userId', async (req: AuthRequest, res: Response, next) => {
  try {
    await prisma.teamMember.delete({
      where: { teamId_userId: { teamId: req.params.id, userId: req.params.userId } },
    });
    res.json({ message: 'Removed' });
  } catch (err) { next(err); }
});
