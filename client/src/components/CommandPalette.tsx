import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, FolderKanban, CheckSquare, Users, MessageCircle,
  Settings, Clock, LayoutDashboard, ArrowRight, Command,
} from 'lucide-react';
import { projectApi, taskApi, chatApi } from '../services/api';
import { useLang } from '../context/LangContext';
import { Avatar } from './Avatar';
import type { Task, Project } from '../types';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  type: 'task' | 'project' | 'user' | 'page';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  href: string;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { lang } = useLang();
  const he = lang === 'he';
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);

      projectApi.getAll().then(({ data }) => setProjects(data)).catch(() => {});
      chatApi.getUsers().then(({ data }) => setUsers(data)).catch(() => {});
      taskApi.getDashboard().then(({ data }) => setAllTasks(data.recentTasks || [])).catch(() => {});
    }
  }, [open]);

  const quickLinks: SearchResult[] = useMemo(() => [
    { id: 'nav-dashboard', type: 'page', title: he ? 'לוח בקרה' : 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, href: '/dashboard' },
    { id: 'nav-history', type: 'page', title: he ? 'היסטוריה' : 'History', icon: <Clock className="w-4 h-4" />, href: '/history' },
    { id: 'nav-chat', type: 'page', title: he ? 'צ׳אט' : 'Chat', icon: <MessageCircle className="w-4 h-4" />, href: '/chat' },
    { id: 'nav-settings', type: 'page', title: he ? 'הגדרות' : 'Settings', icon: <Settings className="w-4 h-4" />, href: '/settings' },
  ], [he]);

  useEffect(() => {
    if (!query.trim()) {
      const projectResults: SearchResult[] = projects.slice(0, 5).map((p) => ({
        id: `p-${p.id}`, type: 'project', title: p.name,
        subtitle: `${p._count?.tasks || 0} ${he ? 'משימות' : 'tasks'}`,
        icon: <FolderKanban className="w-4 h-4 text-primary-500" />, href: `/projects/${p.id}`,
      }));
      setResults([...quickLinks, ...projectResults]);
      return;
    }

    const q = query.toLowerCase();
    const matched: SearchResult[] = [];

    quickLinks.forEach((l) => {
      if (l.title.toLowerCase().includes(q)) matched.push(l);
    });

    projects.forEach((p) => {
      if (p.name.toLowerCase().includes(q))
        matched.push({ id: `p-${p.id}`, type: 'project', title: p.name, subtitle: `${p._count?.tasks || 0} ${he ? 'משימות' : 'tasks'}`, icon: <FolderKanban className="w-4 h-4 text-primary-500" />, href: `/projects/${p.id}` });
    });

    allTasks.forEach((t) => {
      if (t.title.toLowerCase().includes(q))
        matched.push({ id: `t-${t.id}`, type: 'task', title: t.title, subtitle: t.project?.name, icon: <CheckSquare className="w-4 h-4 text-emerald-500" />, href: `/projects/${t.projectId}` });
    });

    users.forEach((u) => {
      if (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
        matched.push({ id: `u-${u.id}`, type: 'user', title: u.name, subtitle: u.email, icon: <Avatar name={u.name} size="xs" />, href: '/chat' });
    });

    setResults(matched.slice(0, 12));
    setSelectedIdx(0);
  }, [query, projects, allTasks, users, quickLinks, he]);

  function handleSelect(result: SearchResult) {
    onClose();
    navigate(result.href);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      handleSelect(results[selectedIdx]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  const typeLabels: Record<string, string> = {
    task: he ? 'משימה' : 'Task',
    project: he ? 'פרויקט' : 'Project',
    user: he ? 'משתמש' : 'User',
    page: he ? 'עמוד' : 'Page',
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-start justify-center pt-[15vh] px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={he ? 'חיפוש משימות, פרויקטים, אנשים...' : 'Search tasks, projects, people...'}
                className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-400 border border-slate-200 dark:border-slate-700">
                ESC
              </kbd>
            </div>

            <div className="max-h-[320px] overflow-y-auto py-2">
              {results.length === 0 && query && (
                <p className="text-sm text-slate-400 text-center py-8">
                  {he ? 'לא נמצאו תוצאות' : 'No results found'}
                </p>
              )}
              {results.map((result, idx) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIdx(idx)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-start transition-colors ${
                    idx === selectedIdx ? 'bg-primary-50 dark:bg-primary-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    {result.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{result.title}</p>
                    {result.subtitle && <p className="text-xs text-slate-400 truncate">{result.subtitle}</p>}
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-medium shrink-0">
                    {typeLabels[result.type]}
                  </span>
                  {idx === selectedIdx && <ArrowRight className="w-3.5 h-3.5 text-primary-500 shrink-0" />}
                </button>
              ))}
            </div>

            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">↑↓</kbd> {he ? 'ניווט' : 'Navigate'}</span>
              <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">↵</kbd> {he ? 'פתח' : 'Open'}</span>
              <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">esc</kbd> {he ? 'סגור' : 'Close'}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
