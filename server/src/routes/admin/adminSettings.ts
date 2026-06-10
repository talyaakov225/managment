import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { AuthRequest } from '../../middleware/auth';
import { createAuditLog, getClientIp } from '../../middleware/adminAuth';

export const adminSettingsRouter = Router();

adminSettingsRouter.get('/', async (_req: AuthRequest, res: Response, next) => {
  try {
    const settings = await prisma.systemSetting.findMany({ orderBy: [{ group: 'asc' }, { key: 'asc' }] });
    res.json(settings);
  } catch (err) { next(err); }
});

adminSettingsRouter.put('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({ value: z.string() });
    const { value } = schema.parse(req.body);

    const old = await prisma.systemSetting.findUnique({ where: { id: req.params.id } });
    const setting = await prisma.systemSetting.update({ where: { id: req.params.id }, data: { value } });

    await createAuditLog(req.userId!, 'setting.update', 'SystemSetting', setting.id,
      { key: setting.key, oldValue: old?.value, newValue: value }, getClientIp(req));
    res.json(setting);
  } catch (err) { next(err); }
});

adminSettingsRouter.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      key: z.string().min(1),
      value: z.string(),
      type: z.enum(['string', 'boolean', 'number', 'json']).optional(),
      group: z.string().optional(),
      label_he: z.string().optional(),
      label_en: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const setting = await prisma.systemSetting.create({ data });
    await createAuditLog(req.userId!, 'setting.create', 'SystemSetting', setting.id, data, getClientIp(req));
    res.status(201).json(setting);
  } catch (err) { next(err); }
});

adminSettingsRouter.delete('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    await prisma.systemSetting.delete({ where: { id: req.params.id } });
    await createAuditLog(req.userId!, 'setting.delete', 'SystemSetting', req.params.id, {}, getClientIp(req));
    res.json({ message: 'Setting deleted' });
  } catch (err) { next(err); }
});
