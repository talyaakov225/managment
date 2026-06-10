import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit3, Eye, EyeOff, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminPagesApi } from '../../services/adminApi';
import { useLang } from '../../context/LangContext';
import { Modal } from '../../components/Modal';
import type { CustomPage } from '../../types/admin';

export function AdminPages() {
  const { t, dateLocale } = useLang();
  const navigate = useNavigate();
  const [pages, setPages] = useState<CustomPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newPage, setNewPage] = useState({ slug: '', title_he: '', title_en: '', description: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await adminPagesApi.getAll();
      setPages(data);
    } finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!newPage.slug || !newPage.title_he || !newPage.title_en) return;
    try {
      const { data } = await adminPagesApi.create(newPage);
      toast.success(t.admin.created);
      setShowCreate(false);
      setNewPage({ slug: '', title_he: '', title_en: '', description: '' });
      navigate(`/admin/pages/${data.id}/edit`);
    } catch { toast.error(t.admin.createFailed); }
  }

  async function togglePublish(page: CustomPage) {
    try {
      await adminPagesApi.update(page.id, { isPublished: !page.isPublished });
      load();
    } catch { toast.error(t.admin.updateFailed); }
  }

  async function handleDelete(id: string) {
    if (!confirm(t.admin.deletePageConfirm)) return;
    try {
      await adminPagesApi.delete(id);
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

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.admin.pageBuilder}</h1>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" />{t.admin.newPage}
          </button>
        </div>

        <div className="space-y-3">
          {pages.map((page) => (
            <div key={page.id} className="card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/30 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-primary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 dark:text-white">{page.title_he}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-primary-500 font-mono">/{page.slug}</span>
                  <span className="text-xs text-slate-400">{page._count?.blocks ?? 0} {t.admin.blocks}</span>
                  <span className="text-xs text-slate-400">{new Date(page.updatedAt).toLocaleDateString(dateLocale)}</span>
                </div>
              </div>
              <button onClick={() => togglePublish(page)} className="btn-ghost p-1.5">
                {page.isPublished ? <Eye className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
              </button>
              <button onClick={() => navigate(`/admin/pages/${page.id}/edit`)} className="btn-ghost p-1.5">
                <Edit3 className="w-4 h-4 text-primary-500" />
              </button>
              <button onClick={() => handleDelete(page.id)} className="btn-ghost p-1.5 text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {pages.length === 0 && (
            <div className="card p-12 text-center">
              <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500">{t.admin.noPages}</p>
            </div>
          )}
        </div>

        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={t.admin.newPage} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Slug</label>
              <input
                className="input"
                dir="ltr"
                placeholder="e.g. about-us"
                value={newPage.slug}
                onChange={(e) => setNewPage((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s/g, '-').replace(/[^a-z0-9-]/g, '') }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.titleHe}</label>
                <input className="input" value={newPage.title_he} onChange={(e) => setNewPage((p) => ({ ...p, title_he: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.titleEn}</label>
                <input className="input" value={newPage.title_en} onChange={(e) => setNewPage((p) => ({ ...p, title_en: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.descriptionOptional}</label>
              <textarea className="input resize-none" rows={2} value={newPage.description} onChange={(e) => setNewPage((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <button onClick={handleCreate} disabled={!newPage.slug || !newPage.title_he || !newPage.title_en} className="btn-primary w-full">{t.common.create}</button>
          </div>
        </Modal>
      </motion.div>
    </div>
  );
}
