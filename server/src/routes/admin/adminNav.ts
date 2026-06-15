import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { AuthRequest } from '../../middleware/auth';
import { createAuditLog, getClientIp } from '../../middleware/adminAuth';

export const adminNavRouter = Router();

adminNavRouter.get('/', async (_req: AuthRequest, res: Response, next) => {
  try {
    const items = await prisma.navItem.findMany({
      where: { parentId: null },
      include: { children: { orderBy: { position: 'asc' } } },
      orderBy: { position: 'asc' },
    });
    res.json(items);
  } catch (err) { next(err); }
});

adminNavRouter.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      label_he: z.string().min(1),
      label_en: z.string().min(1),
      icon: z.string().optional(),
      href: z.string().min(1),
      visible: z.boolean().optional(),
      parentId: z.string().nullable().optional(),
      requiredPermission: z.string().nullable().optional(),
    });
    const data = schema.parse(req.body);

    let createdPageId: string | null = null;

    const pageMatch = data.href.match(/^\/pages\/([a-z0-9-]+)$/i);
    if (pageMatch) {
      const slug = pageMatch[1].toLowerCase();
      const existing = await prisma.customPage.findUnique({ where: { slug } });
      if (!existing) {
        const page = await prisma.customPage.create({
          data: {
            slug,
            title_he: data.label_he,
            title_en: data.label_en,
            isPublished: true,
          },
        });
        createdPageId = page.id;
        await createAuditLog(req.userId!, 'page.auto_create', 'CustomPage', page.id, { slug, fromNav: true }, getClientIp(req));
      } else {
        createdPageId = existing.id;
      }
    }

    const maxPos = await prisma.navItem.findFirst({
      where: { parentId: data.parentId || null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const item = await prisma.navItem.create({
      data: { ...data, position: (maxPos?.position ?? -1) + 1 },
      include: { children: true },
    });
    await createAuditLog(req.userId!, 'nav.create', 'NavItem', item.id, data, getClientIp(req));
    res.status(201).json({ ...item, _createdPageId: createdPageId });
  } catch (err) { next(err); }
});

adminNavRouter.put('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      label_he: z.string().optional(),
      label_en: z.string().optional(),
      icon: z.string().optional(),
      href: z.string().optional(),
      position: z.number().int().optional(),
      visible: z.boolean().optional(),
      requiredPermission: z.string().nullable().optional(),
    });
    const data = schema.parse(req.body);
    const item = await prisma.navItem.update({
      where: { id: req.params.id },
      data,
      include: { children: true },
    });
    await createAuditLog(req.userId!, 'nav.update', 'NavItem', item.id, data, getClientIp(req));
    res.json(item);
  } catch (err) { next(err); }
});

adminNavRouter.delete('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    await prisma.navItem.deleteMany({ where: { parentId: req.params.id } });
    await prisma.navItem.delete({ where: { id: req.params.id } });
    await createAuditLog(req.userId!, 'nav.delete', 'NavItem', req.params.id, {}, getClientIp(req));
    res.json({ message: 'Navigation item deleted' });
  } catch (err) { next(err); }
});
