import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Shield, Kanban, Navigation, FileText,
  Settings, ClipboardList, ArrowRight, ArrowLeft, ChevronLeft,
  ChevronRight, Menu, X,
} from 'lucide-react';
import { useLang } from '../context/LangContext';
import { adminUsersApi } from '../services/adminApi';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
    isActive
      ? 'bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300'
      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
  }`;

export function AdminLayout() {
  const { t, isRTL } = useLang();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    adminUsersApi.getPendingCount().then((res) => setPendingCount(res.data.count)).catch(() => {});
  }, []);

  const BackIcon = isRTL ? ArrowLeft : ArrowRight;
  const CollapseIcon = isRTL
    ? (collapsed ? ChevronLeft : ChevronRight)
    : (collapsed ? ChevronRight : ChevronLeft);

  const links = [
    { to: '/admin', icon: LayoutDashboard, label: t.admin.dashboard, end: true, badge: 0 },
    { to: '/admin/users', icon: Users, label: t.admin.users, badge: pendingCount },
    { to: '/admin/roles', icon: Shield, label: t.admin.roles, badge: 0 },
    { to: '/admin/board', icon: Kanban, label: t.admin.boardConfig, badge: 0 },
    { to: '/admin/navigation', icon: Navigation, label: t.admin.navigation, badge: 0 },
    { to: '/admin/pages', icon: FileText, label: t.admin.pages, badge: 0 },
    { to: '/admin/settings', icon: Settings, label: t.admin.settings, badge: 0 },
    { to: '/admin/audit', icon: ClipboardList, label: t.admin.auditLog, badge: 0 },
  ];

  const sidebarContent = (
    <>
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-500" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t.admin.adminPanel}</h2>
              <p className="text-xs text-slate-400">{t.admin.management}</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={navLinkClass}
            onClick={() => setMobileOpen(false)}
          >
            <link.icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="flex-1">{link.label}</span>}
            {link.badge > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold shrink-0">
                {link.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={() => navigate('/dashboard')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all ${collapsed ? 'justify-center' : ''}`}
        >
          <BackIcon className="w-5 h-5 shrink-0" />
          {!collapsed && <span>{t.admin.backToApp}</span>}
        </button>
      </div>
    </>
  );

  const borderSide = isRTL ? 'border-l' : 'border-r';
  const collapsePosition = isRTL ? '-left-3' : '-right-3';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
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

      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 start-4 z-40 p-2 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800"
      >
        <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
            />
            <motion.aside
              initial={{ x: isRTL ? 280 : -280 }}
              animate={{ x: 0 }}
              exit={{ x: isRTL ? 280 : -280 }}
              className={`lg:hidden fixed top-0 ${isRTL ? 'right-0' : 'left-0'} bottom-0 w-[280px] bg-white dark:bg-slate-900 z-50 flex flex-col`}
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 end-4 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
