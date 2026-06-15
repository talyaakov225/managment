import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, GripVertical, Palette } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminBoardApi } from '../../services/adminApi';
import { useLang } from '../../context/LangContext';
import { Modal } from '../../components/Modal';
import type { BoardStatus, BoardPriority, Category } from '../../types/admin';

type Tab = 'statuses' | 'priorities' | 'categories';

export function AdminBoard() {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>('statuses');
  const [statuses, setStatuses] = useState<BoardStatus[]>([]);
  const [priorities, setPriorities] = useState<BoardPriority[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNewStatus, setShowNewStatus] = useState(false);
  const [showNewPriority, setShowNewPriority] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);

  const [newStatus, setNewStatus] = useState({ key: '', label_he: '', label_en: '', color: 'text-slate-600', bgColor: 'bg-slate-100' });
  const [newPriority, setNewPriority] = useState({ key: '', label_he: '', label_en: '', color: 'text-slate-500', dotColor: 'bg-slate-400' });
  const [newCategory, setNewCategory] = useState({ name: '', color: '#6366f1' });

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

  async function createStatus() {
    if (!newStatus.key || !newStatus.label_he || !newStatus.label_en) return;
    try {
      await adminBoardApi.createStatus(newStatus);
      toast.success(t.admin.created);
      setShowNewStatus(false);
      setNewStatus({ key: '', label_he: '', label_en: '', color: 'text-slate-600', bgColor: 'bg-slate-100' });
      load();
    } catch { toast.error(t.admin.createFailed); }
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

  async function createPriority() {
    if (!newPriority.key || !newPriority.label_he || !newPriority.label_en) return;
    try {
      await adminBoardApi.createPriority(newPriority);
      toast.success(t.admin.created);
      setShowNewPriority(false);
      setNewPriority({ key: '', label_he: '', label_en: '', color: 'text-slate-500', dotColor: 'bg-slate-400' });
      load();
    } catch { toast.error(t.admin.createFailed); }
  }

  async function deletePriority(id: string) {
    try { await adminBoardApi.deletePriority(id); toast.success(t.admin.deleted); load(); }
    catch { toast.error(t.admin.deleteFailed); }
  }

  async function createCategory() {
    if (!newCategory.name) return;
    try {
      await adminBoardApi.createCategory(newCategory);
      toast.success(t.admin.created);
      setShowNewCategory(false);
      setNewCategory({ name: '', color: '#6366f1' });
      load();
    } catch { toast.error(t.admin.createFailed); }
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
              <button onClick={() => setShowNewStatus(true)} className="btn-primary">
                <Plus className="w-4 h-4" />{t.admin.addStatus}
              </button>
            </div>
            {statuses.map((s) => (
              <div key={s.id} className="card p-4 flex items-center gap-4">
                <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                <div className={`px-3 py-1 rounded-lg text-sm font-medium ${s.color} ${s.bgColor}`}>{s.key}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 dark:text-white">{s.label_he} / {s.label_en}</p>
                </div>
                {s.isDefault && <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{t.admin.default}</span>}
                {!s.isDefault && (
                  <button onClick={() => deleteStatus(s.id)} className="btn-ghost p-1.5 text-red-500">
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
              <button onClick={() => setShowNewPriority(true)} className="btn-primary">
                <Plus className="w-4 h-4" />{t.admin.addPriority}
              </button>
            </div>
            {priorities.map((p) => (
              <div key={p.id} className="card p-4 flex items-center gap-4">
                <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                <div className={`w-3 h-3 rounded-full ${p.dotColor}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{p.key}</p>
                  <p className="text-xs text-slate-500">{p.label_he} / {p.label_en}</p>
                </div>
                <button onClick={() => deletePriority(p.id)} className="btn-ghost p-1.5 text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === 'categories' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button onClick={() => setShowNewCategory(true)} className="btn-primary">
                <Plus className="w-4 h-4" />{t.admin.addCategory}
              </button>
            </div>
            {categories.map((c) => (
              <div key={c.id} className="card p-4 flex items-center gap-4">
                <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{c.name}</p>
                  <p className="text-xs text-slate-400">{c._count?.tasks ?? 0} {t.common.tasks}</p>
                </div>
                <button onClick={() => deleteCategory(c.id)} className="btn-ghost p-1.5 text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Modal isOpen={showNewStatus} onClose={() => setShowNewStatus(false)} title={t.admin.addStatus} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Key</label>
              <input className="input" placeholder="e.g. IN_REVIEW" value={newStatus.key} onChange={(e) => setNewStatus((p) => ({ ...p, key: e.target.value.toUpperCase().replace(/\s/g, '_') }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.labelHe}</label>
                <input className="input" value={newStatus.label_he} onChange={(e) => setNewStatus((p) => ({ ...p, label_he: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.labelEn}</label>
                <input className="input" value={newStatus.label_en} onChange={(e) => setNewStatus((p) => ({ ...p, label_en: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.colorClass}</label>
                <input className="input" placeholder="text-blue-600" value={newStatus.color} onChange={(e) => setNewStatus((p) => ({ ...p, color: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.bgColorClass}</label>
                <input className="input" placeholder="bg-blue-50" value={newStatus.bgColor} onChange={(e) => setNewStatus((p) => ({ ...p, bgColor: e.target.value }))} />
              </div>
            </div>
            <button onClick={createStatus} className="btn-primary w-full">{t.common.create}</button>
          </div>
        </Modal>

        <Modal isOpen={showNewPriority} onClose={() => setShowNewPriority(false)} title={t.admin.addPriority} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Key</label>
              <input className="input" placeholder="e.g. CRITICAL" value={newPriority.key} onChange={(e) => setNewPriority((p) => ({ ...p, key: e.target.value.toUpperCase().replace(/\s/g, '_') }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.labelHe}</label>
                <input className="input" value={newPriority.label_he} onChange={(e) => setNewPriority((p) => ({ ...p, label_he: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.labelEn}</label>
                <input className="input" value={newPriority.label_en} onChange={(e) => setNewPriority((p) => ({ ...p, label_en: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.colorClass}</label>
                <input className="input" placeholder="text-red-500" value={newPriority.color} onChange={(e) => setNewPriority((p) => ({ ...p, color: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.dotColorClass}</label>
                <input className="input" placeholder="bg-red-500" value={newPriority.dotColor} onChange={(e) => setNewPriority((p) => ({ ...p, dotColor: e.target.value }))} />
              </div>
            </div>
            <button onClick={createPriority} className="btn-primary w-full">{t.common.create}</button>
          </div>
        </Modal>

        <Modal isOpen={showNewCategory} onClose={() => setShowNewCategory(false)} title={t.admin.addCategory} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.categoryName}</label>
              <input className="input" value={newCategory.name} onChange={(e) => setNewCategory((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.color}</label>
              <input type="color" className="w-full h-10 rounded-lg cursor-pointer" value={newCategory.color} onChange={(e) => setNewCategory((p) => ({ ...p, color: e.target.value }))} />
            </div>
            <button onClick={createCategory} className="btn-primary w-full">{t.common.create}</button>
          </div>
        </Modal>
      </motion.div>
    </div>
  );
}
