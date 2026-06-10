import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminSettingsApi } from '../../services/adminApi';
import { useLang } from '../../context/LangContext';
import { Modal } from '../../components/Modal';
import type { SystemSetting } from '../../types/admin';

export function AdminSettings() {
  const { t, lang } = useLang();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [newSetting, setNewSetting] = useState({ key: '', value: '', type: 'string', group: 'general', label_he: '', label_en: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await adminSettingsApi.getAll();
      setSettings(data);
      const editMap: Record<string, string> = {};
      data.forEach((s) => { editMap[s.id] = s.value; });
      setEditing(editMap);
    } finally { setLoading(false); }
  }

  async function handleSave(setting: SystemSetting) {
    const newValue = editing[setting.id];
    if (newValue === setting.value) return;
    try {
      await adminSettingsApi.update(setting.id, newValue);
      toast.success(t.common.saved);
      load();
    } catch { toast.error(t.admin.updateFailed); }
  }

  async function handleCreate() {
    if (!newSetting.key || !newSetting.value) return;
    try {
      await adminSettingsApi.create(newSetting);
      toast.success(t.admin.created);
      setShowCreate(false);
      setNewSetting({ key: '', value: '', type: 'string', group: 'general', label_he: '', label_en: '' });
      load();
    } catch { toast.error(t.admin.createFailed); }
  }

  async function handleDelete(id: string) {
    if (!confirm(t.admin.deleteSettingConfirm)) return;
    try {
      await adminSettingsApi.delete(id);
      toast.success(t.admin.deleted);
      load();
    } catch { toast.error(t.admin.deleteFailed); }
  }

  const groups = settings.reduce<Record<string, SystemSetting[]>>((acc, s) => {
    (acc[s.group] ??= []).push(s);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.admin.systemSettings}</h1>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" />{t.admin.addSetting}
          </button>
        </div>

        {Object.entries(groups).map(([group, groupSettings]) => (
          <div key={group} className="mb-8">
            <h2 className="text-sm font-bold uppercase text-slate-400 mb-3">{group}</h2>
            <div className="space-y-3">
              {groupSettings.map((setting) => (
                <div key={setting.id} className="card p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {(lang === 'he' ? setting.label_he : setting.label_en) || setting.key}
                      </p>
                      <p className="text-xs text-slate-400 font-mono">{setting.key}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded">{setting.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    {setting.type === 'boolean' ? (
                      <button
                        onClick={() => { setEditing((p) => ({ ...p, [setting.id]: editing[setting.id] === 'true' ? 'false' : 'true' })); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          editing[setting.id] === 'true'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {editing[setting.id] === 'true' ? 'ON' : 'OFF'}
                      </button>
                    ) : (
                      <input
                        className="input flex-1"
                        value={editing[setting.id] || ''}
                        onChange={(e) => setEditing((p) => ({ ...p, [setting.id]: e.target.value }))}
                      />
                    )}
                    <button
                      onClick={() => handleSave(setting)}
                      disabled={editing[setting.id] === setting.value}
                      className="btn-primary p-2"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(setting.id)} className="btn-ghost p-2 text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {settings.length === 0 && (
          <div className="card p-12 text-center">
            <p className="text-slate-400">{t.admin.noSettings}</p>
          </div>
        )}

        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={t.admin.addSetting} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Key</label>
              <input className="input" dir="ltr" placeholder="e.g. app.maintenance" value={newSetting.key} onChange={(e) => setNewSetting((p) => ({ ...p, key: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Value</label>
              <input className="input" value={newSetting.value} onChange={(e) => setNewSetting((p) => ({ ...p, value: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Type</label>
                <select className="input" value={newSetting.type} onChange={(e) => setNewSetting((p) => ({ ...p, type: e.target.value }))}>
                  <option value="string">string</option>
                  <option value="boolean">boolean</option>
                  <option value="number">number</option>
                  <option value="json">json</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Group</label>
                <input className="input" value={newSetting.group} onChange={(e) => setNewSetting((p) => ({ ...p, group: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.labelHe}</label>
                <input className="input" value={newSetting.label_he} onChange={(e) => setNewSetting((p) => ({ ...p, label_he: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.admin.labelEn}</label>
                <input className="input" value={newSetting.label_en} onChange={(e) => setNewSetting((p) => ({ ...p, label_en: e.target.value }))} />
              </div>
            </div>
            <button onClick={handleCreate} disabled={!newSetting.key} className="btn-primary w-full">{t.common.create}</button>
          </div>
        </Modal>
      </motion.div>
    </div>
  );
}
