import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  DndContext, DragOverlay, closestCorners,
  PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core';
import { Users, Loader2, MoreHorizontal } from 'lucide-react';
import { projectApi, taskApi, memberApi } from '../services/api';
import { useLang } from '../context/LangContext';
import { KanbanColumn } from '../components/KanbanColumn';
import { TaskCard } from '../components/TaskCard';
import { TaskDetailPanel } from '../components/TaskDetailPanel';
import { Modal } from '../components/Modal';
import type { Project, Task, TaskStatus, ProjectMember } from '../types';
import { STATUSES } from '../types';
import toast from 'react-hot-toast';

export function ProjectBoardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loadProjects } = useOutletContext<{ loadProjects: () => void }>();
  const { t } = useLang();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = { TODO: [], IN_PROGRESS: [], REVIEW: [], DONE: [] };
    tasks.forEach((t) => { if (grouped[t.status]) grouped[t.status].push(t); });
    Object.values(grouped).forEach((arr) => arr.sort((a, b) => a.position - b.position));
    return grouped;
  }, [tasks]);

  useEffect(() => { if (id) loadAll(); }, [id]);

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

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-primary-600 animate-spin" /></div>;
  if (!project) return null;

  return (
    <div className="flex flex-col h-full">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-6 lg:px-8 py-5 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
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
      </motion.div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 lg:p-8">
        <div className="max-w-7xl mx-auto h-full">
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <div className="flex gap-5 h-full min-w-max lg:min-w-0">
              {STATUSES.map((status) => (
                <KanbanColumn key={status} status={status} tasks={tasksByStatus[status]} onAddTask={(s) => { setNewTaskStatus(s); setShowNewTask(true); }} onTaskClick={setSelectedTask} />
              ))}
            </div>
            <DragOverlay>{activeTask && <div className="w-[300px]"><TaskCard task={activeTask} onClick={() => {}} /></div>}</DragOverlay>
          </DndContext>
        </div>
      </div>

      <TaskDetailPanel task={selectedTask} members={members} onClose={() => setSelectedTask(null)} onUpdate={handleTaskUpdate} onDelete={handleTaskDelete} />

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
