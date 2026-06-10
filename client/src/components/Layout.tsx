import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FolderKanban, Settings, LogOut, Plus,
  ChevronLeft, ChevronRight, Moon, Sun, Menu, Languages,
  Shield, FileText, Clock, MessageCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LangContext';
import { useNotification } from '../context/NotificationContext';
import { projectApi } from '../services/api';
import { navPublicApi } from '../services/adminApi';
import { Avatar } from './Avatar';
import { Modal } from './Modal';
import type { Project } from '../types';
import type { NavItem } from '../types/admin';
import toast from 'react-hot-toast';

export function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang, isRTL } = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const isAdmin = user?.globalRole === 'ADMIN' || user?.globalRole === 'SUPER_ADMIN';
  const { unreadCount } = useNotification();

  useEffect(() => {
    loadProjects();
    navPublicApi.getAll().then((res) => setNavItems(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  async function loadProjects() {
    try {
      const { data } = await projectApi.getAll();
      setProjects(data);
    } catch {
      // silent
    }
  }

  async function handleCreateProject() {
    if (!newProjectName.trim()) return;
    setCreating(true);
    try {
      const { data } = await projectApi.create({
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || undefined,
      });
      setProjects((prev) => [data, ...prev]);
      setShowNewProject(false);
      setNewProjectName('');
      setNewProjectDesc('');
      toast.success(t.project.projectCreated);
      navigate(`/projects/${data.id}`);
    } catch {
      toast.error(t.project.projectFailed);
    } finally {
      setCreating(false);
    }
  }

  const CollapseIcon = isRTL
    ? (collapsed ? ChevronLeft : ChevronRight)
    : (collapsed ? ChevronRight : ChevronLeft);

  const sidebarContent = (
    <>
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-200 dark:border-slate-800 ${collapsed ? 'justify-center' : ''}`}>
        <img src="/assets/לוגו תקשורת חדש.svg" alt="Logo" className="w-9 h-9 shrink-0 object-contain" />
        {!collapsed && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
            רמי לוי תקשורת
          </motion.span>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
            ${isActive
              ? 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}
            ${collapsed ? 'justify-center' : ''}`
          }
        >
          <LayoutDashboard className="w-5 h-5 shrink-0" />
          {!collapsed && <span>{t.nav.dashboard}</span>}
        </NavLink>

        <NavLink
          to="/history"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
            ${isActive
              ? 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}
            ${collapsed ? 'justify-center' : ''}`
          }
        >
          <Clock className="w-5 h-5 shrink-0" />
          {!collapsed && <span>{t.nav.history}</span>}
        </NavLink>

        <NavLink
          to="/chat"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
            ${isActive
              ? 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}
            ${collapsed ? 'justify-center' : ''}`
          }
        >
          <div className="relative">
            <MessageCircle className="w-5 h-5 shrink-0" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -end-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </div>
          {!collapsed && <span>{t.nav.chat}</span>}
        </NavLink>

        <div className={`pt-4 pb-2 ${collapsed ? 'px-2' : 'px-3'}`}>
          {!collapsed && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t.nav.projects}</span>
              <button
                onClick={() => setShowNewProject(true)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
          {collapsed && (
            <button
              onClick={() => setShowNewProject(true)}
              className="w-full p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-600 transition-colors flex justify-center"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {projects.map((project) => (
          <NavLink
            key={project.id}
            to={`/projects/${project.id}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
              ${isActive
                ? 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}
              ${collapsed ? 'justify-center' : ''}`
            }
          >
            <FolderKanban className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="truncate">{project.name}</span>}
          </NavLink>
        ))}

        {navItems.length > 0 && (
          <>
            {!collapsed && (
              <div className="pt-4 pb-2 px-3">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t.nav.pages}</span>
              </div>
            )}
            {navItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}
                  ${collapsed ? 'justify-center' : ''}`
                }
              >
                <FileText className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="truncate">{lang === 'he' ? item.label_he : item.label_en}</span>}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-1">
        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all border
              ${isActive
                ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20'
                : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-950/50'}
              ${collapsed ? 'justify-center' : ''}`
            }
          >
            <Shield className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{t.nav.adminPanel}</span>}
          </NavLink>
        )}

        <button
          onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all ${collapsed ? 'justify-center' : ''}`}
        >
          <Languages className="w-5 h-5 shrink-0" />
          {!collapsed && <span>{lang === 'he' ? 'English' : 'עברית'}</span>}
        </button>

        <button onClick={toggleTheme} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all ${collapsed ? 'justify-center' : ''}`}>
          {theme === 'light' ? <Moon className="w-5 h-5 shrink-0" /> : <Sun className="w-5 h-5 shrink-0" />}
          {!collapsed && <span>{theme === 'light' ? t.nav.darkMode : t.nav.lightMode}</span>}
        </button>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
            ${isActive
              ? 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}
            ${collapsed ? 'justify-center' : ''}`
          }
        >
          <Settings className="w-5 h-5 shrink-0" />
          {!collapsed && <span>{t.nav.settings}</span>}
        </NavLink>

        <button
          onClick={() => { logout(); navigate('/login'); }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>{t.nav.logout}</span>}
        </button>

        {!collapsed && user && (
          <div className="flex items-center gap-3 px-3 py-3 mt-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <Avatar name={user.name} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );

  const borderSide = isRTL ? 'border-l' : 'border-r';
  const sidePosition = isRTL ? 'right-0' : 'left-0';
  const collapsePosition = isRTL ? '-left-3' : '-right-3';
  const mobileSlideFrom = isRTL ? 280 : -280;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 272 }}
        transition={{ duration: 0.2 }}
        className={`hidden lg:flex flex-col bg-white dark:bg-slate-900 ${borderSide} border-slate-200 dark:border-slate-800 relative shrink-0`}
      >
        {sidebarContent}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`absolute ${collapsePosition} top-7 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors z-10`}
        >
          <CollapseIcon className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </motion.aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: mobileSlideFrom }}
              animate={{ x: 0 }}
              exit={{ x: mobileSlideFrom }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`fixed ${sidePosition} top-0 bottom-0 w-[272px] bg-white dark:bg-slate-900 ${borderSide} border-slate-200 dark:border-slate-800 z-50 flex flex-col lg:hidden`}
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <button onClick={() => setMobileOpen(true)} className="btn-ghost p-2">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/assets/לוגו תקשורת חדש.svg" alt="Logo" className="w-7 h-7 object-contain" />
            <span className="font-bold text-primary-600">רמי לוי תקשורת</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet context={{ projects, loadProjects }} />
        </main>
      </div>

      {/* New Project Modal */}
      <Modal isOpen={showNewProject} onClose={() => setShowNewProject(false)} title={t.project.newProject} size="sm">
        <form
          onSubmit={(e) => { e.preventDefault(); handleCreateProject(); }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.project.projectName}</label>
            <input
              type="text"
              className="input"
              placeholder={t.project.enterProjectName}
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.project.descriptionOptional}</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder={t.project.whatIsProject}
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowNewProject(false)} className="btn-secondary flex-1">
              {t.common.cancel}
            </button>
            <button type="submit" disabled={!newProjectName.trim() || creating} className="btn-primary flex-1">
              {creating ? t.common.creating : t.project.createProject}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
