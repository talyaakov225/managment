import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow-super-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'taskflow-refresh-secret-key-change-in-production';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

function generateTokens(userId: string, globalRole: string = 'USER') {
  const accessToken = jwt.sign({ userId, globalRole }, JWT_SECRET, { expiresIn: '7d' });
  const refreshToken = jwt.sign({ userId, globalRole }, JWT_REFRESH_SECRET, { expiresIn: '30d' });
  return { accessToken, refreshToken };
}

export const authRouter = Router();

authRouter.post('/register', async (req, res: Response, next) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new AppError('Email already registered', 409);
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        isApproved: false,
      },
    });

    res.status(201).json({ pendingApproval: true, message: 'Account created. Awaiting admin approval.' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    next(err);
  }
});

authRouter.post('/login', async (req, res: Response, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const validPassword = await bcrypt.compare(data.password, user.password);
    if (!validPassword) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isApproved) {
      res.status(403).json({ error: 'PENDING_APPROVAL', message: 'Your account is pending admin approval.' });
      return;
    }

    const tokens = generateTokens(user.id, user.globalRole);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        globalRole: user.globalRole,
        createdAt: user.createdAt,
      },
      ...tokens,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    next(err);
  }
});

authRouter.get('/me', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, avatar: true, globalRole: true, isApproved: true, createdAt: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.isApproved) {
      throw new AppError('Account not approved', 403);
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

authRouter.put('/profile', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2).optional(),
      avatar: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.userId },
      data,
      select: { id: true, name: true, email: true, avatar: true, globalRole: true, createdAt: true },
    });

    res.json(user);
  } catch (err) {
    next(err);
  }
});

authRouter.put('/password', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    });

    const data = schema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) throw new AppError('User not found', 404);

    const valid = await bcrypt.compare(data.currentPassword, user.password);
    if (!valid) throw new AppError('Current password is incorrect', 400);

    const hashed = await bcrypt.hash(data.newPassword, 12);
    await prisma.user.update({
      where: { id: req.userId },
      data: { password: hashed },
    });

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', async (req, res: Response, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError('Refresh token required', 400);

    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isApproved) throw new AppError('Invalid token', 401);

    const tokens = generateTokens(user.id, user.globalRole);
    res.json(tokens);
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});
