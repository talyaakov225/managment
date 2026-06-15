import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Pencil, Trash2, FolderKanban, Users, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminProjectsApi } from '../../services/adminApi';
import { useLang } from '../../context/LangContext';
import { Modal } from '../../components/Modal';

interface AdminProject {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  owner: { id: string; name: string; email: string };
  _count: { tasks: number; members: number };
  createdAt: string;
  updatedAt: string;
}

export function AdminProjects() {
  const { lang, dateLocale } = useLang();
  const he = lang === 'he';
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<AdminProject | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await adminProjectsApi.getAll();
      setProjects(data);
    } finally { setLoading(false); }
  }

  async function handleSaveEdit() {
    if (!editingProject || !editName.trim()) return;
    try {
      await adminProjectsApi.update(editingProject.id, { name: editName.trim(), description: editDesc.trim() || null });
      toast.success(he ? 'הפרויקט עודכן' : 'Project updated');
      setEditingProject(null);
      load();
    } catch { toast.error(he ? 'העדכון נכשל' : 'Update failed'); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await adminProjectsApi.delete(deleteId);
      toast.success(he ? 'הפרויקט נמחק' : 'Project deleted');
      setDeleteId(null);
      load();
    } catch { toast.error(he ? 'המחיקה נכשלה' : 'Delete failed'); }
  }

  const filtered = search
    ? projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.owner.name.toLowerCase().includes(search.toLowerCase()))
    : projects;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {he ? 'ניהול פרויקטים' : 'Project Management'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {he ? 'צפייה, עריכה ומחיקה של פרויקטים במערכת' : 'View, edit, and delete projects'}
            </p>
          </div>
          <span className="text-sm text-slate-400">{projects.length} {he ? 'פרויקטים' : 'projects'}</span>
        </div>

        <div className="card p-4 mb-6">
          <div className="relative">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              className="input ps-11"
              placeholder={he ? 'חיפוש פרויקט...' : 'Search project...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((project) => (
              <div key={project.id} className="card p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                  <FolderKanban className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white">{project.name}</p>
                  {project.description && (
                    <p className="text-sm text-slate-500 truncate">{project.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Users className="w-3 h-3" /> {project.owner.name}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <ClipboardList className="w-3 h-3" /> {project._count.tasks} {he ? 'משימות' : 'tasks'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(project.createdAt).toLocaleDateString(dateLocale)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { setEditingProject(project); setEditName(project.name); setEditDesc(project.description || ''); }}
                    className="p-2 rounded-lg text-slate-400 hover:text-primary-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title={he ? 'ערוך' : 'Edit'}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(project.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title={he ? 'מחק' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                {he ? 'לא נמצאו פרויקטים' : 'No projects found'}
              </div>
            )}
          </div>
        )}

        {/* Edit Modal */}
        <Modal isOpen={!!editingProject} onClose={() => setEditingProject(null)} title={he ? 'עריכת פרויקט' : 'Edit Project'} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {he ? 'שם הפרויקט' : 'Project Name'}
              </label>
              <input type="text" className="input" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {he ? 'תיאור' : 'Description'}
              </label>
              <textarea className="input resize-none" rows={3} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditingProject(null)} className="btn-secondary flex-1">{he ? 'ביטול' : 'Cancel'}</button>
              <button onClick={handleSaveEdit} disabled={!editName.trim()} className="btn-primary flex-1">{he ? 'שמור' : 'Save'}</button>
            </div>
          </div>
        </Modal>

        {/* Delete Modal */}
        <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title={he ? 'מחיקת פרויקט' : 'Delete Project'} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              {he ? 'פעולה זו תמחק את הפרויקט וכל המשימות שבו לצמיתות. האם להמשיך?' : 'This will permanently delete the project and all its tasks. Continue?'}
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">{he ? 'ביטול' : 'Cancel'}</button>
              <button onClick={handleDelete} className="btn-danger flex-1">{he ? 'מחק' : 'Delete'}</button>
            </div>
          </div>
        </Modal>
      </motion.div>
    </div>
  );
}
