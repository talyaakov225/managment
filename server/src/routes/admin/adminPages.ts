import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { AuthRequest } from '../../middleware/auth';
import { createAuditLog, getClientIp } from '../../middleware/adminAuth';
import { AppError } from '../../middleware/errorHandler';

export const adminPagesRouter = Router();

adminPagesRouter.get('/', async (_req: AuthRequest, res: Response, next) => {
  try {
    const pages = await prisma.customPage.findMany({
      include: { _count: { select: { blocks: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(pages);
  } catch (err) { next(err); }
});

adminPagesRouter.get('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const page = await prisma.customPage.findUnique({
      where: { id: req.params.id },
      include: { blocks: { orderBy: { position: 'asc' } } },
    });
    if (!page) throw new AppError('Page not found', 404);
    res.json(page);
  } catch (err) { next(err); }
});

adminPagesRouter.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
      title_he: z.string().min(1),
      title_en: z.string().min(1),
      description: z.string().optional(),
      isPublished: z.boolean().optional(),
      requiredPermission: z.string().nullable().optional(),
    });
    const data = schema.parse(req.body);
    const page = await prisma.customPage.create({
      data,
      include: { blocks: true, _count: { select: { blocks: true } } },
    });
    await createAuditLog(req.userId!, 'page.create', 'CustomPage', page.id, { slug: page.slug }, getClientIp(req));
    res.status(201).json(page);
  } catch (err) { next(err); }
});

adminPagesRouter.put('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      title_he: z.string().optional(),
      title_en: z.string().optional(),
      description: z.string().nullable().optional(),
      isPublished: z.boolean().optional(),
      requiredPermission: z.string().nullable().optional(),
    });
    const data = schema.parse(req.body);
    const page = await prisma.customPage.update({
      where: { id: req.params.id },
      data,
      include: { blocks: { orderBy: { position: 'asc' } }, _count: { select: { blocks: true } } },
    });
    await createAuditLog(req.userId!, 'page.update', 'CustomPage', page.id, data, getClientIp(req));
    res.json(page);
  } catch (err) { next(err); }
});

adminPagesRouter.delete('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    await prisma.customPage.delete({ where: { id: req.params.id } });
    await createAuditLog(req.userId!, 'page.delete', 'CustomPage', req.params.id, {}, getClientIp(req));
    res.json({ message: 'Page deleted' });
  } catch (err) { next(err); }
});

// ── Page Blocks ──

adminPagesRouter.post('/:id/blocks', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      type: z.enum(['text', 'heading', 'table', 'cards', 'stats', 'list', 'divider']),
      content: z.string(),
      settings: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const maxPos = await prisma.pageBlock.findFirst({
      where: { pageId: req.params.id },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const block = await prisma.pageBlock.create({
      data: { ...data, pageId: req.params.id, position: (maxPos?.position ?? -1) + 1 },
    });
    res.status(201).json(block);
  } catch (err) { next(err); }
});

adminPagesRouter.put('/:pageId/blocks/:blockId', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      type: z.string().optional(),
      content: z.string().optional(),
      position: z.number().int().optional(),
      settings: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const block = await prisma.pageBlock.update({ where: { id: req.params.blockId }, data });
    res.json(block);
  } catch (err) { next(err); }
});

adminPagesRouter.delete('/:pageId/blocks/:blockId', async (req: AuthRequest, res: Response, next) => {
  try {
    await prisma.pageBlock.delete({ where: { id: req.params.blockId } });
    res.json({ message: 'Block deleted' });
  } catch (err) { next(err); }
});
