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

const DEFAULT_PERMISSIONS = [
  { key: 'projects.view', group: 'projects', displayName: 'View Projects' },
  { key: 'projects.create', group: 'projects', displayName: 'Create Projects' },
  { key: 'projects.edit', group: 'projects', displayName: 'Edit Projects' },
  { key: 'projects.delete', group: 'projects', displayName: 'Delete Projects' },
  { key: 'tasks.view', group: 'tasks', displayName: 'View Tasks' },
  { key: 'tasks.create', group: 'tasks', displayName: 'Create Tasks' },
  { key: 'tasks.edit', group: 'tasks', displayName: 'Edit Tasks' },
  { key: 'tasks.delete', group: 'tasks', displayName: 'Delete Tasks' },
  { key: 'tasks.assign', group: 'tasks', displayName: 'Assign Tasks' },
  { key: 'members.view', group: 'members', displayName: 'View Members' },
  { key: 'members.manage', group: 'members', displayName: 'Manage Members' },
  { key: 'comments.create', group: 'comments', displayName: 'Create Comments' },
  { key: 'comments.delete', group: 'comments', displayName: 'Delete Comments' },
  { key: 'admin.access', group: 'admin', displayName: 'Access Admin Panel' },
  { key: 'admin.users', group: 'admin', displayName: 'Manage Users' },
  { key: 'admin.roles', group: 'admin', displayName: 'Manage Roles' },
  { key: 'admin.settings', group: 'admin', displayName: 'Manage Settings' },
  { key: 'admin.board', group: 'admin', displayName: 'Manage Board Config' },
  { key: 'admin.pages', group: 'admin', displayName: 'Manage Pages' },
  { key: 'admin.navigation', group: 'admin', displayName: 'Manage Navigation' },
];

adminRolesRouter.get('/permissions', async (_req: AuthRequest, res: Response, next) => {
  try {
    let permissions = await prisma.permission.findMany({ orderBy: [{ group: 'asc' }, { key: 'asc' }] });

    if (permissions.length === 0) {
      for (const perm of DEFAULT_PERMISSIONS) {
        await prisma.permission.upsert({ where: { key: perm.key }, update: perm, create: perm });
      }
      permissions = await prisma.permission.findMany({ orderBy: [{ group: 'asc' }, { key: 'asc' }] });
    }

    res.json(permissions);
  } catch (err) { next(err); }
});

adminRolesRouter.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      displayName: z.string().min(1),
      color: z.string().optional(),
      permissionIds: z.array(z.string()).optional(),
    });
    const { permissionIds, ...data } = schema.parse(req.body);

    const role = await prisma.role.create({
      data: {
        ...data,
        ...(permissionIds?.length ? {
          permissions: { create: permissionIds.map((permissionId) => ({ permissionId })) },
        } : {}),
      },
      include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
    });

    await createAuditLog(req.userId!, 'role.create', 'Role', role.id, { name: role.name, permissionIds }, getClientIp(req));
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
