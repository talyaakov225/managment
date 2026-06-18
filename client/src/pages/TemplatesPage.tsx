import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LayoutTemplate as FileTemplate, Plus, Trash2, Play, ListChecks } from 'lucide-react';
import { PageSpinner } from '../components/Skeleton';
import { templateApi, projectApi, type TaskTemplate } from '../services/api';
import { useLang } from '../context/LangContext';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { PRIORITY_STYLE } from '../types';
import type { Project, TaskPriority } from '../types';
import toast from 'react-hot-toast';

const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export function TemplatesPage() {
  const { t, lang } = useLang();
  const he = lang === 'he';
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [applyId, setApplyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', priority: 'MEDIUM' as TaskPriority, subtasks: [''] });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const txt = {
    title: he ? 'תבניות משימות' : 'Task Templates',
    new: he ? 'תבנית חדשה' : 'New Template',
    createTitle: he ? 'יצירת תבנית' : 'Create Template',
    name: he ? 'שם' : 'Name',
    subtasks: he ? 'תת-משימות' : 'Subtasks',
    addSubtask: he ? 'הוסף תת-משימה' : 'Add subtask',
    use: he ? 'השתמש בתבנית' : 'Use Template',
    selectProject: he ? 'בחר פרויקט' : 'Select project',
    emptyTitle: he ? 'אין תבניות' : 'No templates yet',
    emptyDesc: he ? 'צור תבנית כדי לחזור על משימות בקלות' : 'Create a template to reuse common tasks',
    created: he ? 'התבנית נוצרה!' : 'Template created!',
    deleted: he ? 'התבנית נמחקה' : 'Template deleted',
    applied: he ? 'המשימה נוצרה מהתבנית!' : 'Task created from template!',
    deleteConfirm: he ? 'למחוק את התבנית?' : 'Delete this template?',
    subtaskCount: (n: number) => he ? `${n} תת-משימות` : `${n} subtasks`,
  };

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [tpl, proj] = await Promise.all([templateApi.getAll(), projectApi.getAll()]);
      setTemplates(tpl.data);
      setProjects(proj.data);
    } catch { /* */ }
    finally { setLoading(false); }
  }

  function resetForm() {
    setForm({ name: '', description: '', priority: 'MEDIUM', subtasks: [''] });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const subtasks = form.subtasks.map((s) => s.trim()).filter(Boolean);
      const { data } = await templateApi.create({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        subtasks: subtasks.length ? subtasks : undefined,
      });
      setTemplates((prev) => [data, ...prev]);
      setShowCreate(false);
      resetForm();
      toast.success(txt.created);
    } catch (err: any) {
      toast.error(err.response?.data?.error || t.common.create);
    } finally { setCreating(false); }
  }

  async function handleDelete(id: string) {
    try {
      await templateApi.delete(id);
      setTemplates((prev) => prev.filter((tpl) => tpl.id !== id));
      toast.success(txt.deleted);
    } catch (err: any) {
      toast.error(err.response?.data?.error || t.common.delete);
    }
  }

  async function handleApply(templateId: string, projectId: string) {
    try {
      await templateApi.apply(templateId, projectId);
      setApplyId(null);
      toast.success(txt.applied);
    } catch (err: any) {
      toast.error(err.response?.data?.error || txt.use);
    }
  }

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/40 flex items-center justify-center">
              <FileTemplate className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white">{txt.title}</h1>
          </div>
          <button onClick={() => { resetForm(); setShowCreate(true); }} className="btn-primary">
            <Plus className="w-4 h-4" />{txt.new}
          </button>
        </div>

        {templates.length === 0 ? (
          <EmptyState icon={FileTemplate} title={txt.emptyTitle} description={txt.emptyDesc}
            action={{ label: txt.new, onClick: () => { resetForm(); setShowCreate(true); } }} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl, i) => {
              const pri = PRIORITY_STYLE[tpl.priority as TaskPriority] || PRIORITY_STYLE.MEDIUM;
              return (
                <motion.div key={tpl.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }} className="card p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">{tpl.name}</h3>
                    <span className={`shrink-0 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ${pri.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${pri.dotColor}`} />
                      {t.priority[tpl.priority as TaskPriority] || tpl.priority}
                    </span>
                  </div>
                  {tpl.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{tpl.description}</p>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <ListChecks className="w-3.5 h-3.5" />
                    {txt.subtaskCount(tpl.subtasks.length)}
                  </div>
                  <div className="flex items-center gap-2 mt-auto pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="relative flex-1">
                      <button onClick={() => setApplyId(applyId === tpl.id ? null : tpl.id)} className="btn-secondary w-full text-sm">
                        <Play className="w-3.5 h-3.5" />{txt.use}
                      </button>
                      {applyId === tpl.id && (
                        <div className="absolute top-full mt-1 inset-x-0 z-10 card p-2 shadow-lg">
                          <select className="input w-full text-sm" defaultValue=""
                            onChange={(e) => { if (e.target.value) handleApply(tpl.id, e.target.value); }}>
                            <option value="" disabled>{txt.selectProject}</option>
                            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                    <button onClick={() => setDeleteId(tpl.id)} className="btn-ghost p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={txt.createTitle} size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{txt.name} *</label>
            <input className="input w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.task.description}</label>
            <textarea className="input w-full min-h-[80px]" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.task.priority}</label>
            <select className="input w-full" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{t.priority[p]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{txt.subtasks}</label>
            <div className="space-y-2">
              {form.subtasks.map((st, idx) => (
                <div key={idx} className="flex gap-2">
                  <input className="input flex-1" value={st} placeholder={`${txt.subtasks} ${idx + 1}`}
                    onChange={(e) => { const s = [...form.subtasks]; s[idx] = e.target.value; setForm({ ...form, subtasks: s }); }} />
                  {form.subtasks.length > 1 && (
                    <button type="button" onClick={() => setForm({ ...form, subtasks: form.subtasks.filter((_, i) => i !== idx) })}
                      className="btn-ghost p-2 text-red-500"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setForm({ ...form, subtasks: [...form.subtasks, ''] })}
              className="btn-ghost text-sm mt-2 text-primary-600"><Plus className="w-3.5 h-3.5" />{txt.addSubtask}</button>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">{t.common.cancel}</button>
            <button type="submit" disabled={creating || !form.name.trim()} className="btn-primary">
              {creating ? t.common.creating : t.common.create}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) handleDelete(deleteId); }}
        title={txt.deleteConfirm}
        message={he ? 'פעולה זו אינה ניתנת לביטול' : 'This action cannot be undone'}
        confirmText={he ? 'מחק' : 'Delete'}
        cancelText={he ? 'ביטול' : 'Cancel'}
      />
    </div>
  );
}
