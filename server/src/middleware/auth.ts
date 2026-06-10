import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow-super-secret-key-change-in-production';

export interface AuthRequest extends Request {
  userId?: string;
  globalRole?: string;
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('Authentication required', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; globalRole?: string };
    req.userId = payload.userId;
    req.globalRole = payload.globalRole || 'USER';
    next();
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }
}
