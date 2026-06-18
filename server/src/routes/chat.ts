import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import path from 'path';
import fs from 'fs';

export const chatRouter = Router();
chatRouter.use(authenticate);

const typingStore = new Map<string, Map<string, { name: string; at: number }>>();

const MESSAGE_INCLUDE = {
  author: { select: { id: true, name: true, avatar: true } },
  task: { select: { id: true, title: true, status: true, projectId: true } },
  replyTo: { include: { author: { select: { id: true, name: true } } } },
  reactions: { include: { user: { select: { id: true, name: true } } } },
  attachments: true,
  pinnedBy: { select: { id: true, name: true } },
};

// ── Channels ──

chatRouter.get('/channels', async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userId!;

    let generalChannel = await prisma.chatChannel.findFirst({ where: { isGeneral: true } });
    if (!generalChannel) {
      generalChannel = await prisma.chatChannel.create({
        data: { name: 'כללי', description: 'ערוץ כללי לכל חברי הצוות', isGeneral: true },
      });
    }

    await prisma.chatMember.upsert({
      where: { channelId_userId: { channelId: generalChannel.id, userId } },
      create: { channelId: generalChannel.id, userId },
      update: {},
    });

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
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { author: { select: { id: true, name: true } } },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const enriched = await Promise.all(
      channels.map(async (ch) => {
        const membership = ch.members.find((m) => m.userId === userId);
        let unreadCount = 0;
        if (membership) {
          unreadCount = await prisma.chatMessage.count({
            where: {
              channelId: ch.id,
              createdAt: { gt: membership.lastRead },
              authorId: { not: userId },
              isDeleted: false,
            },
          });
        }
        return { ...ch, unreadCount };
      })
    );

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
        members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        messages: { take: 0 },
        _count: { select: { messages: true } },
      },
    });

    res.status(201).json({ ...channel, unreadCount: 0 });
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
        members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        messages: { where: { isDeleted: false }, orderBy: { createdAt: 'desc' }, take: 1, include: { author: { select: { id: true, name: true } } } },
        _count: { select: { messages: true } },
      },
    });

    if (existing) {
      const memberCount = await prisma.chatMember.count({ where: { channelId: existing.id } });
      if (memberCount === 2) {
        res.json({ ...existing, unreadCount: 0 });
        return;
      }
    }

    const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { name: true } });
    if (!target) throw new AppError('User not found', 404);
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

    const channel = await prisma.chatChannel.create({
      data: {
        name: `${me?.name} & ${target.name}`,
        members: { create: [{ userId }, { userId: targetUserId }] },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        messages: { take: 0 },
        _count: { select: { messages: true } },
      },
    });

    res.status(201).json({ ...channel, unreadCount: 0 });
  } catch (err) { next(err); }
});

chatRouter.put('/channels/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({ name: z.string().min(1).optional(), description: z.string().optional() });
    const data = schema.parse(req.body);
    const updated = await prisma.chatChannel.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch (err) { next(err); }
});

chatRouter.delete('/channels/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const ch = await prisma.chatChannel.findUnique({ where: { id: req.params.id } });
    if (ch?.isGeneral) throw new AppError('Cannot delete general channel', 400);
    await prisma.chatChannel.delete({ where: { id: req.params.id } });
    res.json({ message: 'Channel deleted' });
  } catch (err) { next(err); }
});

// ── Messages ──

chatRouter.get('/channels/:id/messages', async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 50;

    const total = await prisma.chatMessage.count({ where: { channelId: id } });

    const messages = await prisma.chatMessage.findMany({
      where: { channelId: id },
      include: MESSAGE_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    await prisma.$executeRaw`UPDATE "ChatMember" SET "lastRead" = NOW() WHERE "channelId" = ${id} AND "userId" = ${req.userId!}`;

    res.json({ messages: messages.reverse(), total, page, hasMore: page * limit < total });
  } catch (err) { next(err); }
});

