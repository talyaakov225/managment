import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const commentRouter = Router();

commentRouter.use(authenticate);

commentRouter.get('/:id/comments', async (req: AuthRequest, res: Response, next) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { taskId: req.params.id },
      include: {
        author: { select: { id: true, name: true, email: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(comments);
  } catch (err) {
    next(err);
  }
});

commentRouter.post('/:id/comments', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      content: z.string().min(1, 'Comment cannot be empty'),
    });

    const data = schema.parse(req.body);

    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) throw new AppError('Task not found', 404);

    const comment = await prisma.comment.create({
      data: {
        content: data.content,
        taskId: req.params.id,
        authorId: req.userId!,
      },
      include: {
        author: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    res.status(201).json(comment);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    next(err);
  }
});
