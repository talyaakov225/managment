import express from 'express';
import cors from 'cors';
import path from 'path';
import { authRouter } from './routes/auth';
import { projectRouter } from './routes/projects';
import { taskRouter } from './routes/tasks';
import { memberRouter } from './routes/members';
import { commentRouter } from './routes/comments';
import { projectTaskRouter } from './routes/projectTasks';
import { boardPublicRouter } from './routes/boardPublic';
import { navPublicRouter } from './routes/navPublic';
import { adminRouter } from './routes/admin/index';
import { chatRouter } from './routes/chat';
import { notificationRouter } from './routes/notifications';
import { subtaskRouter } from './routes/subtasks';
import { favoriteRouter } from './routes/favorites';
import { taskActivityRouter } from './routes/taskActivity';
import { stickyNoteRouter } from './routes/stickyNotes';
import { reminderRouter } from './routes/reminders';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimiter(500, 60_000));

app.use('/api/auth', authRouter);
app.use('/api/projects', projectRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/projects', memberRouter);
app.use('/api/tasks', commentRouter);
app.use('/api/projects', projectTaskRouter);
app.use('/api/board', boardPublicRouter);
app.use('/api/navigation', navPublicRouter);
app.use('/api/admin', adminRouter);
app.use('/api/chat', chatRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/tasks', subtaskRouter);
app.use('/api/tasks', taskActivityRouter);
app.use('/api/favorites', favoriteRouter);
app.use('/api/sticky-notes', stickyNoteRouter);
app.use('/api/reminders', reminderRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
