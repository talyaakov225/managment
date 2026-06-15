import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Trash2, GripVertical, Eye, EyeOff, ExternalLink, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminNavApi } from '../../services/adminApi';
import { useLang } from '../../context/LangContext';
import { Modal } from '../../components/Modal';
import type { NavItem } from '../../types/admin';

export function AdminNav() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [items, setItems] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newItem, setNewItem] = useState({ label_he: '', label_en: '', icon: 'FileText', href: '', visible: true });
  const [editingItem, setEditingItem] = useState<NavItem | null>(null);
  const [editForm, setEditForm] = useState({ label_he: '', label_en: '', icon: '', href: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await adminNavApi.getAll();
      setItems(data);
    } finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!newItem.label_he || !newItem.label_en || !newItem.href) return;
    try {
      const { data } = await adminNavApi.create(newItem);
      toast.success(t.admin.created);
      setShowCreate(false);
      setNewItem({ label_he: '', label_en: '', icon: 'FileText', href: '', visible: true });

      if (data._createdPageId) {
        toast.success(
          lang === 'he' ? 'הדף נוצר אוטומטית! מעבר לעורך התוכן...' : 'Page auto-created! Redirecting to editor...',
          { duration: 3000 },
        );
        navigate(`/admin/pages/${data._createdPageId}/edit`);
      } else {
        load();
      }
    } catch { toast.error(t.admin.createFailed); }
  }

  function openEdit(item: NavItem) {
    setEditingItem(item);
    setEditForm({
      label_he: item.label_he,
      label_en: item.label_en,
      icon: item.icon,
      href: item.href,
    });
  }

  async function handleSaveEdit() {
    if (!editingItem || !editForm.label_he || !editForm.href) return;
    try {
      await adminNavApi.update(editingItem.id, editForm);
      toast.success(t.common.saved);
      setEditingItem(null);
      load();
    } catch { toast.error(t.admin.updateFailed); }
  }

  async function toggleVisibility(item: NavItem) {
    try {
      await adminNavApi.update(item.id, { visible: !item.visible });
      load();
    } catch { toast.error(t.admin.updateFailed); }
  }

  async function handleDelete(id: string) {
    if (!confirm(t.admin.deleteNavConfirm)) return;
    try {
      await adminNavApi.delete(id);
      toast.success(t.admin.deleted);
      load();
    } catch { toast.error(t.admin.deleteFailed); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  function renderNavRow(item: NavItem, isChild = false) {
    const padding = isChild ? 'p-3' : 'p-4';
    const textSize = isChild ? 'text-sm text-slate-700 dark:text-slate-300' : 'text-sm font-medium text-slate-900 dark:text-white';
    const iconSize = isChild ? 'w-3.5 h-3.5' : 'w-4 h-4';

    return (
      <div className={`card ${padding} flex items-center gap-4 ${!item.visible ? 'opacity-50' : ''}`}>
        {isChild ? (
          <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
        ) : (
          <GripVertical className="w-4 h-4 text-slate-300 shrink-0 cursor-grab" />
        )}
        <div className="flex-1 min-w-0">
          <p className={textSize}>{item.label_he} / {item.label_en}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-400">{item.icon}</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
            <span className="text-xs text-primary-500 font-mono">{item.href}</span>
          </div>
        </div>
        <button onClick={() => openEdit(item)} className={`btn-ghost p-1.5 text-primary-500 hover:text-primary-700`}>
          <Edit3 className={iconSize} />
        </button>
        <button onClick={() => toggleVisibility(item)} className="btn-ghost p-1.5">
          {item.visible ? <Eye className={`${iconSize} text-emerald-500`} /> : <EyeOff className={`${iconSize} text-slate-400`} />}
        </button>
        <button onClick={() => handleDelete(item.id)} className="btn-ghost p-1.5 text-red-500">
          <Trash2 className={iconSize} />
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.admin.navigationEditor}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.admin.navigationDesc}</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" />{t.admin.addNavItem}
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id}>
              {renderNavRow(item)}
              {item.children.length > 0 && (
                <div className="ms-8 mt-2 space-y-2">
                  {item.children.map((child) => (
                    <div key={child.id}>{renderNavRow(child, true)}</div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {items.length === 0 && (
            <div className="card p-12 text-center">
              <p className="text-slate-400">{t.admin.noNavItems}</p>
            </div>
          )}
        </div>

        {/* Create Modal */}
        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={t.admin.addNavItem} size="sm">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.labelHe}</label>
                <input className="input" value={newItem.label_he} onChange={(e) => setNewItem((p) => ({ ...p, label_he: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.labelEn}</label>
                <input className="input" value={newItem.label_en} onChange={(e) => setNewItem((p) => ({ ...p, label_en: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.icon}</label>
              <input className="input" placeholder="FileText" value={newItem.icon} onChange={(e) => setNewItem((p) => ({ ...p, icon: e.target.value }))} />
              <p className="text-xs text-slate-400 mt-1">{t.admin.lucideIconName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.linkUrl}</label>
              <input className="input" dir="ltr" placeholder="/pages/about" value={newItem.href} onChange={(e) => setNewItem((p) => ({ ...p, href: e.target.value }))} />
              <p className="text-xs text-slate-400 mt-1">
                {lang === 'he'
                  ? 'כתובות בפורמט /pages/שם יוצרות דף חדש אוטומטית'
                  : 'URLs in /pages/name format auto-create a new page'}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">{t.common.cancel}</button>
              <button onClick={handleCreate} disabled={!newItem.label_he || !newItem.href} className="btn-primary flex-1">{t.common.create}</button>
            </div>
          </div>
        </Modal>

        {/* Edit Modal */}
        <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title={lang === 'he' ? 'עריכת פריט ניווט' : 'Edit Navigation Item'} size="sm">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.labelHe}</label>
                <input className="input" value={editForm.label_he} onChange={(e) => setEditForm((p) => ({ ...p, label_he: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.labelEn}</label>
                <input className="input" value={editForm.label_en} onChange={(e) => setEditForm((p) => ({ ...p, label_en: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.icon}</label>
              <input className="input" placeholder="FileText" value={editForm.icon} onChange={(e) => setEditForm((p) => ({ ...p, icon: e.target.value }))} />
              <p className="text-xs text-slate-400 mt-1">{t.admin.lucideIconName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.linkUrl}</label>
              <input className="input" dir="ltr" placeholder="/pages/about" value={editForm.href} onChange={(e) => setEditForm((p) => ({ ...p, href: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditingItem(null)} className="btn-secondary flex-1">{t.common.cancel}</button>
              <button onClick={handleSaveEdit} disabled={!editForm.label_he || !editForm.href} className="btn-primary flex-1">{t.common.save}</button>
            </div>
          </div>
        </Modal>
      </motion.div>
    </div>
  );
}
