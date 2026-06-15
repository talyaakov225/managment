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

commentRouter.put('/comments/:commentId', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      content: z.string().min(1, 'Comment cannot be empty'),
    });
    const data = schema.parse(req.body);

    const comment = await prisma.comment.findUnique({ where: { id: req.params.commentId } });
    if (!comment) throw new AppError('Comment not found', 404);
    if (comment.authorId !== req.userId) throw new AppError('Not authorized', 403);

    const updated = await prisma.comment.update({
      where: { id: req.params.commentId },
      data: { content: data.content },
      include: {
        author: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    next(err);
  }
});

commentRouter.delete('/comments/:commentId', async (req: AuthRequest, res: Response, next) => {
  try {
    const comment = await prisma.comment.findUnique({ where: { id: req.params.commentId } });
    if (!comment) throw new AppError('Comment not found', 404);
    if (comment.authorId !== req.userId) throw new AppError('Not authorized', 403);

    await prisma.comment.delete({ where: { id: req.params.commentId } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