chatRouter.post('/channels/:id/messages', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      content: z.string().min(1),
      taskId: z.string().optional(),
      replyToId: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const { id } = req.params;
    const userId = req.userId!;

    const channel = await prisma.chatChannel.findUnique({ where: { id } });
    if (!channel) throw new AppError('Channel not found', 404);

    // Handle bot commands
    if (data.content.startsWith('/')) {
      const botResult = await handleBotCommand(data.content, userId, id);
      if (botResult) {
        const botMsg = await prisma.chatMessage.create({
          data: { content: botResult, channelId: id, authorId: userId, type: 'bot' },
          include: MESSAGE_INCLUDE,
        });
        await prisma.chatChannel.update({ where: { id }, data: { updatedAt: new Date() } });
        res.status(201).json(botMsg);
        return;
      }
    }

    const message = await prisma.chatMessage.create({
      data: {
        content: data.content,
        channelId: id,
        authorId: userId,
        taskId: data.taskId || null,
        replyToId: data.replyToId || null,
      },
      include: MESSAGE_INCLUDE,
    });

    await prisma.chatChannel.update({ where: { id }, data: { updatedAt: new Date() } });

    const author = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const authorName = author?.name || 'משתמש';

    const mentionMatches = data.content.match(/@([^\s]+(?:\s[^\s@]+)?)/g);
    const mentionedNames = mentionMatches ? mentionMatches.map((m: string) => m.slice(1).trim()) : [];

    let mentionedUserIds: string[] = [];
    if (mentionedNames.length > 0) {
      const mentionedUsers = await prisma.user.findMany({
        where: { name: { in: mentionedNames } },
        select: { id: true },
      });
      mentionedUserIds = mentionedUsers.map((u) => u.id).filter((uid) => uid !== userId);
      if (mentionedUserIds.length > 0) {
        await prisma.notification.createMany({
          data: mentionedUserIds.map((uid) => ({
            type: 'chat_mention',
            title: `${authorName} תייג/ה אותך בצ'אט`,
            body: data.content.length > 80 ? data.content.substring(0, 80) + '...' : data.content,
            userId: uid,
            linkUrl: '/chat',
          })),
        });
      }
    }

    if (data.taskId) {
      const linkedTask = await prisma.task.findUnique({
        where: { id: data.taskId },
        select: { title: true, projectId: true, assignees: { select: { userId: true } } },
      });
      if (linkedTask) {
        if (mentionedUserIds.length > 0) {
          const existingAssigneeIds = new Set(linkedTask.assignees.map((a) => a.userId));
          const newAssignees = mentionedUserIds.filter((uid) => !existingAssigneeIds.has(uid));
          if (newAssignees.length > 0) {
            await prisma.taskAssignee.createMany({
              data: newAssignees.map((uid) => ({ taskId: data.taskId!, userId: uid, role: 'EDITOR' as const })),
              skipDuplicates: true,
            });
            await prisma.notification.createMany({
              data: newAssignees.map((uid) => ({
                type: 'task_assigned',
                title: `${authorName} שייך/ה אותך למשימה "${linkedTask.title}"`,
                body: `שויכת למשימה דרך הצ'אט`,
                userId: uid,
                linkUrl: `/projects/${linkedTask.projectId}`,
              })),
            });
          }
        }

        const taskAssigneeIds = linkedTask.assignees
          .map((a) => a.userId)
          .filter((uid) => uid !== userId && !mentionedUserIds.includes(uid));
        if (taskAssigneeIds.length > 0) {
          await prisma.notification.createMany({
            data: taskAssigneeIds.map((uid) => ({
              type: 'chat_task_link',
              title: `${authorName} שיתף/ה את המשימה "${linkedTask.title}" בצ'אט`,
              body: data.content.length > 80 ? data.content.substring(0, 80) + '...' : data.content,
              userId: uid,
              linkUrl: '/chat',
            })),
          });
        }
      }
    }

    const members = await prisma.chatMember.findMany({
      where: { channelId: id, userId: { not: userId } },
      select: { userId: true },
    });
    const alreadyNotified = new Set(mentionedUserIds);
    const regularMembers = members.filter((m) => !alreadyNotified.has(m.userId));
    if (regularMembers.length > 0) {
      await prisma.notification.createMany({
        data: regularMembers.map((m) => ({
          type: 'chat_message',
          title: `הודעה חדשה מ-${authorName}`,
          body: data.content.length > 80 ? data.content.substring(0, 80) + '...' : data.content,
          userId: m.userId,
          linkUrl: '/chat',
        })),
      });
    }

    res.status(201).json(message);
  } catch (err) { next(err); }
});

