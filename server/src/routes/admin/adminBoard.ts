import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { AuthRequest } from '../../middleware/auth';
import { createAuditLog, getClientIp } from '../../middleware/adminAuth';
import { AppError } from '../../middleware/errorHandler';

export const adminBoardRouter = Router();

// ── Statuses ──

adminBoardRouter.get('/statuses', async (_req: AuthRequest, res: Response, next) => {
  try {
    const statuses = await prisma.boardStatus.findMany({ orderBy: { position: 'asc' } });
    res.json(statuses);
  } catch (err) { next(err); }
});

adminBoardRouter.post('/statuses', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      key: z.string().min(1).toUpperCase(),
      label_he: z.string().min(1),
      label_en: z.string().min(1),
      color: z.string(),
      bgColor: z.string(),
    });
    const data = schema.parse(req.body);
    const maxPos = await prisma.boardStatus.findFirst({ orderBy: { position: 'desc' }, select: { position: true } });
    const status = await prisma.boardStatus.create({ data: { ...data, position: (maxPos?.position ?? -1) + 1 } });
    await createAuditLog(req.userId!, 'board.status_create', 'BoardStatus', status.id, data, getClientIp(req));
    res.status(201).json(status);
  } catch (err) { next(err); }
});

adminBoardRouter.put('/statuses/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      label_he: z.string().min(1).optional(),
      label_en: z.string().min(1).optional(),
      color: z.string().optional(),
      bgColor: z.string().optional(),
      position: z.number().int().optional(),
    });
    const data = schema.parse(req.body);
    const status = await prisma.boardStatus.update({ where: { id: req.params.id }, data });
    await createAuditLog(req.userId!, 'board.status_update', 'BoardStatus', status.id, data, getClientIp(req));
    res.json(status);
  } catch (err) { next(err); }
});

adminBoardRouter.put('/statuses/reorder', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({ ids: z.array(z.string()) });
    const { ids } = schema.parse(req.body);
    await Promise.all(ids.map((id, i) => prisma.boardStatus.update({ where: { id }, data: { position: i } })));
    await createAuditLog(req.userId!, 'board.status_reorder', 'BoardStatus', null, { order: ids }, getClientIp(req));
    res.json({ message: 'Reordered' });
  } catch (err) { next(err); }
});

adminBoardRouter.delete('/statuses/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const status = await prisma.boardStatus.findUnique({ where: { id: req.params.id } });
    if (!status) throw new AppError('Status not found', 404);
    if (status.isDefault) throw new AppError('Cannot delete default status', 400);
    await prisma.boardStatus.delete({ where: { id: req.params.id } });
    await createAuditLog(req.userId!, 'board.status_delete', 'BoardStatus', req.params.id, { key: status.key }, getClientIp(req));
    res.json({ message: 'Status deleted' });
  } catch (err) { next(err); }
});

// ── Priorities ──

adminBoardRouter.get('/priorities', async (_req: AuthRequest, res: Response, next) => {
  try {
    const priorities = await prisma.boardPriority.findMany({ orderBy: { position: 'asc' } });
    res.json(priorities);
  } catch (err) { next(err); }
});

adminBoardRouter.post('/priorities', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      key: z.string().min(1).toUpperCase(),
      label_he: z.string().min(1),
      label_en: z.string().min(1),
      color: z.string(),
      dotColor: z.string(),
    });
    const data = schema.parse(req.body);
    const maxPos = await prisma.boardPriority.findFirst({ orderBy: { position: 'desc' }, select: { position: true } });
    const priority = await prisma.boardPriority.create({ data: { ...data, position: (maxPos?.position ?? -1) + 1 } });
    await createAuditLog(req.userId!, 'board.priority_create', 'BoardPriority', priority.id, data, getClientIp(req));
    res.status(201).json(priority);
  } catch (err) { next(err); }
});

adminBoardRouter.put('/priorities/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      label_he: z.string().optional(),
      label_en: z.string().optional(),
      color: z.string().optional(),
      dotColor: z.string().optional(),
      position: z.number().int().optional(),
    });
    const data = schema.parse(req.body);
    const priority = await prisma.boardPriority.update({ where: { id: req.params.id }, data });
    await createAuditLog(req.userId!, 'board.priority_update', 'BoardPriority', priority.id, data, getClientIp(req));
    res.json(priority);
  } catch (err) { next(err); }
});

adminBoardRouter.put('/priorities/reorder', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({ ids: z.array(z.string()) });
    const { ids } = schema.parse(req.body);
    await Promise.all(ids.map((id, i) => prisma.boardPriority.update({ where: { id }, data: { position: i } })));
    await createAuditLog(req.userId!, 'board.priority_reorder', 'BoardPriority', null, { order: ids }, getClientIp(req));
    res.json({ message: 'Reordered' });
  } catch (err) { next(err); }
});

adminBoardRouter.delete('/priorities/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    await prisma.boardPriority.delete({ where: { id: req.params.id } });
    await createAuditLog(req.userId!, 'board.priority_delete', 'BoardPriority', req.params.id, {}, getClientIp(req));
    res.json({ message: 'Priority deleted' });
  } catch (err) { next(err); }
});

// ── Categories ──

adminBoardRouter.get('/categories', async (_req: AuthRequest, res: Response, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { position: 'asc' },
      include: { _count: { select: { tasks: true } } },
    });
    res.json(categories);
  } catch (err) { next(err); }
});

adminBoardRouter.post('/categories', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({ name: z.string().min(1), color: z.string().optional() });
    const data = schema.parse(req.body);
    const maxPos = await prisma.category.findFirst({ orderBy: { position: 'desc' }, select: { position: true } });
    const category = await prisma.category.create({ data: { ...data, position: (maxPos?.position ?? -1) + 1 } });
    await createAuditLog(req.userId!, 'board.category_create', 'Category', category.id, data, getClientIp(req));
    res.status(201).json(category);
  } catch (err) { next(err); }
});

adminBoardRouter.put('/categories/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({ name: z.string().optional(), color: z.string().optional(), position: z.number().int().optional() });
    const data = schema.parse(req.body);
    const category = await prisma.category.update({ where: { id: req.params.id }, data });
    await createAuditLog(req.userId!, 'board.category_update', 'Category', category.id, data, getClientIp(req));
    res.json(category);
  } catch (err) { next(err); }
});

adminBoardRouter.put('/categories/reorder', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({ ids: z.array(z.string()) });
    const { ids } = schema.parse(req.body);
    await Promise.all(ids.map((id, i) => prisma.category.update({ where: { id }, data: { position: i } })));
    await createAuditLog(req.userId!, 'board.category_reorder', 'Category', null, { order: ids }, getClientIp(req));
    res.json({ message: 'Reordered' });
  } catch (err) { next(err); }
});

adminBoardRouter.delete('/categories/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    await createAuditLog(req.userId!, 'board.category_delete', 'Category', req.params.id, {}, getClientIp(req));
    res.json({ message: 'Category deleted' });
  } catch (err) { next(err); }
});
