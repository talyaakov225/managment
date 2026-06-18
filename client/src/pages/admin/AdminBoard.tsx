import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, GripVertical, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminBoardApi } from '../../services/adminApi';
import { useLang } from '../../context/LangContext';
import { Modal } from '../../components/Modal';
import type { BoardStatus, BoardPriority, Category } from '../../types/admin';

type Tab = 'statuses' | 'priorities' | 'categories';

const defaultStatus = { key: '', label_he: '', label_en: '', color: 'text-slate-600', bgColor: 'bg-slate-100' };
const defaultPriority = { key: '', label_he: '', label_en: '', color: 'text-slate-500', dotColor: 'bg-slate-400' };
const defaultCategory = { name: '', color: '#6366f1' };

export function AdminBoard() {
  const { t } = useLang();
  const admin = t.admin as Record<string, string | undefined>;
  const editStatusTitle = admin.editStatus ?? 'Edit Status';
  const editPriorityTitle = admin.editPriority ?? 'Edit Priority';
  const editCategoryTitle = admin.editCategory ?? 'Edit Category';
  const reorderSaved = admin.reorderSaved ?? 'Order saved';

  const [tab, setTab] = useState<Tab>('statuses');
  const [statuses, setStatuses] = useState<BoardStatus[]>([]);
  const [priorities, setPriorities] = useState<BoardPriority[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusModal, setStatusModal] = useState(false);
  const [priorityModal, setPriorityModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [editingPriorityId, setEditingPriorityId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  const [statusForm, setStatusForm] = useState(defaultStatus);
  const [priorityForm, setPriorityForm] = useState(defaultPriority);
  const [categoryForm, setCategoryForm] = useState(defaultCategory);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [s, p, c] = await Promise.all([adminBoardApi.getStatuses(), adminBoardApi.getPriorities(), adminBoardApi.getCategories()]);
      setStatuses(s.data);
      setPriorities(p.data);
      setCategories(c.data);
    } finally { setLoading(false); }
  }

  const dragCls = (i: number) =>
    `card p-4 flex items-center gap-4 transition-all cursor-grab active:cursor-grabbing ${
      dragIndex === i ? 'opacity-50' : ''
    } ${dragOverIndex === i && dragIndex !== i ? 'ring-2 ring-primary-400' : ''}`;

  async function applyReorder<T extends { id: string }>(
    items: T[], setItems: (v: T[]) => void, from: number, to: number,
    api: (ids: string[]) => Promise<unknown>,
  ) {
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
    try {
      await api(next.map((x) => x.id));
      toast.success(reorderSaved);
    } catch {
      load();
      toast.error(t.admin.updateFailed);
    }
  }

  function finishDrag(reorder: (from: number, to: number) => void) {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      reorder(dragIndex, dragOverIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function openCreateStatus() {
    setEditingStatusId(null);
    setStatusForm(defaultStatus);
    setStatusModal(true);
  }

  function openEditStatus(s: BoardStatus) {
    setEditingStatusId(s.id);
    setStatusForm({ key: s.key, label_he: s.label_he, label_en: s.label_en, color: s.color, bgColor: s.bgColor });
    setStatusModal(true);
  }

  async function saveStatus() {
    if (!statusForm.key || !statusForm.label_he || !statusForm.label_en) return;
    try {
      if (editingStatusId) {
        await adminBoardApi.updateStatus(editingStatusId, statusForm);
        toast.success(t.common.saved);
      } else {
        await adminBoardApi.createStatus(statusForm);
        toast.success(t.admin.created);
      }
      setStatusModal(false);
      load();
    } catch { toast.error(editingStatusId ? t.admin.updateFailed : t.admin.createFailed); }
  }

  async function deleteStatus(id: string) {
    try {
      await adminBoardApi.deleteStatus(id);
      toast.success(t.admin.deleted);
      load();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || t.admin.deleteFailed);
    }
  }

  function openCreatePriority() {
    setEditingPriorityId(null);
    setPriorityForm(defaultPriority);
    setPriorityModal(true);
  }

  function openEditPriority(p: BoardPriority) {
    setEditingPriorityId(p.id);
    setPriorityForm({ key: p.key, label_he: p.label_he, label_en: p.label_en, color: p.color, dotColor: p.dotColor });
    setPriorityModal(true);
  }

  async function savePriority() {
    if (!priorityForm.key || !priorityForm.label_he || !priorityForm.label_en) return;
    try {
      if (editingPriorityId) {
        await adminBoardApi.updatePriority(editingPriorityId, priorityForm);
        toast.success(t.common.saved);
      } else {
        await adminBoardApi.createPriority(priorityForm);
        toast.success(t.admin.created);
      }
      setPriorityModal(false);
      load();
    } catch { toast.error(editingPriorityId ? t.admin.updateFailed : t.admin.createFailed); }
  }

  async function deletePriority(id: string) {
    try { await adminBoardApi.deletePriority(id); toast.success(t.admin.deleted); load(); }
    catch { toast.error(t.admin.deleteFailed); }
  }

  function openCreateCategory() {
    setEditingCategoryId(null);
    setCategoryForm(defaultCategory);
    setCategoryModal(true);
  }

  function openEditCategory(c: Category) {
    setEditingCategoryId(c.id);
    setCategoryForm({ name: c.name, color: c.color });
    setCategoryModal(true);
  }

  async function saveCategory() {
    if (!categoryForm.name) return;
    try {
      if (editingCategoryId) {
        await adminBoardApi.updateCategory(editingCategoryId, categoryForm);
        toast.success(t.common.saved);
      } else {
        await adminBoardApi.createCategory(categoryForm);
        toast.success(t.admin.created);
      }
      setCategoryModal(false);
      load();
    } catch { toast.error(editingCategoryId ? t.admin.updateFailed : t.admin.createFailed); }
  }

  async function deleteCategory(id: string) {
    try { await adminBoardApi.deleteCategory(id); toast.success(t.admin.deleted); load(); }
    catch { toast.error(t.admin.deleteFailed); }
  }

  const tabs = [
    { key: 'statuses' as Tab, label: t.admin.statuses },
    { key: 'priorities' as Tab, label: t.admin.priorities },
    { key: 'categories' as Tab, label: t.admin.categories },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.admin.boardConfig}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.admin.boardConfigDesc}</p>
        </div>

        <div className="flex gap-2 mb-6">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === tb.key
                  ? 'bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {tab === 'statuses' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button onClick={openCreateStatus} className="btn-primary">
                <Plus className="w-4 h-4" />{t.admin.addStatus}
              </button>
            </div>
            {statuses.map((s, i) => (
              <div
                key={s.id}
                draggable
                className={dragCls(i)}
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => { e.preventDefault(); setDragOverIndex(i); }}
                onDragEnd={() => finishDrag((f, t) => applyReorder(statuses, setStatuses, f, t, adminBoardApi.reorderStatuses))}
              >
                <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                <div className={`px-3 py-1 rounded-lg text-sm font-medium ${s.color} ${s.bgColor}`}>{s.key}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 dark:text-white">{s.label_he} / {s.label_en}</p>
                </div>
                {s.isDefault && <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{t.admin.default}</span>}
                <button onMouseDown={(e) => e.stopPropagation()} onClick={() => openEditStatus(s)} className="btn-ghost p-1.5 text-slate-500">
                  <Pencil className="w-4 h-4" />
                </button>
                {!s.isDefault && (
                  <button onMouseDown={(e) => e.stopPropagation()} onClick={() => deleteStatus(s.id)} className="btn-ghost p-1.5 text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'priorities' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button onClick={openCreatePriority} className="btn-primary">
                <Plus className="w-4 h-4" />{t.admin.addPriority}
              </button>
            </div>
            {priorities.map((p, i) => (
              <div
                key={p.id}
                draggable
                className={dragCls(i)}
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => { e.preventDefault(); setDragOverIndex(i); }}
                onDragEnd={() => finishDrag((f, t) => applyReorder(priorities, setPriorities, f, t, adminBoardApi.reorderPriorities))}
              >
                <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                <div className={`w-3 h-3 rounded-full ${p.dotColor}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{p.key}</p>
                  <p className="text-xs text-slate-500">{p.label_he} / {p.label_en}</p>
                </div>
                <button onMouseDown={(e) => e.stopPropagation()} onClick={() => openEditPriority(p)} className="btn-ghost p-1.5 text-slate-500">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onMouseDown={(e) => e.stopPropagation()} onClick={() => deletePriority(p.id)} className="btn-ghost p-1.5 text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === 'categories' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button onClick={openCreateCategory} className="btn-primary">
                <Plus className="w-4 h-4" />{t.admin.addCategory}
              </button>
            </div>
            {categories.map((c, i) => (
              <div
                key={c.id}
                draggable
                className={dragCls(i)}
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => { e.preventDefault(); setDragOverIndex(i); }}
                onDragEnd={() => finishDrag((f, t) => applyReorder(categories, setCategories, f, t, adminBoardApi.reorderCategories))}
              >
                <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{c.name}</p>
                  <p className="text-xs text-slate-400">{c._count?.tasks ?? 0} {t.common.tasks}</p>
                </div>
                <button onMouseDown={(e) => e.stopPropagation()} onClick={() => openEditCategory(c)} className="btn-ghost p-1.5 text-slate-500">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onMouseDown={(e) => e.stopPropagation()} onClick={() => deleteCategory(c.id)} className="btn-ghost p-1.5 text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Modal isOpen={statusModal} onClose={() => setStatusModal(false)} title={editingStatusId ? editStatusTitle : t.admin.addStatus} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Key</label>
              <input className="input" placeholder="e.g. IN_REVIEW" value={statusForm.key} onChange={(e) => setStatusForm((p) => ({ ...p, key: e.target.value.toUpperCase().replace(/\s/g, '_') }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.labelHe}</label>
                <input className="input" value={statusForm.label_he} onChange={(e) => setStatusForm((p) => ({ ...p, label_he: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.labelEn}</label>
                <input className="input" value={statusForm.label_en} onChange={(e) => setStatusForm((p) => ({ ...p, label_en: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.colorClass}</label>
                <input className="input" placeholder="text-blue-600" value={statusForm.color} onChange={(e) => setStatusForm((p) => ({ ...p, color: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.bgColorClass}</label>
                <input className="input" placeholder="bg-blue-50" value={statusForm.bgColor} onChange={(e) => setStatusForm((p) => ({ ...p, bgColor: e.target.value }))} />
              </div>
            </div>
            <button onClick={saveStatus} className="btn-primary w-full">{editingStatusId ? t.common.save : t.common.create}</button>
          </div>
        </Modal>

        <Modal isOpen={priorityModal} onClose={() => setPriorityModal(false)} title={editingPriorityId ? editPriorityTitle : t.admin.addPriority} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Key</label>
              <input className="input" placeholder="e.g. CRITICAL" value={priorityForm.key} onChange={(e) => setPriorityForm((p) => ({ ...p, key: e.target.value.toUpperCase().replace(/\s/g, '_') }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.labelHe}</label>
                <input className="input" value={priorityForm.label_he} onChange={(e) => setPriorityForm((p) => ({ ...p, label_he: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.labelEn}</label>
                <input className="input" value={priorityForm.label_en} onChange={(e) => setPriorityForm((p) => ({ ...p, label_en: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.colorClass}</label>
                <input className="input" placeholder="text-red-500" value={priorityForm.color} onChange={(e) => setPriorityForm((p) => ({ ...p, color: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.dotColorClass}</label>
                <input className="input" placeholder="bg-red-500" value={priorityForm.dotColor} onChange={(e) => setPriorityForm((p) => ({ ...p, dotColor: e.target.value }))} />
              </div>
            </div>
            <button onClick={savePriority} className="btn-primary w-full">{editingPriorityId ? t.common.save : t.common.create}</button>
          </div>
        </Modal>

        <Modal isOpen={categoryModal} onClose={() => setCategoryModal(false)} title={editingCategoryId ? editCategoryTitle : t.admin.addCategory} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.categoryName}</label>
              <input className="input" value={categoryForm.name} onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.color}</label>
              <input type="color" className="w-full h-10 rounded-lg cursor-pointer" value={categoryForm.color} onChange={(e) => setCategoryForm((p) => ({ ...p, color: e.target.value }))} />
            </div>
            <button onClick={saveCategory} className="btn-primary w-full">{editingCategoryId ? t.common.save : t.common.create}</button>
          </div>
        </Modal>
      </motion.div>
    </div>
  );
}
