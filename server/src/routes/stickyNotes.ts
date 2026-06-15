import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const stickyNoteRouter = Router();
stickyNoteRouter.use(authenticate);

stickyNoteRouter.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const notes = await prisma.stickyNote.findMany({
      where: { userId: req.userId! },
      orderBy: { position: 'asc' },
    });
    res.json(notes);
  } catch (err) { next(err); }
});

stickyNoteRouter.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const count = await prisma.stickyNote.count({ where: { userId: req.userId! } });
    const note = await prisma.stickyNote.create({
      data: {
        content: req.body.content || '',
        color: req.body.color || '#fef08a',
        position: count,
        userId: req.userId!,
      },
    });
    res.status(201).json(note);
  } catch (err) { next(err); }
});

stickyNoteRouter.put('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const note = await prisma.stickyNote.findUnique({ where: { id: req.params.id } });
    if (!note || note.userId !== req.userId) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const updated = await prisma.stickyNote.update({
      where: { id: req.params.id },
      data: {
        ...(req.body.content !== undefined && { content: req.body.content }),
        ...(req.body.color && { color: req.body.color }),
        ...(req.body.position !== undefined && { position: req.body.position }),
      },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

stickyNoteRouter.delete('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const note = await prisma.stickyNote.findUnique({ where: { id: req.params.id } });
    if (!note || note.userId !== req.userId) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    await prisma.stickyNote.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});
