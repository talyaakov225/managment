import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, FolderKanban, CheckSquare, MessageCircle,
  Settings, Clock, LayoutDashboard, ArrowRight, Loader2,
} from 'lucide-react';
import { projectApi, taskApi, chatApi, commentApi } from '../services/api';
import { useLang } from '../context/LangContext';
import { Avatar } from './Avatar';
import type { Task, Project, Comment } from '../types';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  type: 'task' | 'project' | 'user' | 'page' | 'comment';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  href: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(td|th|li|p|div|h[1-6])>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchAllTasks(): Promise<Task[]> {
  const all: Task[] = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const { data } = await taskApi.getHistory({ page, tab: 'active' });
    all.push(...data.tasks);
    totalPages = data.totalPages;
    page++;
  }
  return all;
}

const SECTION_ORDER: SearchResult['type'][] = ['page', 'task', 'project', 'user', 'comment'];

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
  const [commentIndex, setCommentIndex] = useState<(Comment & { task: Task })[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSelectedIdx(0);
    setCommentIndex([]);
    setCommentsLoaded(false);
    setTimeout(() => inputRef.current?.focus(), 50);

    setLoading(true);
    Promise.all([
      projectApi.getAll().then(({ data }) => setProjects(data)).catch(() => {}),
      chatApi.getUsers().then(({ data }) => setUsers(data)).catch(() => {}),
      fetchAllTasks().then(setAllTasks).catch(() => setAllTasks([])),
    ]).finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open || !query.trim() || commentsLoaded || !allTasks.length) return;
    const tasksWithComments = allTasks.filter((t) => t._count?.comments);
    if (!tasksWithComments.length) {
      setCommentsLoaded(true);
      return;
    }
    Promise.all(
      tasksWithComments.slice(0, 80).map(async (t) => {
        try {
          const { data } = await commentApi.getByTask(t.id);
          return data.map((c) => ({ ...c, task: t }));
        } catch {
          return [];
        }
      }),
    )
      .then((groups) => setCommentIndex(groups.flat()))
      .finally(() => setCommentsLoaded(true));
  }, [open, query, allTasks, commentsLoaded]);

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
      setSelectedIdx(0);
      return;
    }

    const q = query.toLowerCase();
    const matched: SearchResult[] = [];
    const seen = new Set<string>();

    quickLinks.forEach((l) => {
      if (l.title.toLowerCase().includes(q)) matched.push(l);
    });

    allTasks.forEach((t) => {
      const titleMatch = t.title.toLowerCase().includes(q);
      const descMatch = t.description && stripHtml(t.description).toLowerCase().includes(q);
      if (!titleMatch && !descMatch) return;
      const key = `t-${t.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      matched.push({
        id: key, type: 'task', title: t.title,
        subtitle: descMatch && !titleMatch
          ? `${he ? 'תיאור' : 'Description'} · ${t.project?.name || ''}`
          : t.project?.name,
        icon: <CheckSquare className="w-4 h-4 text-emerald-500" />,
        href: `/projects/${t.projectId}`,
      });
    });

    projects.forEach((p) => {
      if (!p.name.toLowerCase().includes(q)) return;
      matched.push({
        id: `p-${p.id}`, type: 'project', title: p.name,
        subtitle: `${p._count?.tasks || 0} ${he ? 'משימות' : 'tasks'}`,
        icon: <FolderKanban className="w-4 h-4 text-primary-500" />, href: `/projects/${p.id}`,
      });
    });

    users.forEach((u) => {
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return;
      matched.push({
        id: `u-${u.id}`, type: 'user', title: u.name, subtitle: u.email,
        icon: <Avatar name={u.name} size="xs" />, href: '/chat',
      });
    });

    commentIndex.forEach((c) => {
      if (!stripHtml(c.content).toLowerCase().includes(q)) return;
      const plain = stripHtml(c.content);
      matched.push({
        id: `c-${c.id}`, type: 'comment',
        title: plain.length > 70 ? `${plain.slice(0, 70)}…` : plain,
        subtitle: `${c.task.title} · ${c.author.name}`,
        icon: <MessageCircle className="w-4 h-4 text-blue-500" />,
        href: `/projects/${c.task.projectId}`,
      });
    });

    setResults(matched.slice(0, 24));
    setSelectedIdx(0);
  }, [query, projects, allTasks, users, commentIndex, quickLinks, he]);

  const grouped = useMemo(() => {
    const groups: { type: SearchResult['type']; items: SearchResult[] }[] = [];
    for (const type of SECTION_ORDER) {
      const items = results.filter((r) => r.type === type);
      if (items.length) groups.push({ type, items });
    }
    return groups;
  }, [results]);

  const flatResults = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  const resultIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    flatResults.forEach((r, i) => map.set(r.id, i));
    return map;
  }, [flatResults]);

  const sectionLabels: Record<SearchResult['type'], string> = {
    page: he ? 'עמודים' : 'Pages',
    task: he ? 'משימות' : 'Tasks',
    project: he ? 'פרויקטים' : 'Projects',
    user: he ? 'משתמשים' : 'Users',
    comment: he ? 'תגובות' : 'Comments',
  };

  function handleSelect(result: SearchResult) {
    onClose();
    navigate(result.href);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && flatResults[selectedIdx]) {
      handleSelect(flatResults[selectedIdx]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

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
                placeholder={he ? 'חיפוש משימות, פרויקטים, אנשים, תגובות...' : 'Search tasks, projects, people, comments...'}
                className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              {loading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin shrink-0" />}
              <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-400 border border-slate-200 dark:border-slate-700">
                ESC
              </kbd>
            </div>

            <div className="max-h-[360px] overflow-y-auto py-2">
              {flatResults.length === 0 && query && !loading && (
                <p className="text-sm text-slate-400 text-center py-8">
                  {he ? 'לא נמצאו תוצאות' : 'No results found'}
                </p>
              )}
              {grouped.map(({ type, items }) => (
                <div key={type}>
                  <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {sectionLabels[type]}
                  </p>
                  {items.map((result) => {
                    const idx = resultIndexMap.get(result.id) ?? 0;
                    return (
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
                        {idx === selectedIdx && <ArrowRight className="w-3.5 h-3.5 text-primary-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
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
