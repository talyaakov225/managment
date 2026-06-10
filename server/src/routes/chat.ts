import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const chatRouter = Router();
chatRouter.use(authenticate);

chatRouter.get('/channels', async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userId!;

    let generalChannel = await prisma.chatChannel.findFirst({ where: { isGeneral: true } });
    if (!generalChannel) {
      generalChannel = await prisma.chatChannel.create({
        data: { name: 'כללי', description: 'ערוץ כללי לכל חברי הצוות', isGeneral: true },
      });
    }

    const isMember = await prisma.chatMember.findUnique({
      where: { channelId_userId: { channelId: generalChannel.id, userId } },
    });
    if (!isMember) {
      await prisma.chatMember.create({ data: { channelId: generalChannel.id, userId } });
    }

    const channels = await prisma.chatChannel.findMany({
      where: {
        OR: [
          { isGeneral: true },
          { members: { some: { userId } } },
        ],
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { author: { select: { id: true, name: true } } },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const enriched = channels.map((ch) => {
      const membership = ch.members.find((m) => m.userId === userId);
      const unreadCount = membership
        ? 0 // Will be computed below
        : 0;
      return { ...ch, unreadCount };
    });

    res.json(enriched);
  } catch (err) { next(err); }
});

chatRouter.post('/channels', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      memberIds: z.array(z.string()).optional(),
    });
    const data = schema.parse(req.body);
    const userId = req.userId!;

    const channel = await prisma.chatChannel.create({
      data: {
        name: data.name,
        description: data.description,
        members: {
          create: [
            { userId },
            ...(data.memberIds || []).filter((id) => id !== userId).map((id) => ({ userId: id })),
          ],
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
      },
    });

    res.status(201).json(channel);
  } catch (err) { next(err); }
});

chatRouter.post('/channels/direct', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({ targetUserId: z.string() });
    const { targetUserId } = schema.parse(req.body);
    const userId = req.userId!;

    if (targetUserId === userId) throw new AppError('Cannot chat with yourself', 400);

    const existing = await prisma.chatChannel.findFirst({
      where: {
        isGeneral: false,
        members: { every: { userId: { in: [userId, targetUserId] } } },
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: targetUserId } } },
        ],
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
      },
    });

    if (existing) {
      const memberCount = await prisma.chatMember.count({ where: { channelId: existing.id } });
      if (memberCount === 2) {
        res.json(existing);
        return;
      }
    }

    const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { name: true } });
    if (!target) throw new AppError('User not found', 404);

    const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

    const channel = await prisma.chatChannel.create({
      data: {
        name: `${me?.name} & ${target.name}`,
        members: {
          create: [{ userId }, { userId: targetUserId }],
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
      },
    });

    res.status(201).json(channel);
  } catch (err) { next(err); }
});

chatRouter.get('/channels/:id/messages', async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 50;

    const messages = await prisma.chatMessage.findMany({
      where: { channelId: id },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        task: { select: { id: true, title: true, status: true, projectId: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    await prisma.chatMember.updateMany({
      where: { channelId: id, userId: req.userId! },
      data: { lastRead: new Date() },
    });

    res.json(messages.reverse());
  } catch (err) { next(err); }
});

chatRouter.post('/channels/:id/messages', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      content: z.string().min(1),
      taskId: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const { id } = req.params;
    const userId = req.userId!;

    const channel = await prisma.chatChannel.findUnique({ where: { id } });
    if (!channel) throw new AppError('Channel not found', 404);

    const message = await prisma.chatMessage.create({
      data: {
        content: data.content,
        channelId: id,
        authorId: userId,
        taskId: data.taskId || null,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        task: { select: { id: true, title: true, status: true, projectId: true } },
      },
    });

    await prisma.chatChannel.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    const members = await prisma.chatMember.findMany({
      where: { channelId: id, userId: { not: userId } },
      select: { userId: true },
    });

    const author = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    if (members.length > 0) {
      await prisma.notification.createMany({
        data: members.map((m) => ({
          type: 'chat_message',
          title: `הודעה חדשה מ-${author?.name || 'משתמש'}`,
          body: data.content.length > 80 ? data.content.substring(0, 80) + '...' : data.content,
          userId: m.userId,
          linkUrl: '/chat',
        })),
      });
    }

    res.status(201).json(message);
  } catch (err) { next(err); }
});

chatRouter.get('/channels/:id/members', async (req: AuthRequest, res: Response, next) => {
  try {
    const members = await prisma.chatMember.findMany({
      where: { channelId: req.params.id },
      include: { user: { select: { id: true, name: true, avatar: true, email: true } } },
    });
    res.json(members);
  } catch (err) { next(err); }
});

chatRouter.post('/channels/:id/members', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({ userId: z.string() });
    const { userId } = schema.parse(req.body);

    await prisma.chatMember.create({
      data: { channelId: req.params.id, userId },
    });

    res.json({ message: 'Member added' });
  } catch (err) { next(err); }
});

chatRouter.get('/users', async (req: AuthRequest, res: Response, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { isApproved: true, id: { not: req.userId } },
      select: { id: true, name: true, avatar: true, email: true },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (err) { next(err); }
});

chatRouter.get('/unread-count', async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userId!;
    const memberships = await prisma.chatMember.findMany({
      where: { userId },
      select: { channelId: true, lastRead: true },
    });

    let total = 0;
    for (const m of memberships) {
      const count = await prisma.chatMessage.count({
        where: {
          channelId: m.channelId,
          createdAt: { gt: m.lastRead },
          authorId: { not: userId },
        },
      });
      total += count;
    }

    res.json({ count: total });
  } catch (err) { next(err); }
});