// ── Edit / Delete Messages ──

chatRouter.put('/messages/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({ content: z.string().min(1) });
    const { content } = schema.parse(req.body);
    const userId = req.userId!;

    const msg = await prisma.chatMessage.findUnique({ where: { id: req.params.id } });
    if (!msg) throw new AppError('Message not found', 404);
    if (msg.authorId !== userId) throw new AppError('Not authorized', 403);

    const fiveMinutes = 15 * 60 * 1000;
    if (Date.now() - msg.createdAt.getTime() > fiveMinutes) {
      throw new AppError('Edit window expired (15 minutes)', 400);
    }

    const updated = await prisma.chatMessage.update({
      where: { id: req.params.id },
      data: { content, editedAt: new Date() },
      include: MESSAGE_INCLUDE,
    });
    res.json(updated);
  } catch (err) { next(err); }
});

chatRouter.delete('/messages/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userId!;
    const msg = await prisma.chatMessage.findUnique({ where: { id: req.params.id } });
    if (!msg) throw new AppError('Message not found', 404);

    const userRecord = await prisma.user.findUnique({ where: { id: userId }, select: { globalRole: true } });
    const isAdmin = userRecord?.globalRole === 'ADMIN' || userRecord?.globalRole === 'SUPER_ADMIN';

    if (msg.authorId !== userId && !isAdmin) throw new AppError('Not authorized', 403);

    await prisma.chatMessage.update({
      where: { id: req.params.id },
      data: { isDeleted: true, content: '' },
    });
    res.json({ message: 'Message deleted' });
  } catch (err) { next(err); }
});

// ── Reactions ──

chatRouter.post('/messages/:msgId/reactions', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({ emoji: z.string().min(1).max(10) });
    const { emoji } = schema.parse(req.body);
    const userId = req.userId!;
    const { msgId } = req.params;

    const existing = await prisma.messageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId: msgId, userId, emoji } },
    });

    if (existing) {
      await prisma.messageReaction.delete({ where: { id: existing.id } });
      res.json({ action: 'removed' });
    } else {
      await prisma.messageReaction.create({ data: { emoji, messageId: msgId, userId } });

      const message = await prisma.chatMessage.findUnique({
        where: { id: msgId },
        select: { authorId: true, content: true },
      });
      if (message && message.authorId !== userId) {
        const reactor = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
        await prisma.notification.create({
          data: {
            type: 'chat_reaction',
            title: `${reactor?.name || 'משתמש'} הגיב/ה ${emoji} להודעה שלך`,
            body: message.content.length > 60 ? message.content.substring(0, 60) + '...' : message.content,
            userId: message.authorId,
            linkUrl: '/chat',
          },
        });
      }
      res.json({ action: 'added' });
    }
  } catch (err) { next(err); }
});

// ── Pin ──

chatRouter.put('/messages/:id/pin', async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userId!;
    const msg = await prisma.chatMessage.findUnique({ where: { id: req.params.id } });
    if (!msg) throw new AppError('Message not found', 404);

    const updated = await prisma.chatMessage.update({
      where: { id: req.params.id },
      data: {
        isPinned: !msg.isPinned,
        pinnedAt: msg.isPinned ? null : new Date(),
        pinnedById: msg.isPinned ? null : userId,
      },
      include: MESSAGE_INCLUDE,
    });
    res.json(updated);
  } catch (err) { next(err); }
});

chatRouter.get('/channels/:id/pinned', async (req: AuthRequest, res: Response, next) => {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { channelId: req.params.id, isPinned: true, isDeleted: false },
      include: MESSAGE_INCLUDE,
      orderBy: { pinnedAt: 'desc' },
    });
    res.json(messages);
  } catch (err) { next(err); }
});

// ── Members ──

chatRouter.get('/channels/:id/members', async (req: AuthRequest, res: Response, next) => {
  try {
    const members = await prisma.chatMember.findMany({
      where: { channelId: req.params.id },
      include: { user: { select: { id: true, name: true, avatar: true, email: true, lastSeen: true } } },
    });
    res.json(members);
  } catch (err) { next(err); }
});

