import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from './auth';
import { AppError } from './errorHandler';

export function requireAdmin(req: AuthRequest, _res: Response, next: NextFunction): void {
  if (!req.userId || !req.globalRole) {
    throw new AppError('Authentication required', 401);
  }
  if (req.globalRole !== 'ADMIN' && req.globalRole !== 'SUPER_ADMIN') {
    throw new AppError('Admin access required', 403);
  }
  next();
}

export function requireSuperAdmin(req: AuthRequest, _res: Response, next: NextFunction): void {
  if (!req.userId || req.globalRole !== 'SUPER_ADMIN') {
    throw new AppError('Super admin access required', 403);
  }
  next();
}

export function requirePermission(permissionKey: string) {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.userId) throw new AppError('Authentication required', 401);
    if (req.globalRole === 'SUPER_ADMIN') { next(); return; }

    const userRoles = await prisma.userRole.findMany({
      where: { userId: req.userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    const hasPermission = userRoles.some((ur) =>
      ur.role.permissions.some((rp) => rp.permission.key === permissionKey)
    );

    if (!hasPermission) {
      throw new AppError('Insufficient permissions', 403);
    }
    next();
  };
}

export async function createAuditLog(
  userId: string,
  action: string,
  entity: string,
  entityId?: string,
  details?: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      details: details ? JSON.stringify(details) : undefined,
      ipAddress,
    },
  });
}

export function getClientIp(req: AuthRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}
