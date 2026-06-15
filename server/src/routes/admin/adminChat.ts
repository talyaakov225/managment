import { Router, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { AuthRequest } from '../../middleware/auth';

export const adminChatRouter = Router();

adminChatRouter.get('/stats', async (_req: AuthRequest, res: Response, next) => {
  try {
    const [channels, messages, attachments] = await Promise.all([
      prisma.chatChannel.findMany({
        select: {
          id: true,
          name: true,
          isGeneral: true,
          createdAt: true,
          _count: { select: { messages: true, members: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.chatMessage.count(),
      prisma.messageAttachment.count(),
    ]);

    res.json({ channels, totalMessages: messages, totalAttachments: attachments });
  } catch (err) {
    next(err);
  }
});

adminChatRouter.delete('/channels/:id/messages', async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const channel = await prisma.chatChannel.findUnique({ where: { id } });
    if (!channel) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }

    await prisma.messageAttachment.deleteMany({
      where: { message: { channelId: id } },
    });
    await prisma.messageReaction.deleteMany({
      where: { message: { channelId: id } },
    });
    const result = await prisma.chatMessage.deleteMany({ where: { channelId: id } });

    res.json({ deleted: result.count });
  } catch (err) {
    next(err);
  }
});

adminChatRouter.delete('/messages/all', async (_req: AuthRequest, res: Response, next) => {
  try {
    await prisma.messageAttachment.deleteMany({});
    await prisma.messageReaction.deleteMany({});
    const result = await prisma.chatMessage.deleteMany({});

    res.json({ deleted: result.count });
  } catch (err) {
    next(err);
  }
});

adminChatRouter.delete('/channels/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const channel = await prisma.chatChannel.findUnique({ where: { id } });
    if (!channel) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }
    if (channel.isGeneral) {
      res.status(400).json({ error: 'Cannot delete the general channel' });
      return;
    }

    await prisma.chatChannel.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
