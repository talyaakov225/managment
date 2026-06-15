import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FolderKanban, Settings, LogOut, Plus,
  ChevronLeft, ChevronRight, Moon, Sun, Menu, Languages,
  Shield, FileText, Clock, MessageCircle, Star, ListTodo,
  Bell, Search, Check, CheckCheck, ExternalLink, StickyNote, AlarmClock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LangContext';
import { useNotification } from '../context/NotificationContext';
import { projectApi, chatApi, taskApi, favoriteApi, reminderApi, type Favorite, type ReminderItem } from '../services/api';
import { navPublicApi } from '../services/adminApi';
import { Avatar } from './Avatar';
import { Modal } from './Modal';
import { CommandPalette } from './CommandPalette';
import { StickyNotes } from './StickyNotes';
import { ReminderPanel } from './ReminderPanel';
import { ReminderPopup } from './ReminderPopup';
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

  const isAdmin = user?.globalRole === 'SUPER_ADMIN';
  const { unreadCount, notifications, markAllRead, markOneRead } = useNotification();
  const [chatUnread, setChatUnread] = useState(0);
  const chatPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickProject, setQuickProject] = useState('');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickCreating, setQuickCreating] = useState(false);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const notifPanelRef = useRef<HTMLDivElement>(null);
  const [showStickyNotes, setShowStickyNotes] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [dueReminders, setDueReminders] = useState<ReminderItem[]>([]);
  const reminderPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadProjects();
    loadFavorites();
    navPublicApi.getAll().then((res) => setNavItems(res.data)).catch(() => {});

    async function checkDueReminders() {
      try {
        const { data } = await reminderApi.getDue();
        if (data.length > 0) {
          setDueReminders((prev) => [...prev, ...data]);
          for (const r of data) {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(r.title, { body: r.content || '', icon: '/assets/favicon.ico' });
            }
          }
        }
      } catch { /* silent */ }
    }
    checkDueReminders();
    reminderPollRef.current = setInterval(checkDueReminders, 15000);
    return () => { if (reminderPollRef.current) clearInterval(reminderPollRef.current); };
  }, []);

  async function loadFavorites() {
    try {
      const { data } = await favoriteApi.getAll();
      setFavorites(data);
    } catch { /* silent */ }
  }

  async function toggleFavorite(projectId: string) {
    try {
      const { data } = await favoriteApi.toggle(projectId);
      if (data.favorited) {
        toast.success(t.favorites.add);
      } else {
        toast.success(t.favorites.remove);
      }
      loadFavorites();
    } catch { /* silent */ }
  }

  const favProjectIds = new Set(favorites.map((f) => f.projectId));

  useEffect(() => {
    if (!user) return;
    chatApi.heartbeat().catch(() => {});
    const hb = setInterval(() => { chatApi.heartbeat().catch(() => {}); }, 30_000);
    return () => clearInterval(hb);
  }, [user]);

  const prevChatUnreadRef = useRef(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const fetchChatUnread = () => {
      chatApi.getUnreadCount().then(({ data }) => {
        if (!active) return;
        const newCount = data.count ?? 0;
        if (newCount > prevChatUnreadRef.current && location.pathname !== '/chat') {
          try {
            if (Notification.permission === 'granted') {
              new Notification(lang === 'he' ? 'הודעה חדשה בצ\'אט' : 'New chat message', {
                body: lang === 'he' ? `יש לך ${newCount} הודעות שלא נקראו` : `You have ${newCount} unread messages`,
                icon: '/assets/לוגו תקשורת חדש.svg',
              });
            }
          } catch { /* notifications not supported */ }
        }
        prevChatUnreadRef.current = newCount;
        setChatUnread(newCount);
      }).catch(() => {});
    };
    fetchChatUnread();
    chatPollRef.current = setInterval(fetchChatUnread, 3000);
    return () => { active = false; if (chatPollRef.current) clearInterval(chatPollRef.current); };
  }, [user, location.pathname, lang]);

  useEffect(() => {
    setMobileOpen(false);
    if (location.pathname === '/chat') {
      setChatUnread(0);
      prevChatUnreadRef.current = 0;
    }
  }, [location.pathname]);

  useEffect(() => {
    document.title = chatUnread > 0 ? `(${chatUnread}) TaskFlow` : 'TaskFlow';
  }, [chatUnread]);

  async function loadProjects() {
    try {
      const { data } = await projectApi.getAll();
      setProjects(data);
    } catch {
      // silent
    }
  }

  useLiveRefresh(async () => {
    try {
      const [projRes, favRes] = await Promise.all([
        projectApi.getAll(),
        favoriteApi.getAll(),
      ]);
      setProjects(projRes.data);
      setFavorites(favRes.data);
    } catch { /* silent */ }
  }, 10000);

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

  async function handleQuickCreate() {
    if (!quickTitle.trim() || !quickProject) return;
    setQuickCreating(true);
    try {
      const { data: newTask } = await taskApi.create(quickProject, { title: quickTitle.trim(), status: 'TODO' });
      toast.success(t.task.taskCreated);
      setShowQuickAdd(false);
      setQuickTitle('');
      setQuickProject('');
      navigate(`/projects/${quickProject}`, { state: { openTaskId: newTask.id } });
    } catch {
      toast.error(t.task.createFailed);
    } finally {
      setQuickCreating(false);
    }
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdPaletteOpen((p) => !p);
        return;
      }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowQuickAdd(true);
      }
      if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts((p) => !p);
      }
      if (e.key === 'Escape') {
        setShowQuickAdd(false);
        setShowShortcuts(false);
        setCmdPaletteOpen(false);
        setShowNotifPanel(false);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifPanelRef.current && !notifPanelRef.current.contains(e.target as Node)) {
        setShowNotifPanel(false);
      }
    }
    if (showNotifPanel) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifPanel]);

  const CollapseIcon = isRTL
    ? (collapsed ? ChevronLeft : ChevronRight)
    : (collapsed ? ChevronRight : ChevronLeft);

  const sidebarContent = (
    <>
      <div className={`flex items-center px-4 py-4 border-b border-slate-200 dark:border-slate-800 ${collapsed ? 'justify-center' : 'justify-center'}`}>
        <img src="/assets/לוגו תקשורת חדש.svg" alt="Logo" className={`shrink-0 object-contain ${collapsed ? 'w-10 h-10' : 'w-36 h-12'}`} />
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
          to="/tasks"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
            ${isActive
              ? 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}
            ${collapsed ? 'justify-center' : ''}`
          }
        >
          <ListTodo className="w-5 h-5 shrink-0" />
          {!collapsed && <span>{t.nav.tasks}</span>}
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
            {chatUnread > 0 && (
              <span className="absolute -top-1.5 -end-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold animate-pulse">
                {chatUnread > 99 ? '99+' : chatUnread}
              </span>
            )}
          </div>
          {!collapsed && (
            <span className="flex-1">{t.nav.chat}</span>
          )}
          {!collapsed && chatUnread > 0 && (
            <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500 text-white text-[11px] flex items-center justify-center font-bold">
              {chatUnread > 99 ? '99+' : chatUnread}
            </span>
          )}
        </NavLink>

        <button
          onClick={() => { setShowStickyNotes((p) => !p); setShowReminders(false); }}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 w-full
            ${showStickyNotes
              ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}
            ${collapsed ? 'justify-center' : ''}`}
        >
          <StickyNote className="w-5 h-5 shrink-0" />
          {!collapsed && <span>{lang === 'he' ? 'פתקים' : 'Notes'}</span>}
        </button>

        <button
          onClick={() => { setShowReminders((p) => !p); setShowStickyNotes(false); }}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 w-full
            ${showReminders
              ? 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}
            ${collapsed ? 'justify-center' : ''}`}
        >
          <AlarmClock className="w-5 h-5 shrink-0" />
          {!collapsed && <span>{lang === 'he' ? 'תזכורות' : 'Reminders'}</span>}
          {!collapsed && dueReminders.length > 0 && (
            <span className="ms-auto min-w-[20px] h-[20px] px-1 rounded-full bg-violet-500 text-white text-[10px] flex items-center justify-center font-bold">
              {dueReminders.length}
            </span>
          )}
        </button>

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

        {/* Favorites */}
        {!collapsed && favorites.length > 0 && (
          <>
            <div className="pt-2 pb-1 px-3">
              <span className="text-xs font-semibold text-amber-500 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" /> {t.favorites.title}
              </span>
            </div>
            {favorites.map((fav) => fav.project && (
              <NavLink
                key={fav.id}
                to={`/projects/${fav.project.id}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`
                }
              >
                <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                <span className="truncate">{fav.project.name}</span>
              </NavLink>
            ))}
          </>
        )}

        {projects.map((project) => (
          <NavLink
            key={project.id}
            to={`/projects/${project.id}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group/proj
              ${isActive
                ? 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}
              ${collapsed ? 'justify-center' : ''}`
            }
          >
            <FolderKanban className="w-5 h-5 shrink-0" />
            {!collapsed && (
              <>
                <span className="truncate flex-1">{project.name}</span>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(project.id); }}
                  className={`p-0.5 rounded transition-all ${
                    favProjectIds.has(project.id)
                      ? 'text-amber-400'
                      : 'text-transparent group-hover/proj:text-slate-300 dark:group-hover/proj:text-slate-600 hover:!text-amber-400'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${favProjectIds.has(project.id) ? 'fill-current' : ''}`} />
                </button>
              </>
            )}
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
        <header className="flex items-center gap-3 px-4 py-2.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 z-20">
          <button onClick={() => setMobileOpen(true)} className="btn-ghost p-2 lg:hidden">
            <Menu className="w-5 h-5" />
          </button>
          <img src="/assets/לוגו תקשורת חדש.svg" alt="Logo" className="h-8 object-contain lg:hidden" />

          <button
            onClick={() => setCmdPaletteOpen(true)}
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm text-slate-500 transition-colors w-full max-w-xl"
          >
            <Search className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-start">{lang === 'he' ? 'חיפוש...' : 'Search...'}</span>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400">Ctrl+K</kbd>
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCmdPaletteOpen(true)}
              className="lg:hidden btn-ghost p-2"
            >
              <Search className="w-5 h-5" />
            </button>

            <div className="relative" ref={notifPanelRef}>
              <button
                onClick={() => setShowNotifPanel((p) => !p)}
                className="btn-ghost p-2 relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 animate-bounce">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifPanel && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute end-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                        {lang === 'he' ? 'התראות' : 'Notifications'}
                      </h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => { markAllRead(); }}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          {lang === 'he' ? 'סמן הכל כנקרא' : 'Mark all read'}
                        </button>
                      )}
                    </div>
                    <div className="max-h-[320px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-10 text-center">
                          <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                          <p className="text-sm text-slate-400">{lang === 'he' ? 'אין התראות' : 'No notifications'}</p>
                        </div>
                      ) : (
                        notifications.slice(0, 15).map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              if (n.linkUrl) {
                                navigate(n.linkUrl);
                                setShowNotifPanel(false);
                              }
                            }}
                            className={`px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors ${
                              n.linkUrl ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''
                            } ${!n.read ? 'bg-primary-50/50 dark:bg-primary-950/20' : ''}`}
                          >
                            <div className="flex items-start gap-2">
                              {!n.read && <div className="w-2 h-2 rounded-full bg-primary-500 mt-1.5 shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{n.title}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{n.body}</p>
                                <p className="text-[10px] text-slate-400 mt-1">
                                  {new Date(n.createdAt).toLocaleString(lang === 'he' ? 'he-IL' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {!n.read && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); markOneRead(n.id); }}
                                    className="p-1 rounded-md hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                                    title={lang === 'he' ? 'סמן כנקרא' : 'Mark as read'}
                                  >
                                    <Check className="w-3.5 h-3.5 text-primary-500" />
                                  </button>
                                )}
                                {n.linkUrl && <ExternalLink className="w-3.5 h-3.5 text-slate-300 mt-0.5" />}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {user && (
              <div className="hidden lg:flex items-center gap-2 px-2 py-1 rounded-lg">
                <Avatar name={user.name} avatar={user.avatar} size="sm" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 max-w-[120px] truncate">{user.name}</span>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="h-full"
            >
              <Outlet context={{ projects, loadProjects }} />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* FAB + Quick Menu */}
      <div className="fixed bottom-6 end-6 z-40">
        <button
          onClick={() => setShowFabMenu((p) => !p)}
          className={`w-14 h-14 rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-500/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${showFabMenu ? 'rotate-45' : ''}`}
        >
          <Plus className="w-6 h-6 transition-transform" />
        </button>

        <AnimatePresence>
          {showFabMenu && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[-1]"
                onClick={() => setShowFabMenu(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.9 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="absolute bottom-16 end-0 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden py-1.5"
              >
                {[
                  {
                    icon: Plus, label: lang === 'he' ? 'משימה חדשה' : 'New Task',
                    color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30',
                    action: () => { setShowQuickAdd(true); setShowFabMenu(false); },
                  },
                  {
                    icon: StickyNote, label: lang === 'he' ? 'פתקים' : 'Sticky Notes',
                    color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30',
                    action: () => { setShowStickyNotes((p) => !p); setShowReminders(false); setShowFabMenu(false); },
                  },
                  {
                    icon: AlarmClock, label: lang === 'he' ? 'תזכורות' : 'Reminders',
                    color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/30',
                    action: () => { setShowReminders((p) => !p); setShowStickyNotes(false); setShowFabMenu(false); },
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center`}>
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky Notes */}
      <StickyNotes open={showStickyNotes} onClose={() => setShowStickyNotes(false)} />

      {/* Reminder Panel */}
      <ReminderPanel open={showReminders} onClose={() => setShowReminders(false)} />

      {/* Reminder Popups */}
      <ReminderPopup
        reminders={dueReminders}
        onDismiss={async (id) => {
          try { await reminderApi.dismiss(id); } catch { /* silent */ }
          setDueReminders((prev) => prev.filter((r) => r.id !== id));
        }}
      />

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

      {/* Quick Add Task Modal */}
      <Modal isOpen={showQuickAdd} onClose={() => setShowQuickAdd(false)} title={t.quickAdd.title} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); handleQuickCreate(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.quickAdd.selectProject}</label>
            <select
              value={quickProject}
              onChange={(e) => setQuickProject(e.target.value)}
              className="input"
            >
              <option value="">{t.quickAdd.selectProject}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.task.taskTitle}</label>
            <input
              type="text"
              className="input"
              placeholder={t.task.whatToDo}
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowQuickAdd(false)} className="btn-secondary flex-1">{t.common.cancel}</button>
            <button type="submit" disabled={!quickTitle.trim() || !quickProject || quickCreating} className="btn-primary flex-1">
              {quickCreating ? t.common.creating : t.task.createTask}
            </button>
          </div>
        </form>
      </Modal>

      {/* Keyboard Shortcuts Modal */}
      <Modal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} title={t.shortcuts.title} size="sm">
        <div className="space-y-3">
          {([
            ['Ctrl+K', lang === 'he' ? 'חיפוש גלובלי' : 'Global Search'],
            ['N', t.shortcuts.newTask],
            ['/', t.shortcuts.search],
            ['?', t.shortcuts.help],
            ['Esc', t.shortcuts.close],
            ['V', t.shortcuts.toggleView],
          ] as const).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
              <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </Modal>

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette open={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} />
    </div>
  );
}
