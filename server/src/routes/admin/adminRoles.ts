import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { AuthRequest } from '../../middleware/auth';
import { createAuditLog, getClientIp } from '../../middleware/adminAuth';
import { AppError } from '../../middleware/errorHandler';

export const adminRolesRouter = Router();

adminRolesRouter.get('/', async (_req: AuthRequest, res: Response, next) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(roles);
  } catch (err) { next(err); }
});

adminRolesRouter.get('/permissions', async (_req: AuthRequest, res: Response, next) => {
  try {
    const permissions = await prisma.permission.findMany({ orderBy: [{ group: 'asc' }, { key: 'asc' }] });
    res.json(permissions);
  } catch (err) { next(err); }
});

adminRolesRouter.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      displayName: z.string().min(1),
      color: z.string().optional(),
    });
    const data = schema.parse(req.body);

    const role = await prisma.role.create({
      data,
      include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
    });

    await createAuditLog(req.userId!, 'role.create', 'Role', role.id, { name: role.name }, getClientIp(req));
    res.status(201).json(role);
  } catch (err) { next(err); }
});

adminRolesRouter.put('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      displayName: z.string().min(1).optional(),
      color: z.string().optional(),
    });
    const data = schema.parse(req.body);

    const role = await prisma.role.update({
      where: { id: req.params.id },
      data,
      include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
    });

    await createAuditLog(req.userId!, 'role.update', 'Role', role.id, data, getClientIp(req));
    res.json(role);
  } catch (err) { next(err); }
});

adminRolesRouter.put('/:id/permissions', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({ permissionIds: z.array(z.string()) });
    const { permissionIds } = schema.parse(req.body);

    await prisma.rolePermission.deleteMany({ where: { roleId: req.params.id } });
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId: req.params.id, permissionId })),
      });
    }

    const role = await prisma.role.findUnique({
      where: { id: req.params.id },
      include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
    });

    await createAuditLog(req.userId!, 'role.permissions_update', 'Role', req.params.id,
      { permissionIds }, getClientIp(req));
    res.json(role);
  } catch (err) { next(err); }
});

adminRolesRouter.delete('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const role = await prisma.role.findUnique({ where: { id: req.params.id } });
    if (!role) throw new AppError('Role not found', 404);
    if (role.isSystem) throw new AppError('Cannot delete system role', 400);

    await prisma.role.delete({ where: { id: req.params.id } });
    await createAuditLog(req.userId!, 'role.delete', 'Role', req.params.id,
      { name: role.name }, getClientIp(req));

    res.json({ message: 'Role deleted' });
  } catch (err) { next(err); }
});
