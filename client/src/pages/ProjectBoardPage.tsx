import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useOutletContext, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  DndContext, DragOverlay, closestCorners,
  PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core';
import {
  Users, Loader2, MoreHorizontal, Search, LayoutGrid, Table2,
  CheckCircle2, AlertTriangle, UserX, ListTodo, X, ChevronDown,
  Download, CheckSquare,
} from 'lucide-react';
import { projectApi, taskApi, memberApi } from '../services/api';
import { useLang } from '../context/LangContext';
import { KanbanColumn } from '../components/KanbanColumn';
import { TaskCard } from '../components/TaskCard';
import { TaskDetailPanel } from '../components/TaskDetailPanel';
import { TaskTableView } from '../components/TaskTableView';
import { Modal } from '../components/Modal';
import { Avatar } from '../components/Avatar';
import { SkeletonKanban } from '../components/Skeleton';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import type { Project, Task, TaskStatus, TaskPriority } from '../types';
import { STATUSES } from '../types';
import toast from 'react-hot-toast';

type ViewMode = 'kanban' | 'table';

export function ProjectBoardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { loadProjects } = useOutletContext<{ loadProjects: () => void }>();
  const { t, lang } = useLang();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<{ id: string; userId: string; user: { name: string } }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>('TODO');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | ''>('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const pendingOpenTaskRef = useRef<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const titleMatch = task.title.toLowerCase().includes(q);
        const descMatch = task.description?.toLowerCase().includes(q);
        if (!titleMatch && !descMatch) return false;
      }
      if (filterPriority && task.priority !== filterPriority) return false;
      if (filterAssignee) {
        if (filterAssignee === '_unassigned') {
          if (task.assignees && task.assignees.length > 0) return false;
        } else {
          if (!task.assignees?.some((a) => a.userId === filterAssignee)) return false;
        }
      }
      return true;
    });
  }, [tasks, searchQuery, filterPriority, filterAssignee]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = { TODO: [], IN_PROGRESS: [], REVIEW: [], DONE: [] };
    filteredTasks.forEach((t) => { if (grouped[t.status]) grouped[t.status].push(t); });
    Object.values(grouped).forEach((arr) => arr.sort((a, b) => a.position - b.position));
    return grouped;
  }, [filteredTasks]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'DONE').length;
    const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE').length;
    const unassigned = tasks.filter((t) => !t.assignees || t.assignees.length === 0).length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, overdue, unassigned, progress };
  }, [tasks]);

  const activeFilterCount = [searchQuery, filterPriority, filterAssignee].filter(Boolean).length;

  const uniqueAssignees = useMemo(() => {
    const map = new Map<string, { userId: string; name: string }>();
    tasks.forEach((task) => {
      task.assignees?.forEach((a) => {
        if (!map.has(a.userId)) map.set(a.userId, { userId: a.userId, name: a.user.name });
      });
    });
    return Array.from(map.values());
  }, [tasks]);

  useEffect(() => { if (id) loadAll(); }, [id]);

  useEffect(() => {
    const state = location.state as { openTaskId?: string } | null;
    if (state?.openTaskId && id) {
      pendingOpenTaskRef.current = state.openTaskId;
      loadAll();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  useEffect(() => {
    if (pendingOpenTaskRef.current && tasks.length > 0) {
      const found = tasks.find((t) => t.id === pendingOpenTaskRef.current);
      if (found) {
        setSelectedTask(found);
        pendingOpenTaskRef.current = null;
      }
    }
  }, [tasks]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === '/' && !e.ctrlKey) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('[data-search-input]')?.focus();
      }
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        setViewMode((m) => (m === 'kanban' ? 'table' : 'kanban'));
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [projRes, tasksRes, membersRes] = await Promise.all([
        projectApi.getById(id!), taskApi.getByProject(id!), memberApi.getByProject(id!),
      ]);
      setProject(projRes.data); setTasks(tasksRes.data); setMembers(membersRes.data);
    } catch {
      toast.error(t.project.loadFailed); navigate('/dashboard');
    } finally { setLoading(false); }
  }

  async function silentRefresh() {
    if (!id || activeTask) return;
    try {
      const [tasksRes, membersRes] = await Promise.all([
        taskApi.getByProject(id), memberApi.getByProject(id),
      ]);
      setTasks(tasksRes.data);
      setMembers(membersRes.data);
    } catch { /* silent */ }
  }

  useLiveRefresh(silentRefresh, 5000, !!id && !loading);

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;
    const isOverColumn = STATUSES.includes(overId as TaskStatus);
    const overTask = tasks.find((t) => t.id === overId);
    const newStatus: TaskStatus = isOverColumn ? (overId as TaskStatus) : overTask?.status || activeTask.status;
    if (activeTask.status !== newStatus) {
      setTasks((prev) => prev.map((t) => (t.id === activeId ? { ...t, status: newStatus } : t)));
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    const task = tasks.find((t) => t.id === activeId);
    if (!task) return;
    const isOverColumn = STATUSES.includes(overId as TaskStatus);
    const newStatus: TaskStatus = isOverColumn ? (overId as TaskStatus) : tasks.find((t) => t.id === overId)?.status || task.status;
    const columnTasks = tasks.filter((t) => t.status === newStatus && t.id !== activeId);
    const newPosition = isOverColumn ? columnTasks.length : Math.max(columnTasks.findIndex((t) => t.id === overId), 0);

    setTasks((prev) => {
      const without = prev.filter((t) => t.id !== activeId);
      const updated = { ...task, status: newStatus, position: newPosition };
      const colTasks = without.filter((t) => t.status === newStatus);
      colTasks.splice(newPosition, 0, updated);
      const reindexed = colTasks.map((t, i) => ({ ...t, position: i }));
      return [...without.filter((t) => t.status !== newStatus), ...reindexed];
    });

    try { await taskApi.updatePosition(activeId, { status: newStatus, position: newPosition }); }
    catch { toast.error(t.task.positionFailed); loadAll(); }
  }

  async function handleCreateTask() {
    if (!newTaskTitle.trim() || !id) return;
    setCreating(true);
    try {
      const { data } = await taskApi.create(id, { title: newTaskTitle.trim(), status: newTaskStatus });
      setTasks((prev) => [...prev, data]); setShowNewTask(false); setNewTaskTitle('');
      toast.success(t.task.taskCreated);
      setSelectedTask(data);
    } catch { toast.error(t.task.createFailed); }
    finally { setCreating(false); }
  }

  function handleTaskUpdate(updated: Task) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...updated, _count: t._count } : t)));
    setSelectedTask(updated);
  }

  function handleTaskDelete(taskId: string) { setTasks((prev) => prev.filter((t) => t.id !== taskId)); setSelectedTask(null); }

  async function handleEditProject() {
    if (!id || !editName.trim()) return;
    try {
      const { data } = await projectApi.update(id, { name: editName.trim(), description: editDesc.trim() || undefined });
      setProject(data); setShowEditProject(false); loadProjects();
      toast.success(t.project.projectUpdated);
    } catch { toast.error(t.project.updateFailed); }
  }

  function toggleTaskSelection(taskId: string) {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  async function handleBulkStatusChange(newStatus: TaskStatus) {
    setBulkUpdating(true);
    try {
      await Promise.all(
        Array.from(selectedTaskIds).map((id) => taskApi.update(id, { status: newStatus }))
      );
      toast.success(t.bulk.updated);
      setSelectedTaskIds(new Set());
      loadAll();
    } catch {
      toast.error(t.bulk.updateFailed);
    } finally {
      setBulkUpdating(false);
    }
  }

  async function handleBulkPriorityChange(newPriority: TaskPriority) {
    setBulkUpdating(true);
    try {
      await Promise.all(
        Array.from(selectedTaskIds).map((id) => taskApi.update(id, { priority: newPriority }))
      );
      toast.success(t.bulk.updated);
      setSelectedTaskIds(new Set());
      loadAll();
    } catch {
      toast.error(t.bulk.updateFailed);
    } finally {
      setBulkUpdating(false);
    }
  }

  function exportToCSV() {
    const rows = filteredTasks.map((task) => ({
      [t.board.taskName]: task.title,
      [t.task.status]: t.status[task.status],
      [t.task.priority]: t.priority[task.priority],
      [t.task.assignee]: task.assignees?.map((a) => a.user.name).join(', ') || t.task.unassigned,
      [t.task.dueDate]: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '',
      [t.board.created]: new Date(task.createdAt).toLocaleDateString(),
      [t.task.description]: task.description?.replace(/<[^>]*>/g, '').slice(0, 200) || '',
    }));

    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        headers.map((h) => `"${(row[h as keyof typeof row] || '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project?.name || 'tasks'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t.export.exported);
  }

  function clearAllFilters() {
    setSearchQuery('');
    setFilterPriority('');
    setFilterAssignee('');
  }

  if (loading) return <div className="p-6"><SkeletonKanban /></div>;
  if (!project) return null;

  const he = lang === 'he';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-6 lg:px-8 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white">{project.name}</h1>
              {project.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{project.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate(`/projects/${id}/team`)} className="btn-secondary text-sm">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">{t.project.team} ({members.length})</span>
              </button>
              <button onClick={() => { setEditName(project.name); setEditDesc(project.description || ''); setShowEditProject(true); }} className="btn-ghost p-2">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-4 py-3">
              <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/40">
                <ListTodo className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{stats.total}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.board.totalTasks}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-4 py-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{stats.progress}%</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {stats.done} {t.board.of} {stats.total} {t.board.completed}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-4 py-3">
              <div className={`p-2 rounded-lg ${stats.overdue > 0 ? 'bg-red-100 dark:bg-red-900/40' : 'bg-slate-100 dark:bg-slate-700'}`}>
                <AlertTriangle className={`w-4 h-4 ${stats.overdue > 0 ? 'text-red-500' : 'text-slate-400'}`} />
              </div>
              <div>
                <p className={`text-lg font-bold ${stats.overdue > 0 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>{stats.overdue}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.board.overdue}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-4 py-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <UserX className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{stats.unassigned}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.board.unassigned}</p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {stats.total > 0 && (
            <div className="mb-4">
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.progress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-primary-500 to-emerald-500 rounded-full"
                />
              </div>
            </div>
          )}

          {/* Search, Filters & View Toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                data-search-input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`${t.board.searchTasks} (/)`}
                className="input ps-9 pe-3 py-2 text-sm w-full"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute end-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>

            {/* Filter dropdowns */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as TaskPriority | '')}
                  className="input py-2 text-sm pe-8 min-w-[120px] appearance-none cursor-pointer"
                >
                  <option value="">{t.board.allPriorities}</option>
                  <option value="LOW">{t.priority.LOW}</option>
                  <option value="MEDIUM">{t.priority.MEDIUM}</option>
                  <option value="HIGH">{t.priority.HIGH}</option>
                  <option value="URGENT">{t.priority.URGENT}</option>
                </select>
                <ChevronDown className="absolute end-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={filterAssignee}
                  onChange={(e) => setFilterAssignee(e.target.value)}
                  className="input py-2 text-sm pe-8 min-w-[130px] appearance-none cursor-pointer"
                >
                  <option value="">{t.board.allAssignees}</option>
                  <option value="_unassigned">{t.board.unassigned}</option>
                  {uniqueAssignees.map((a) => (
                    <option key={a.userId} value={a.userId}>{a.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute end-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              {activeFilterCount > 0 && (
                <button onClick={clearAllFilters} className="btn-ghost text-xs text-red-500 hover:text-red-600 gap-1 px-2 py-2">
                  <X className="w-3.5 h-3.5" />
                  {t.board.clearFilters}
                </button>
              )}

              {/* Export CSV */}
              <button
                onClick={exportToCSV}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-primary-600 hover:border-primary-300 transition-colors"
                title={t.export.csv}
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Bulk Select Toggle */}
              <button
                onClick={() => setSelectedTaskIds(selectedTaskIds.size > 0 ? new Set() : new Set(filteredTasks.map((t) => t.id)))}
                className={`p-2 rounded-lg border transition-colors ${
                  selectedTaskIds.size > 0
                    ? 'border-primary-400 text-primary-600 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-primary-600 hover:border-primary-300'
                }`}
                title={selectedTaskIds.size > 0 ? t.bulk.clearSelection : `${t.bulk.selected} ${t.bulk.tasks}`}
              >
                <CheckSquare className="w-4 h-4" />
              </button>

              {/* View Toggle */}
              <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden ms-1">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`p-2 transition-colors ${viewMode === 'kanban' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  title={t.board.kanbanView}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  title={t.board.tableView}
                >
                  <Table2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Team member quick filter (avatar bar) */}
          {members.length > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-xs text-slate-400 dark:text-slate-500 me-1">{t.board.filterByMember}:</span>
              <button
                onClick={() => setFilterAssignee('')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterAssignee === ''
                    ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {t.board.allMembers}
              </button>
              <button
                onClick={() => setFilterAssignee(filterAssignee === '_unassigned' ? '' : '_unassigned')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterAssignee === '_unassigned'
                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {t.board.unassigned}
              </button>
              {members.map((m) => (
                <button
                  key={m.userId}
                  onClick={() => setFilterAssignee(filterAssignee === m.userId ? '' : m.userId)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                    filterAssignee === m.userId
                      ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 ring-2 ring-primary-300 dark:ring-primary-600'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Avatar name={m.user.name} size="xs" />
                  <span className="max-w-[80px] truncate">{m.user.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Active filter indicator */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-primary-600 dark:text-primary-400">
                {t.board.activeFilters}: {filteredTasks.length} / {tasks.length} {t.board.totalTasks.toLowerCase()}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Bulk Action Bar */}
      {selectedTaskIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 lg:px-8 py-3 bg-primary-50 dark:bg-primary-950/30 border-b border-primary-200 dark:border-primary-800"
        >
          <div className="max-w-7xl mx-auto flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
              {t.bulk.selected} {selectedTaskIds.size} {t.bulk.tasks}
            </span>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  onChange={(e) => { if (e.target.value) handleBulkStatusChange(e.target.value as TaskStatus); e.target.value = ''; }}
                  className="input py-1.5 text-xs min-w-[110px] cursor-pointer"
                  disabled={bulkUpdating}
                  defaultValue=""
                >
                  <option value="" disabled>{t.bulk.changeStatus}</option>
                  {STATUSES.map((s) => <option key={s} value={s}>{t.status[s]}</option>)}
                </select>
              </div>
              <div className="relative">
                <select
                  onChange={(e) => { if (e.target.value) handleBulkPriorityChange(e.target.value as TaskPriority); e.target.value = ''; }}
                  className="input py-1.5 text-xs min-w-[110px] cursor-pointer"
                  disabled={bulkUpdating}
                  defaultValue=""
                >
                  <option value="" disabled>{t.bulk.changePriority}</option>
                  {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as TaskPriority[]).map((p) => <option key={p} value={p}>{t.priority[p]}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={() => setSelectedTaskIds(new Set())}
              className="text-xs text-slate-500 hover:text-red-500 flex items-center gap-1 ms-auto transition-colors"
            >
              <X className="w-3.5 h-3.5" /> {t.bulk.clearSelection}
            </button>
          </div>
        </motion.div>
      )}

      {/* Content Area */}
      <div className={`flex-1 overflow-x-auto overflow-y-${viewMode === 'table' ? 'auto' : 'hidden'} p-6 lg:p-8`}>
        <div className="max-w-7xl mx-auto h-full">
          {viewMode === 'kanban' ? (
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
              <div className="flex gap-5 h-full min-w-max lg:min-w-0">
                {STATUSES.map((status) => (
                  <KanbanColumn key={status} status={status} tasks={tasksByStatus[status]} onAddTask={(s) => { setNewTaskStatus(s); setShowNewTask(true); }} onTaskClick={setSelectedTask} />
                ))}
              </div>
              <DragOverlay>{activeTask && <div className="w-[300px]"><TaskCard task={activeTask} onClick={() => {}} /></div>}</DragOverlay>
            </DndContext>
          ) : (
            <TaskTableView
              tasks={filteredTasks}
              onTaskClick={setSelectedTask}
              selectedIds={selectedTaskIds.size > 0 ? selectedTaskIds : undefined}
              onToggleSelect={selectedTaskIds.size > 0 ? toggleTaskSelection : undefined}
            />
          )}
        </div>
      </div>

      <TaskDetailPanel task={selectedTask} onClose={() => setSelectedTask(null)} onUpdate={handleTaskUpdate} onDelete={handleTaskDelete} />

      <Modal isOpen={showNewTask} onClose={() => setShowNewTask(false)} title={t.task.newTask} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); handleCreateTask(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.task.taskTitle}</label>
            <input type="text" className="input" placeholder={t.task.whatToDo} value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} autoFocus />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowNewTask(false)} className="btn-secondary flex-1">{t.common.cancel}</button>
            <button type="submit" disabled={!newTaskTitle.trim() || creating} className="btn-primary flex-1">{creating ? t.common.creating : t.task.createTask}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showEditProject} onClose={() => setShowEditProject(false)} title={t.project.editProject} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); handleEditProject(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.project.projectName}</label>
            <input type="text" className="input" value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.project.description}</label>
            <textarea className="input resize-none" rows={3} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowEditProject(false)} className="btn-secondary flex-1">{t.common.cancel}</button>
            <button type="submit" disabled={!editName.trim()} className="btn-primary flex-1">{t.common.save}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
