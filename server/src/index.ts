import http from 'http';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { initSocket } from './lib/socket';
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
import { tagRouter } from './routes/tags';
import { templateRouter } from './routes/templates';
import { timeTrackingRouter } from './routes/timeTracking';
import { dependencyRouter } from './routes/dependencies';
import { teamRouter } from './routes/teams';
import { publicApiRouter } from './routes/publicApi';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const corsOptions = {
  origin: CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('/{*path}', cors(corsOptions));

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

app.use('/api/auth/login', rateLimiter(10, 60_000));
app.use('/api/auth/register', rateLimiter(5, 60_000));
app.use('/api/auth/refresh', rateLimiter(20, 60_000));
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
app.use('/api/tags', tagRouter);
app.use('/api/templates', templateRouter);
app.use('/api/tasks', timeTrackingRouter);
app.use('/api/tasks', dependencyRouter);
app.use('/api/teams', teamRouter);
app.use('/api/v1', publicApiRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

const server = http.createServer(app);
initSocket(server, CLIENT_URL);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
