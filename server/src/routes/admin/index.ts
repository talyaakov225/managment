import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/adminAuth';
import { rateLimiter } from '../../middleware/rateLimiter';
import { adminUsersRouter } from './adminUsers';
import { adminRolesRouter } from './adminRoles';
import { adminBoardRouter } from './adminBoard';
import { adminNavRouter } from './adminNav';
import { adminPagesRouter } from './adminPages';
import { adminSettingsRouter } from './adminSettings';
import { adminAuditRouter } from './adminAudit';
import { adminDashboardRouter } from './adminDashboard';
import { adminProjectsRouter } from './adminProjects';
import { adminChatRouter } from './adminChat';

export const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.use(requireAdmin);

adminRouter.use('/dashboard', adminDashboardRouter);
adminRouter.use('/users', adminUsersRouter);
adminRouter.use('/roles', adminRolesRouter);
adminRouter.use('/board', adminBoardRouter);
adminRouter.use('/projects', adminProjectsRouter);
adminRouter.use('/navigation', adminNavRouter);
adminRouter.use('/pages', adminPagesRouter);
adminRouter.use('/settings', adminSettingsRouter);
adminRouter.use('/audit-logs', adminAuditRouter);
adminRouter.use('/chat', adminChatRouter);
