import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Calendar, User, Flag, MessageSquare,
  Send, Trash2, AlertCircle, Pencil, Eye,
} from 'lucide-react';
import { taskApi, commentApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { Avatar } from './Avatar';
import { RichTextEditor, RichTextViewer } from './RichTextEditor';
import type { Task, Comment, ProjectMember, TaskStatus, TaskPriority } from '../types';
import { STATUS_STYLE, PRIORITY_STYLE, STATUSES } from '../types';
import toast from 'react-hot-toast';

interface TaskDetailPanelProps {
  task: Task | null;
  members: ProjectMember[];
  onClose: () => void;
  onUpdate: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const priorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export function TaskDetailPanel({ task, members, onClose, onUpdate, onDelete }: TaskDetailPanelProps) {
  const { user } = useAuth();
  const { t, dateLocale } = useLang();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);

  useEffect(() => {
    setShowDeleteConfirm(false);
    setEditingDescription(false);
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setAssigneeId(task.assigneeId || '');
      setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
      loadComments(task.id);
    }
  }, [task?.id]);

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
        title, description: description || null, status, priority,
        assigneeId: assigneeId || null, dueDate: dueDate || null,
      } as any);
      onUpdate(data);
      toast.success(t.task.taskUpdated);
    } catch {
      toast.error(t.task.updateFailed);
    } finally {
      setSaving(false);
    }
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

  return (
    <AnimatePresence>
      {task && (
        <motion.div
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
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[calc(100vh-4rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-3 h-3 rounded-full shrink-0 ${STATUS_STYLE[status].dotColor}`} />
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleSave}
                  className="flex-1 text-lg font-semibold text-slate-900 dark:text-white bg-transparent border-none outline-none focus:ring-0 p-0 min-w-0"
                />
              </div>
              <div className="flex items-center gap-1 shrink-0 ms-3">
                <button onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main content (description + comments) */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Description */}
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
                      <RichTextEditor
                        content={description}
                        onChange={setDescription}
                        editable={true}
                      />
                    ) : (
                      <div
                        className="min-h-[80px] p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        onClick={() => setEditingDescription(true)}
                      >
                        {description ? (
                          <RichTextViewer content={description} />
                        ) : (
                          <p className="text-sm text-slate-400 italic">{t.task.addDescription}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Comments */}
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

                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar name={comment.author.name} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-slate-900 dark:text-white">{comment.author.name}</span>
                              <span className="text-xs text-slate-400">
                                {new Date(comment.createdAt).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-300">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sidebar (meta fields) */}
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" /> {t.task.status}
                    </label>
                    <div className="flex gap-1.5 flex-wrap">
                      {STATUSES.map((s) => (
                        <button
                          key={s}
                          onClick={() => { setStatus(s); setTimeout(handleSave, 50); }}
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

                  <div>
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Flag className="w-3.5 h-3.5" /> {t.task.priority}
                    </label>
                    <div className="flex gap-1.5 flex-wrap">
                      {priorities.map((p) => (
                        <button
                          key={p}
                          onClick={() => { setPriority(p); setTimeout(handleSave, 50); }}
                          className={`text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                            priority === p
                              ? `bg-opacity-20 ${PRIORITY_STYLE[p].color} ring-1 ring-current`
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full ${PRIORITY_STYLE[p].dotColor}`} />
                          {t.priority[p]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> {t.task.assignee}
                    </label>
                    <select
                      value={assigneeId}
                      onChange={(e) => { setAssigneeId(e.target.value); setTimeout(handleSave, 50); }}
                      className="input text-sm"
                    >
                      <option value="">{t.task.unassigned}</option>
                      {members.map((m) => (
                        <option key={m.userId} value={m.userId}>{m.user.name}</option>
                      ))}
                    </select>
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
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                {saving ? t.common.saving : t.task.saveChanges}
              </button>
            </div>

            {/* Delete confirmation overlay */}
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