chatRouter.post('/channels/:id/members', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({ userId: z.string() });
    const { userId } = schema.parse(req.body);
    await prisma.chatMember.create({ data: { channelId: req.params.id, userId } });
    res.json({ message: 'Member added' });
  } catch (err) { next(err); }
});

chatRouter.delete('/channels/:id/members/:userId', async (req: AuthRequest, res: Response, next) => {
  try {
    await prisma.chatMember.delete({
      where: { channelId_userId: { channelId: req.params.id, userId: req.params.userId } },
    });
    res.json({ message: 'Member removed' });
  } catch (err) { next(err); }
});

// ── Search ──

chatRouter.get('/search', async (req: AuthRequest, res: Response, next) => {
  try {
    const q = (req.query.q as string || '').trim();
    const channelId = req.query.channelId as string | undefined;
    if (!q) { res.json([]); return; }

    const userId = req.userId!;
    const memberChannels = await prisma.chatMember.findMany({
      where: { userId },
      select: { channelId: true },
    });
    const channelIds = memberChannels.map((m) => m.channelId);

    const where: Record<string, unknown> = {
      content: { contains: q },
      isDeleted: false,
      channelId: channelId ? { equals: channelId, in: channelIds } : { in: channelIds },
    };

    const messages = await prisma.chatMessage.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        channel: { select: { id: true, name: true, isGeneral: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(messages);
  } catch (err) { next(err); }
});

// ── Typing Indicator ──

chatRouter.post('/channels/:id/typing', async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userId!;
    const channelId = req.params.id;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

    if (!typingStore.has(channelId)) typingStore.set(channelId, new Map());
    typingStore.get(channelId)!.set(userId, { name: user?.name || '', at: Date.now() });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

chatRouter.get('/channels/:id/typing', async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userId!;
    const channelId = req.params.id;
    const now = Date.now();
    const result: { userId: string; name: string }[] = [];

    const channelTyping = typingStore.get(channelId);
    if (channelTyping) {
      for (const [uid, info] of channelTyping) {
        if (uid !== userId && now - info.at < 4000) {
          result.push({ userId: uid, name: info.name });
        } else if (now - info.at >= 4000) {
          channelTyping.delete(uid);
        }
      }
    }
    res.json(result);
  } catch (err) { next(err); }
});

// ── Presence / Heartbeat ──

chatRouter.post('/heartbeat', async (req: AuthRequest, res: Response, next) => {
  try {
    await prisma.user.update({
      where: { id: req.userId! },
      data: { lastSeen: new Date() },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

chatRouter.get('/presence', async (req: AuthRequest, res: Response, next) => {
  try {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const users = await prisma.user.findMany({
      where: { isApproved: true },
      select: { id: true, lastSeen: true },
    });
    const presence: Record<string, boolean> = {};
    for (const u of users) {
      presence[u.id] = u.lastSeen ? u.lastSeen > twoMinutesAgo : false;
    }
    res.json(presence);
  } catch (err) { next(err); }
});

// ── Read Receipts ──

chatRouter.get('/channels/:id/read-status', async (req: AuthRequest, res: Response, next) => {
  try {
    const members = await prisma.chatMember.findMany({
      where: { channelId: req.params.id },
      select: { userId: true, lastRead: true, user: { select: { name: true } } },
    });
    res.json(members);
  } catch (err) { next(err); }
});

// ── File Upload ──

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv',
  '.mp3', '.wav', '.ogg', '.m4a', '.webm',
  '.mp4', '.mov', '.avi',
  '.zip', '.rar', '.7z',
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

chatRouter.post('/upload', async (req: AuthRequest, res: Response, next) => {
  try {
    const uploadDir = path.join(__dirname, '../../uploads/chat');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const chunks: Buffer[] = [];
    let totalSize = 0;
    req.on('data', (chunk: Buffer) => {
      totalSize += chunk.length;
      if (totalSize > MAX_FILE_SIZE * 5) {
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', async () => {
      try {
        const contentType = req.headers['content-type'] || '';

        if (contentType.includes('multipart/form-data')) {
          const boundary = contentType.split('boundary=')[1];
          if (!boundary) { res.status(400).json({ error: 'No boundary' }); return; }

          const raw = Buffer.concat(chunks);
          const parts = parseMultipart(raw, boundary);

          if (parts.length === 0) { res.status(400).json({ error: 'No files' }); return; }

          const results = [];
          for (const part of parts) {
            const ext = (path.extname(part.filename) || '.bin').toLowerCase();
            if (!ALLOWED_EXTENSIONS.has(ext)) {
              res.status(400).json({ error: `File type ${ext} is not allowed` });
              return;
            }
            if (part.data.length > MAX_FILE_SIZE) {
              res.status(400).json({ error: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` });
              return;
            }
            const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
            const filepath = path.join(uploadDir, filename);
            fs.writeFileSync(filepath, part.data);
            results.push({
              filename,
              originalName: part.filename,
              mimeType: part.contentType,
              size: part.data.length,
              url: `/uploads/chat/${filename}`,
            });
          }
          res.json(results);
        } else {
          res.status(400).json({ error: 'Use multipart/form-data' });
        }
      } catch (err) { next(err); }
    });
  } catch (err) { next(err); }
});

chatRouter.post('/channels/:id/messages-with-files', async (req: AuthRequest, res: Response, next) => {
  try {
    const schema = z.object({
      content: z.string(),
      taskId: z.string().optional(),
      replyToId: z.string().optional(),
      attachments: z.array(z.object({
        filename: z.string(),
        originalName: z.string(),
        mimeType: z.string(),
        size: z.number(),
        url: z.string(),
      })).optional(),
    });
    const data = schema.parse(req.body);
    const { id } = req.params;
    const userId = req.userId!;

    const message = await prisma.chatMessage.create({
      data: {
        content: data.content || '',
        channelId: id,
        authorId: userId,
        taskId: data.taskId || null,
        replyToId: data.replyToId || null,
        attachments: data.attachments && data.attachments.length > 0
          ? { create: data.attachments }
          : undefined,
      },
      include: MESSAGE_INCLUDE,
    });

    await prisma.chatChannel.update({ where: { id }, data: { updatedAt: new Date() } });
    res.status(201).json(message);
  } catch (err) { next(err); }
});

// ── Users ──

chatRouter.get('/users', async (req: AuthRequest, res: Response, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { isApproved: true, id: { not: req.userId } },
      select: { id: true, name: true, avatar: true, email: true, lastSeen: true },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (err) { next(err); }
});

// ── Unread Count ──

chatRouter.get('/unread-count', async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userId!;

    const generalChannel = await prisma.chatChannel.findFirst({ where: { isGeneral: true } });
    if (generalChannel) {
      await prisma.chatMember.upsert({
        where: { channelId_userId: { channelId: generalChannel.id, userId } },
        create: { channelId: generalChannel.id, userId },
        update: {},
      });
    }

    const memberships = await prisma.chatMember.findMany({
      where: { userId },
      select: { channelId: true, lastRead: true },
    });

    if (memberships.length === 0) {
      res.json({ count: 0 });
      return;
    }

    const counts = await Promise.all(
      memberships.map((m) =>
        prisma.chatMessage.count({
          where: {
            channelId: m.channelId,
            createdAt: { gt: m.lastRead },
            authorId: { not: userId },
            isDeleted: false,
          },
        })
      )
    );

    res.json({ count: counts.reduce((a, b) => a + b, 0) });
  } catch (err) { next(err); }
});

// ── Reminders ──

chatRouter.get('/reminders', async (req: AuthRequest, res: Response, next) => {
  try {
    const reminders = await prisma.chatReminder.findMany({
      where: { userId: req.userId!, triggered: false },
      include: { channel: { select: { name: true } } },
      orderBy: { triggerAt: 'asc' },
    });
    res.json(reminders);
  } catch (err) { next(err); }
});

// ── Bot Command Handler ──

async function handleBotCommand(content: string, userId: string, channelId: string): Promise<string | null> {
  const parts = content.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();

  if (cmd === '/help') {
    return [
      '🤖 **פקודות זמינות:**',
      '`/help` — הצגת עזרה',
      '`/remind <הודעה> in <מספר>m|h` — תזכורת (דקות/שעות)',
      '`/remind @משתמש <הודעה> in <מספר>m|h` — תזכורת למשתמש',
      '',
      '**Available Commands:**',
      '`/help` — Show help',
      '`/remind <message> in <number>m|h` — Reminder (minutes/hours)',
      '`/remind @user <message> in <number>m|h` — Reminder for user',
    ].join('\n');
  }

  if (cmd === '/remind') {
    const inIdx = parts.findIndex((p) => p.toLowerCase() === 'in');
    if (inIdx === -1 || inIdx >= parts.length - 1) {
      return '🤖 שימוש: `/remind <הודעה> in <מספר>m|h`\nExample: `/remind Check task in 30m`';
    }

    const timeStr = parts[inIdx + 1];
    const match = timeStr.match(/^(\d+)(m|h)$/i);
    if (!match) {
      return '🤖 פורמט זמן לא תקין. השתמשו ב: `30m` (דקות) או `2h` (שעות)';
    }

    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    const ms = unit === 'h' ? amount * 60 * 60 * 1000 : amount * 60 * 1000;
    const triggerAt = new Date(Date.now() + ms);

    let targetUserId: string | null = null;
    const msgParts = parts.slice(1, inIdx);

    if (msgParts[0]?.startsWith('@')) {
      const targetName = msgParts[0].slice(1);
      const targetUser = await prisma.user.findFirst({ where: { name: { contains: targetName } } });
      if (targetUser) {
        targetUserId = targetUser.id;
        msgParts.shift();
      }
    }

    const reminderMsg = msgParts.join(' ') || 'תזכורת';

    await prisma.chatReminder.create({
      data: {
        message: reminderMsg,
        triggerAt,
        channelId,
        userId,
        targetUserId,
      },
    });

    const timeLabel = unit === 'h' ? `${amount} שעות` : `${amount} דקות`;
    const targetLabel = targetUserId ? `ל-@${msgParts[0] || 'משתמש'}` : 'לך';
    return `🔔 תזכורת הוגדרה ${targetLabel} בעוד ${timeLabel}: "${reminderMsg}"`;
  }

  return null;
}

// ── Reminder Checker (runs in-process) ──

setInterval(async () => {
  try {
    const due = await prisma.chatReminder.findMany({
      where: { triggered: false, triggerAt: { lte: new Date() } },
      include: {
        user: { select: { name: true } },
        channel: { select: { id: true } },
      },
    });

    for (const r of due) {
      const targetId = r.targetUserId || r.userId;
      await prisma.notification.create({
        data: {
          type: 'chat_reminder',
          title: `🔔 תזכורת: ${r.message}`,
          body: `הוגדרה על ידי ${r.user.name}`,
          userId: targetId,
          linkUrl: '/chat',
        },
      });

      await prisma.chatMessage.create({
        data: {
          content: `🔔 **תזכורת:** ${r.message}`,
          channelId: r.channel.id,
          authorId: r.userId,
          type: 'bot',
        },
      });

      await prisma.chatReminder.update({ where: { id: r.id }, data: { triggered: true } });
    }
  } catch { /* silent */ }
}, 60_000);

// ── Multipart Parser ──

interface MultipartPart {
  filename: string;
  contentType: string;
  data: Buffer;
}

function parseMultipart(body: Buffer, boundary: string): MultipartPart[] {
  const parts: MultipartPart[] = [];
  const boundaryBuf = Buffer.from(`--${boundary}`);
  const str = body.toString('binary');
  const sections = str.split(boundaryBuf.toString('binary'));

  for (const section of sections) {
    if (section.trim() === '' || section.trim() === '--') continue;
    const headerEnd = section.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;

    const headers = section.slice(0, headerEnd);
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    const contentTypeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);

    if (filenameMatch) {
      const data = Buffer.from(section.slice(headerEnd + 4).replace(/\r\n$/, ''), 'binary');
      parts.push({
        filename: filenameMatch[1],
        contentType: contentTypeMatch?.[1] || 'application/octet-stream',
        data,
      });
    }
  }
  return parts;
}
