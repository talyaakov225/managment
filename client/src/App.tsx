import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { AdminLayout } from './components/AdminLayout';
import { AdminRoute } from './components/AdminRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectBoardPage } from './pages/ProjectBoardPage';
import { TeamPage } from './pages/TeamPage';
import { SettingsPage } from './pages/SettingsPage';
import { CustomPageView } from './pages/CustomPageView';
import { TasksPage } from './pages/TasksPage';
import { HistoryPage } from './pages/HistoryPage';
import { ChatPage } from './pages/ChatPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminRoles } from './pages/admin/AdminRoles';
import { AdminBoard } from './pages/admin/AdminBoard';
import { AdminProjects } from './pages/admin/AdminProjects';
import { AdminNav } from './pages/admin/AdminNav';
import { AdminPages } from './pages/admin/AdminPages';
import { PageBlockEditor } from './pages/admin/PageBlockEditor';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminAudit } from './pages/admin/AdminAudit';
import { AdminChat } from './pages/admin/AdminChat';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';
import { AdminLoginLog } from './pages/admin/AdminLoginLog';
import { AdminTeams } from './pages/admin/AdminTeams';
import { AdminBackup } from './pages/admin/AdminBackup';
import { AdminNotifications } from './pages/admin/AdminNotifications';
import { AdminStorage } from './pages/admin/AdminStorage';
import { CalendarPage } from './pages/CalendarPage';
import { ProfilePage } from './pages/ProfilePage';
import { TemplatesPage } from './pages/TemplatesPage';
import { GanttPage } from './pages/GanttPage';
import { TeamBoardPage } from './pages/TeamBoardPage';
import { LoadingScreen } from './components/LoadingScreen';
import { NotFoundPage } from './pages/NotFoundPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="projects/:id" element={<ProjectBoardPage />} />
        <Route path="projects/:id/team" element={<TeamPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="gantt" element={<GanttPage />} />
        <Route path="team-board" element={<TeamBoardPage />} />
        <Route path="pages/:slug" element={<CustomPageView />} />
      </Route>
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="roles" element={<AdminRoles />} />
        <Route path="projects" element={<AdminProjects />} />
        <Route path="board" element={<AdminBoard />} />
        <Route path="navigation" element={<AdminNav />} />
        <Route path="pages" element={<AdminPages />} />
        <Route path="pages/:id/edit" element={<PageBlockEditor />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="audit" element={<AdminAudit />} />
        <Route path="chat" element={<AdminChat />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="login-log" element={<AdminLoginLog />} />
        <Route path="teams" element={<AdminTeams />} />
        <Route path="backup" element={<AdminBackup />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="storage" element={<AdminStorage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
