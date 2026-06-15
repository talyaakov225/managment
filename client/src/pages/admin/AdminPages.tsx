import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit3, Eye, EyeOff, FileText, Link2, Check, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminPagesApi, adminNavApi } from '../../services/adminApi';
import { useLang } from '../../context/LangContext';
import { Modal } from '../../components/Modal';
import type { CustomPage, NavItem } from '../../types/admin';

export function AdminPages() {
  const { t, lang, dateLocale } = useLang();
  const navigate = useNavigate();
  const [pages, setPages] = useState<CustomPage[]>([]);
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newPage, setNewPage] = useState({ slug: '', title_he: '', title_en: '', description: '' });
  const [linkingPage, setLinkingPage] = useState<CustomPage | null>(null);
  const [linkMode, setLinkMode] = useState<'existing' | 'new'>('existing');
  const [selectedNavId, setSelectedNavId] = useState('');
  const [newNavItem, setNewNavItem] = useState({ icon: 'FileText' });
  const [linking, setLinking] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [pagesRes, navRes] = await Promise.all([adminPagesApi.getAll(), adminNavApi.getAll()]);
      setPages(pagesRes.data);
      setNavItems(flattenNav(navRes.data));
    } finally { setLoading(false); }
  }

  function flattenNav(items: NavItem[]): NavItem[] {
    const result: NavItem[] = [];
    for (const item of items) {
      result.push(item);
      if (item.children) result.push(...item.children);
    }
    return result;
  }

  function getLinkedNavItem(page: CustomPage): NavItem | undefined {
    const pageUrl = `/pages/${page.slug}`;
    return navItems.find((n) => n.href === pageUrl || n.href === `pages/${page.slug}`);
  }

  function getAvailableNavItems(): NavItem[] {
    const usedHrefs = new Set(pages.map((p) => `/pages/${p.slug}`));
    return navItems.filter((n) => !usedHrefs.has(n.href) && n.href.startsWith('/pages/'));
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

  function openLinkModal(page: CustomPage) {
    setLinkingPage(page);
    setLinkMode('new');
    setSelectedNavId('');
    setNewNavItem({ icon: 'FileText' });
  }

  async function handleLinkExisting() {
    if (!linkingPage || !selectedNavId || linking) return;
    setLinking(true);
    try {
      await adminNavApi.update(selectedNavId, { href: `/pages/${linkingPage.slug}` });
      toast.success(lang === 'he' ? 'הדף שויך לתפריט!' : 'Page linked to menu!');
      setLinkingPage(null);
      load();
    } catch { toast.error(t.admin.updateFailed); }
    finally { setLinking(false); }
  }

  async function handleLinkNew() {
    if (!linkingPage || linking) return;
    setLinking(true);
    try {
      await adminNavApi.create({
        label_he: linkingPage.title_he || linkingPage.slug,
        label_en: linkingPage.title_en || linkingPage.slug,
        icon: newNavItem.icon || 'FileText',
        href: `/pages/${linkingPage.slug}`,
        visible: true,
      } as NavItem);
      toast.success(lang === 'he' ? 'פריט ניווט חדש נוצר ושויך לדף!' : 'New nav item created and linked!');
      setLinkingPage(null);
      load();
    } catch (err: unknown) {
      console.error('Link new nav item failed:', err);
      const resp = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
      toast.error(resp?.error || resp?.message || t.admin.createFailed);
    } finally {
      setLinking(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const availableNavItems = getAvailableNavItems();

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.admin.pageBuilder}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.admin.pagesDesc}</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" />{t.admin.newPage}
          </button>
        </div>

        <div className="space-y-3">
          {pages.map((page) => {
            const linked = getLinkedNavItem(page);
            return (
              <div key={page.id} className="card p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/30 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white">{page.title_he}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs text-primary-500 font-mono">/{page.slug}</span>
                    <span className="text-xs text-slate-400">{page._count?.blocks ?? 0} {t.admin.blocks}</span>
                    <span className="text-xs text-slate-400">{new Date(page.updatedAt).toLocaleDateString(dateLocale)}</span>
                    {linked ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                        <Check className="w-3 h-3" />
                        {lang === 'he' ? 'מקושר לתפריט' : 'Linked'}
                      </span>
                    ) : (
                      <button
                        onClick={() => openLinkModal(page)}
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                      >
                        <Link2 className="w-3 h-3" />
                        {lang === 'he' ? 'שייך לתפריט' : 'Link to menu'}
                      </button>
                    )}
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
            );
          })}

          {pages.length === 0 && (
            <div className="card p-12 text-center">
              <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500">{t.admin.noPages}</p>
            </div>
          )}
        </div>

        {/* Create Page Modal */}
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

        {/* Link to Menu Modal */}
        <Modal isOpen={!!linkingPage} onClose={() => setLinkingPage(null)} title={lang === 'he' ? 'שיוך דף לתפריט' : 'Link Page to Menu'} size="sm">
          {linkingPage && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{linkingPage.title_he}</p>
                <p className="text-xs text-primary-500 font-mono mt-0.5">/pages/{linkingPage.slug}</p>
              </div>

              {/* Tab selector */}
              <div className="flex gap-2">
                <button
                  onClick={() => setLinkMode('new')}
                  className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${linkMode === 'new' ? 'bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  {lang === 'he' ? 'צור קישור חדש בתפריט' : 'Create new menu link'}
                </button>
                {availableNavItems.length > 0 && (
                  <button
                    onClick={() => setLinkMode('existing')}
                    className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${linkMode === 'existing' ? 'bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    {lang === 'he' ? 'שייך לקישור קיים' : 'Link to existing'}
                  </button>
                )}
              </div>

              {linkMode === 'new' ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">
                    {lang === 'he'
                      ? 'ייווצר פריט ניווט חדש בתפריט הצדדי עם שם הדף.'
                      : 'A new nav item will be created in the sidebar with the page name.'}
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      {lang === 'he' ? 'אייקון' : 'Icon'}
                    </label>
                    <input
                      className="input text-sm"
                      placeholder="FileText"
                      value={newNavItem.icon}
                      onChange={(e) => setNewNavItem({ icon: e.target.value })}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      {lang === 'he' ? 'שם אייקון מ-Lucide (למשל: FileText, Star, Info)' : 'Lucide icon name (e.g. FileText, Star, Info)'}
                    </p>
                  </div>
                  <button onClick={handleLinkNew} disabled={linking} className="btn-primary w-full">
                    <Navigation className="w-4 h-4" />
                    {linking ? (lang === 'he' ? 'יוצר...' : 'Creating...') : (lang === 'he' ? 'צור והוסף לתפריט' : 'Create & Add to Menu')}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">
                    {lang === 'he'
                      ? 'בחר פריט ניווט קיים שעדיין לא מקושר לדף — הכתובת שלו תתעדכן אוטומטית.'
                      : 'Pick an existing nav item not yet linked to a page — its URL will be updated.'}
                  </p>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {availableNavItems.map((nav) => (
                      <label
                        key={nav.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedNavId === nav.id ? 'border-primary-400 bg-primary-50 dark:bg-primary-950/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                      >
                        <input
                          type="radio"
                          name="navLink"
                          checked={selectedNavId === nav.id}
                          onChange={() => setSelectedNavId(nav.id)}
                          className="w-4 h-4 text-primary-600"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{nav.label_he}</p>
                          <p className="text-xs text-slate-400 font-mono">{nav.href}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <button onClick={handleLinkExisting} disabled={!selectedNavId || linking} className="btn-primary w-full">
                    <Link2 className="w-4 h-4" />
                    {linking ? (lang === 'he' ? 'משייך...' : 'Linking...') : (lang === 'he' ? 'שייך לפריט הנבחר' : 'Link to selected')}
                  </button>
                </div>
              )}
            </div>
          )}
        </Modal>
      </motion.div>
    </div>
  );
}
