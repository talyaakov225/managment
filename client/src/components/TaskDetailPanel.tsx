import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Calendar, User, Flag, MessageSquare,
  Send, Trash2, AlertCircle, Pencil, Eye, Palette, Users, Check, Search,
  MoreVertical, Edit3, Plus, Clock, ChevronDown,
} from 'lucide-react';
import {
  taskApi, commentApi, chatApi, subtaskApi, taskActivityApi,
  type Subtask, type TaskActivity,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { Avatar } from './Avatar';
import { RichTextEditor, RichTextViewer } from './RichTextEditor';
import type { Task, Comment, TaskStatus, TaskPriority, User as AppUser } from '../types';
import { STATUS_STYLE, PRIORITY_STYLE, STATUSES } from '../types';
import toast from 'react-hot-toast';

interface TaskDetailPanelProps {
  task: Task | null;
  onClose: () => void;
  onUpdate: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const priorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export function TaskDetailPanel({ task, onClose, onUpdate, onDelete }: TaskDetailPanelProps) {
  const { user } = useAuth();
  const { t, lang, dateLocale } = useLang();
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(new Set());
  const [assigneeRoles, setAssigneeRoles] = useState<Record<string, string>>({});
  const [dueDate, setDueDate] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [commentMenuId, setCommentMenuId] = useState<string | null>(null);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [showActivity, setShowActivity] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const priorityRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLDivElement>(null);
  const commentMenuRef = useRef<HTMLDivElement>(null);

  const he = lang === 'he';
  const isCreator = task?.creatorId === user?.id;
  const myRole = task?.assignees?.find(a => a.userId === user?.id)?.role;
  const canEdit = isCreator || myRole !== 'VIEWER' || user?.globalRole === 'SUPER_ADMIN';

  useEffect(() => {
    chatApi.getUsers().then(({ data }) => setAllUsers(data)).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowAssigneePicker(false);
      if (priorityRef.current && !priorityRef.current.contains(e.target as Node)) setShowPriorityDropdown(false);
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) setShowColorDropdown(false);
      if (commentMenuRef.current && !commentMenuRef.current.contains(e.target as Node)) setCommentMenuId(null);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setShowDeleteConfirm(false);
    setEditingDescription(false);
    setShowAssigneePicker(false);
    setShowPriorityDropdown(false);
    setShowColorDropdown(false);
    setEditingCommentId(null);
    setEditCommentContent('');
    setCommentMenuId(null);
    setComments([]);
    setSubtasks([]);
    setActivities([]);
    setShowActivity(false);
    setNewComment('');
    setNewSubtask('');
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setColor(task.color || null);
      setAssigneeIds(new Set(task.assignees?.map((a) => a.userId) || []));
      const roles: Record<string, string> = {};
      task.assignees?.forEach((a) => { roles[a.userId] = a.role || 'EDITOR'; });
      setAssigneeRoles(roles);
      setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
      loadComments(task.id);
      loadSubtasks(task.id);
      loadActivities(task.id);
    } else {
      setTitle('');
      setDescription('');
      setStatus('TODO');
      setPriority('MEDIUM');
      setColor(null);
      setAssigneeIds(new Set());
      setAssigneeRoles({});
      setDueDate('');
    }
  }, [task?.id]);

  async function loadSubtasks(taskId: string) {
    try {
      const { data } = await subtaskApi.getByTask(taskId);
      setSubtasks(data);
    } catch { /* silent */ }
  }

  async function loadActivities(taskId: string) {
    try {
      const { data } = await taskActivityApi.getByTask(taskId);
      setActivities(data);
    } catch { /* silent */ }
  }

  async function handleAddSubtask() {
    if (!task || !newSubtask.trim()) return;
    try {
      const { data } = await subtaskApi.create(task.id, { title: newSubtask.trim() });
      setSubtasks((prev) => [...prev, data]);
      setNewSubtask('');
      loadActivities(task.id);
    } catch { toast.error(t.task.createFailed); }
  }

  async function handleToggleSubtask(id: string, completed: boolean) {
    try {
      const { data } = await subtaskApi.update(id, { completed: !completed });
      setSubtasks((prev) => prev.map((s) => (s.id === id ? data : s)));
      if (task) loadActivities(task.id);
    } catch { /* silent */ }
  }

  async function handleDeleteSubtask(id: string) {
    try {
      await subtaskApi.delete(id);
      setSubtasks((prev) => prev.filter((s) => s.id !== id));
      if (task) loadActivities(task.id);
    } catch { /* silent */ }
  }

  async function loadComments(taskId: string) {
    try {
      const { data } = await commentApi.getByTask(taskId);
      setComments(data);
    } catch { /* silent */ }
  }

  async function handleSave() {
    if (!task) return;
    setSaving(true);
    try {
      const { data } = await taskApi.update(task.id, {
        title, description: description || null, status, priority, color,
        assigneeIds: Array.from(assigneeIds),
        assigneeRoles,
        dueDate: dueDate || null,
      });
      onUpdate(data);
      toast.success(t.task.taskUpdated);
    } catch {
      toast.error(t.task.updateFailed);
    } finally {
      setSaving(false);
    }
  }

  function toggleAssignee(userId: string) {
    setAssigneeIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function handleAddComment() {
    if (!task || !newComment.trim()) return;
    try {
      const { data } = await commentApi.create(task.id, { content: newComment.trim() });
      setComments((prev) => [data, ...prev]);
      setNewComment('');
    } catch {
      toast.error(t.task.commentFailed);
    }
  }

  async function handleEditComment(commentId: string) {
    if (!editCommentContent.trim()) return;
    try {
      const { data } = await commentApi.update(commentId, { content: editCommentContent.trim() });
      setComments((prev) => prev.map((c) => (c.id === commentId ? data : c)));
      setEditingCommentId(null);
      setEditCommentContent('');
    } catch {
      toast.error(t.task.updateFailed);
    }
  }

  async function handleDeleteComment(commentId: string) {
    try {
      await commentApi.delete(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setCommentMenuId(null);
    } catch {
      toast.error(t.task.deleteFailed);
    }
  }

  async function handleDelete() {
    if (!task) return;
    try {
      await taskApi.delete(task.id);
      onDelete(task.id);
      onClose();
      toast.success(t.task.taskDeleted);
    } catch {
      toast.error(t.task.deleteFailed);
    }
  }

  const combinedUsers = user
    ? [user, ...allUsers.filter((u) => u.id !== user.id)]
    : allUsers;

  const filteredPickerUsers = assigneeSearch
    ? combinedUsers.filter((u) => u.name.toLowerCase().includes(assigneeSearch.toLowerCase()))
    : combinedUsers;

  const selectedUsers = combinedUsers.filter((u) => assigneeIds.has(u.id));

  return (
    <AnimatePresence mode="wait">
      {task && (
        <motion.div
          key={task.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-8 pb-8 px-4 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[calc(100vh-4rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-3 h-3 rounded-full shrink-0 ${STATUS_STYLE[status].dotColor}`} />
                <input
                  type="text"
                  value={title}
                  onChange={(e) => canEdit && setTitle(e.target.value)}
                  onBlur={canEdit ? handleSave : undefined}
                  readOnly={!canEdit}
                  className={`flex-1 text-lg font-semibold text-slate-900 dark:text-white bg-transparent border-none outline-none focus:ring-0 p-0 min-w-0 ${!canEdit ? 'cursor-default' : ''}`}
                />
              </div>
              <div className="flex items-center gap-1 shrink-0 ms-3">
                {canEdit && (
                  <button onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Viewer banner */}
            {!canEdit && (
              <div className="mx-5 mt-3 px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                  {he ? 'יש לך הרשאת צפייה בלבד במשימה זו' : 'You have view-only access to this task'}
                </span>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Main content */}
                <div className="lg:col-span-3 space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">{t.task.description}</label>
                      <button
                        onClick={() => {
                          if (editingDescription) handleSave();
                          setEditingDescription(!editingDescription);
                        }}
                        className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        {editingDescription ? <><Eye className="w-3.5 h-3.5" />{t.task.viewMode}</> : <><Pencil className="w-3.5 h-3.5" />{t.task.editMode}</>}
                      </button>
                    </div>

                    {editingDescription ? (
                      <RichTextEditor key={`edit-${task?.id}`} content={description} onChange={setDescription} editable={true} />
                    ) : (
                      <div
                        className="min-h-[120px] p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors prose prose-sm dark:prose-invert max-w-none"
                        onClick={() => canEdit ? setEditingDescription(true) : undefined}
                      >
                        {description ? <RichTextViewer key={`view-${task?.id}`} content={description} /> : <p className="text-sm text-slate-400 italic">{t.task.addDescription}</p>}
                      </div>
                    )}
                  </div>

                  {/* Subtasks */}
                  <div>
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" /> {t.subtasks.title}
                      {subtasks.length > 0 && (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                          {subtasks.filter((s) => s.completed).length} / {subtasks.length}
                        </span>
                      )}
                    </label>

                    {subtasks.length > 0 && (
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mb-3 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${subtasks.length > 0 ? (subtasks.filter((s) => s.completed).length / subtasks.length) * 100 : 0}%` }}
                        />
                      </div>
                    )}

                    <div className="space-y-1 mb-2">
                      {subtasks.map((sub) => (
                        <div key={sub.id} className="flex items-center gap-2 group/sub py-1 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <button
                            onClick={() => handleToggleSubtask(sub.id, sub.completed)}
                            className={`w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                              sub.completed
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-slate-300 dark:border-slate-600 hover:border-primary-400'
                            }`}
                          >
                            {sub.completed && <Check className="w-3 h-3" />}
                          </button>
                          <span className={`text-sm flex-1 ${sub.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            {sub.title}
                          </span>
                          <button
                            onClick={() => handleDeleteSubtask(sub.id)}
                            className="p-0.5 rounded opacity-0 group-hover/sub:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                        placeholder={t.subtasks.add}
                        className="input text-sm flex-1"
                      />
                      <button onClick={handleAddSubtask} disabled={!newSubtask.trim()} className="btn-primary px-3">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Activity Log */}
                  <div>
                    <button
                      onClick={() => setShowActivity(!showActivity)}
                      className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 hover:text-primary-500 transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {t.activity.title} ({activities.length})
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showActivity ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {showActivity && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2 max-h-48 overflow-y-auto ps-3 border-s-2 border-slate-200 dark:border-slate-700">
                            {activities.length === 0 && (
                              <p className="text-xs text-slate-400 italic py-2">{t.activity.noActivity}</p>
                            )}
                            {activities.map((act) => (
                              <div key={act.id} className="flex items-start gap-2 py-1">
                                <Avatar name={act.user.name} size="xs" className="mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-slate-600 dark:text-slate-400">
                                    <span className="font-medium text-slate-800 dark:text-slate-200">{act.user.name}</span>
                                    {' '}
                                    {act.action === 'field_changed' && (
                                      <>
                                        {t.activity.fieldChanged} <span className="font-medium">{act.field}</span>
                                        {act.oldValue && <> {t.activity.from}<span className="font-medium">{act.oldValue}</span></>}
                                        {act.newValue && <> {t.activity.to}<span className="font-medium">{act.newValue}</span></>}
                                      </>
                                    )}
                                    {act.action === 'subtask_added' && <>{t.activity.subtaskAdded}: <span className="font-medium">{act.newValue}</span></>}
                                    {act.action === 'subtask_completed' && <>{t.activity.subtaskCompleted}: <span className="font-medium">{act.newValue}</span></>}
                                    {act.action === 'subtask_uncompleted' && <>{t.activity.subtaskUncompleted}: <span className="font-medium">{act.newValue}</span></>}
                                    {act.action === 'subtask_removed' && <>{t.activity.subtaskRemoved}: <span className="font-medium">{act.oldValue}</span></>}
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    {new Date(act.createdAt).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" /> {t.task.comments} ({comments.length})
                    </label>

                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                        placeholder={t.task.writeComment}
                        className="input text-sm flex-1"
                      />
                      <button onClick={handleAddComment} disabled={!newComment.trim()} className="btn-primary px-3">
                        <Send className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {comments.map((comment) => {
                        const isOwn = comment.author.id === user?.id;
                        const isEditing = editingCommentId === comment.id;
                        return (
                          <div key={comment.id} className="flex gap-3 group/comment">
                            <Avatar name={comment.author.name} size="sm" className="mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-slate-900 dark:text-white">{comment.author.name}</span>
                                <span className="text-xs text-slate-400">
                                  {new Date(comment.createdAt).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isOwn && !isEditing && (
                                  <div className="relative ms-auto" ref={commentMenuId === comment.id ? commentMenuRef : undefined}>
                                    <button
                                      onClick={() => setCommentMenuId(commentMenuId === comment.id ? null : comment.id)}
                                      className="p-1 rounded opacity-0 group-hover/comment:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                                    >
                                      <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
                                    </button>
                                    <AnimatePresence>
                                      {commentMenuId === comment.id && (
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0.95 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          exit={{ opacity: 0, scale: 0.95 }}
                                          className="absolute end-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden z-30 min-w-[120px]"
                                        >
                                          <button
                                            onClick={() => {
                                              setEditingCommentId(comment.id);
                                              setEditCommentContent(comment.content);
                                              setCommentMenuId(null);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                          >
                                            <Edit3 className="w-3.5 h-3.5" />
                                            {t.common.edit}
                                          </button>
                                          <button
                                            onClick={() => handleDeleteComment(comment.id)}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            {t.common.delete}
                                          </button>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                )}
                              </div>
                              {isEditing ? (
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={editCommentContent}
                                    onChange={(e) => setEditCommentContent(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleEditComment(comment.id);
                                      if (e.key === 'Escape') { setEditingCommentId(null); setEditCommentContent(''); }
                                    }}
                                    className="input text-sm flex-1"
                                    autoFocus
                                  />
                                  <button onClick={() => handleEditComment(comment.id)} disabled={!editCommentContent.trim()} className="btn-primary px-2.5 py-1.5 text-xs">
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => { setEditingCommentId(null); setEditCommentContent(''); }} className="btn-secondary px-2.5 py-1.5 text-xs">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <p className="text-sm text-slate-600 dark:text-slate-300">{comment.content}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" /> {t.task.status}
                    </label>
                    <div className="flex gap-1.5 flex-wrap">
                      {STATUSES.map((s) => (
                        <button
                          key={s}
                          disabled={!canEdit}
                          onClick={() => { if (canEdit) { setStatus(s); setTimeout(handleSave, 50); } }}
                          className={`text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all ${
                            status === s
                              ? `${STATUS_STYLE[s].bgColor} ${STATUS_STYLE[s].color} ring-1 ring-current`
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {t.status[s]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative" ref={priorityRef}>
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Flag className="w-3.5 h-3.5" /> {t.task.priority}
                    </label>
                    <button
                      onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium transition-colors hover:border-primary-400 ${PRIORITY_STYLE[priority].color}`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full ${PRIORITY_STYLE[priority].dotColor}`} />
                      {t.priority[priority]}
                    </button>
                    <AnimatePresence>
                      {showPriorityDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute z-20 top-full mt-1 start-0 end-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden"
                        >
                          {priorities.map((p) => (
                            <button
                              key={p}
                              onClick={() => { setPriority(p); setShowPriorityDropdown(false); setTimeout(handleSave, 50); }}
                              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-start transition-colors ${
                                priority === p ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                              }`}
                            >
                              <div className={`w-2.5 h-2.5 rounded-full ${PRIORITY_STYLE[p].dotColor}`} />
                              <span className={`font-medium ${PRIORITY_STYLE[p].color}`}>{t.priority[p]}</span>
                              {priority === p && <Check className="w-4 h-4 text-primary-500 ms-auto" />}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="relative" ref={colorRef}>
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5" /> {t.task.taskColor}
                    </label>
                    <button
                      onClick={() => setShowColorDropdown(!showColorDropdown)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium transition-colors hover:border-primary-400 text-slate-600 dark:text-slate-300"
                    >
                      {color ? (
                        <span className="w-4 h-4 rounded-md shrink-0" style={{ backgroundColor: color }} />
                      ) : (
                        <X className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      {color ? color : t.task.noColor}
                    </button>
                    <AnimatePresence>
                      {showColorDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute z-20 top-full mt-1 start-0 end-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3"
                        >
                          <div className="grid grid-cols-5 gap-2 mb-2">
                            {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'].map((c) => (
                              <button
                                key={c}
                                onClick={() => { setColor(c); setShowColorDropdown(false); setTimeout(handleSave, 50); }}
                                className={`w-full aspect-square rounded-lg transition-all hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-primary-500 dark:ring-offset-slate-800' : ''}`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                          <button
                            onClick={() => { setColor(null); setShowColorDropdown(false); setTimeout(handleSave, 50); }}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-xs text-slate-500 hover:border-primary-400 hover:text-primary-500 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            {t.task.noColor}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Multi-select assignees */}
                  <div className="relative" ref={pickerRef}>
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> {he ? 'משויכים' : 'Assignees'}
                      {assigneeIds.size > 0 && (
                        <span className="text-[10px] bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-1.5 py-0.5 rounded-full font-bold">
                          {assigneeIds.size}
                        </span>
                      )}
                    </label>

                    {/* Selected assignees chips */}
                    <div className="flex flex-col gap-1.5 mb-2">
                      {selectedUsers.map((u) => {
                        const role = assigneeRoles[u.id] || 'EDITOR';
                        return (
                          <div
                            key={u.id}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800"
                          >
                            <Avatar name={u.name} size="xs" />
                            <span className="text-xs font-medium text-primary-700 dark:text-primary-300 flex-1">{u.name}</span>
                            {canEdit && (
                              <button
                                onClick={() => {
                                  const newRole = role === 'EDITOR' ? 'VIEWER' : 'EDITOR';
                                  setAssigneeRoles(prev => ({ ...prev, [u.id]: newRole }));
                                  setTimeout(handleSave, 100);
                                }}
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition-colors ${
                                  role === 'EDITOR'
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                }`}
                              >
                                {role === 'EDITOR' ? (he ? 'עריכה' : 'Edit') : (he ? 'צפייה' : 'View')}
                              </button>
                            )}
                            {!canEdit && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                role === 'EDITOR'
                                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                              }`}>
                                {role === 'EDITOR' ? (he ? 'עריכה' : 'Edit') : (he ? 'צפייה' : 'View')}
                              </span>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => { toggleAssignee(u.id); setTimeout(handleSave, 100); }}
                                className="p-0.5 rounded hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
                              >
                                <X className="w-3 h-3 text-primary-500" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {assigneeIds.size === 0 && (
                        <p className="text-xs text-slate-400 italic py-1">{he ? 'רק אתה רואה משימה זו' : 'Only you can see this task'}</p>
                      )}
                    </div>

                    <button
                      onClick={() => { setShowAssigneePicker(!showAssigneePicker); setAssigneeSearch(''); }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-sm text-slate-500 hover:border-primary-400 hover:text-primary-500 transition-colors"
                    >
                      <User className="w-4 h-4" />
                      {he ? 'הוסף/הסר משויכים' : 'Add/Remove Assignees'}
                    </button>

                    <AnimatePresence>
                      {showAssigneePicker && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute z-20 top-full mt-1 start-0 end-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden"
                        >
                          <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                            <div className="relative">
                              <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                              <input
                                type="text"
                                className="w-full ps-8 pe-3 py-1.5 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 outline-none focus:ring-1 focus:ring-primary-400"
                                placeholder={he ? 'חיפוש...' : 'Search...'}
                                value={assigneeSearch}
                                onChange={(e) => setAssigneeSearch(e.target.value)}
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredPickerUsers.map((u) => {
                              const selected = assigneeIds.has(u.id);
                              return (
                                <button
                                  key={u.id}
                                  onClick={() => toggleAssignee(u.id)}
                                  className={`w-full flex items-center gap-3 px-3 py-2 text-start transition-colors ${
                                    selected ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  <Avatar name={u.name} size="sm" />
                                  <span className="text-sm font-medium text-slate-900 dark:text-white flex-1">{u.name}</span>
                                  {u.id === user?.id && <span className="text-[10px] text-slate-400">{he ? 'אתה' : 'You'}</span>}
                                  {selected && <Check className="w-4 h-4 text-primary-500 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                          <div className="p-2 border-t border-slate-100 dark:border-slate-700">
                            <button
                              onClick={() => { setShowAssigneePicker(false); setTimeout(handleSave, 50); }}
                              className="btn-primary w-full text-sm py-1.5"
                            >
                              {he ? 'שמור' : 'Save'}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> {t.task.dueDate}
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => { setDueDate(e.target.value); setTimeout(handleSave, 50); }}
                      className="input text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex gap-3 shrink-0">
              <button onClick={onClose} className="btn-secondary flex-1">{t.common.close}</button>
              {canEdit && (
                <button onClick={async () => { await handleSave(); onClose(); }} disabled={saving} className="btn-primary flex-1">
                  {saving ? t.common.saving : t.task.saveChanges}
                </button>
              )}
            </div>

            {/* Delete confirmation */}
            <AnimatePresence>
              {showDeleteConfirm && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center p-6 z-10">
                  <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800">
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{t.task.deleteTask}</h4>
                    <p className="text-sm text-slate-500 mb-5">{t.task.deleteConfirm}</p>
                    <div className="flex gap-3">
                      <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1">{t.common.cancel}</button>
                      <button onClick={handleDelete} className="btn-danger flex-1">{t.common.delete}</button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
