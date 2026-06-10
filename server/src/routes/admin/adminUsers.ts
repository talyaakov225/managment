import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { AuthRequest } from '../../middleware/auth';
import { requireSuperAdmin } from '../../middleware/adminAuth';
import { createAuditLog, getClientIp } from '../../middleware/adminAuth';
import { AppError } from '../../middleware/errorHandler';

export const adminUsersRouter = Router();

adminUsersRouter.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const search = (req.query.search as string) || '';
    const filter = (req.query.filter as string) || 'all';

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (filter === 'pending') where.isApproved = false;
    else if (filter === 'approved') where.isApproved = true;

    const users = await prisma.user.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      select: {
        id: true, name: true, email: true, avatar: true, globalRole: true, isApproved: true, createdAt: true,
        userRoles: { include: { role: { select: { id: true, name: true, displayName: true, color: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) { next(err); }
});

adminUsersRouter.get('/pending-count', async (_req: AuthRequest, res: Response, next) => {
  try {
    const count = await prisma.user.count({ where: { isApproved: false } });
    res.json({ count });
  } catch (err) { next(err); }
});

adminUsersRouter.put('/:id/approve', async (req: AuthRequest, res: Response, next) => {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw new AppError('User not found', 404);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isApproved: true },
      select: { id: true, name: true, email: true, globalRole: true, isApproved: true },
    });

    await createAuditLog(req.userId!, 'user.approve', 'User', target.id,
      { email: target.email }, getClientIp(req));

    res.json(user);
  } catch (err) { next(err); }
});

adminUsersRouter.put('/:id/reject', async (req: AuthRequest, res: Response, next) => {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw new AppError('User not found', 404);

    await prisma.user.delete({ where: { id: req.params.id } });

    await createAuditLog(req.userId!, 'user.reject', 'User', req.params.id,
      { email: target.email, name: target.name }, getClientIp(req));

    res.json({ message: 'User rejected and deleted' });
  } catch (err) { next(err); }
});

adminUsersRouter.put('/:id/role', requireSuperAdmin, async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({ globalRole: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']) });
    const { globalRole } = schema.parse(req.body);

    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw new AppError('User not found', 404);
    if (target.id === req.userId && globalRole !== 'SUPER_ADMIN') {
      throw new AppError('Cannot demote yourself', 400);
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { globalRole },
      select: { id: true, name: true, email: true, globalRole: true },
    });

    await createAuditLog(req.userId!, 'user.role_change', 'User', target.id,
      { oldRole: target.globalRole, newRole: globalRole }, getClientIp(req));

    res.json(user);
  } catch (err) { next(err); }
});

adminUsersRouter.put('/:id/custom-roles', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({ roleIds: z.array(z.string()) });
    const { roleIds } = schema.parse(req.body);

    await prisma.userRole.deleteMany({ where: { userId: req.params.id } });
    if (roleIds.length > 0) {
      await prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId: req.params.id, roleId })),
      });
    }

    await createAuditLog(req.userId!, 'user.roles_update', 'User', req.params.id,
      { roleIds }, getClientIp(req));

    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, email: true, globalRole: true, isApproved: true,
        userRoles: { include: { role: { select: { id: true, name: true, displayName: true, color: true } } } },
      },
    });
    res.json(user);
  } catch (err) { next(err); }
});

adminUsersRouter.delete('/:id', requireSuperAdmin, async (req: AuthRequest, res: Response, next) => {
  try {
    if (req.params.id === req.userId) throw new AppError('Cannot delete yourself', 400);
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw new AppError('User not found', 404);

    await prisma.user.delete({ where: { id: req.params.id } });
    await createAuditLog(req.userId!, 'user.delete', 'User', req.params.id,
      { email: target.email, name: target.name }, getClientIp(req));

    res.json({ message: 'User deleted' });
  } catch (err) { next(err); }
});
