import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, X, Clock, Bell } from 'lucide-react';
import { reminderApi, type ReminderItem } from '../services/api';
import { useLang } from '../context/LangContext';
import { Modal } from './Modal';
import toast from 'react-hot-toast';

const REMINDER_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#64748b',
];

interface ReminderPanelProps {
  open: boolean;
  onClose: () => void;
}

export function ReminderPanel({ open, onClose }: ReminderPanelProps) {
  const { lang } = useLang();
  const he = lang === 'he';
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) loadReminders();
  }, [open]);

  async function loadReminders() {
    try {
      const { data } = await reminderApi.getAll();
      setReminders(data.filter((r) => !r.dismissed));
    } catch { /* silent */ }
  }

  async function handleCreate() {
    if (!title.trim() || !date || !time) return;
    setCreating(true);
    try {
      const triggerAt = new Date(`${date}T${time}`).toISOString();
      await reminderApi.create({ title: title.trim(), content: content.trim() || undefined, color, triggerAt });
      setTitle(''); setContent(''); setColor('#3b82f6'); setDate(''); setTime('');
      setShowCreate(false);
      loadReminders();
      toast.success(he ? 'תזכורת נוצרה' : 'Reminder created');
    } catch { toast.error(he ? 'שגיאה ביצירת תזכורת' : 'Failed to create reminder'); }
    finally { setCreating(false); }
  }

  async function handleDelete(id: string) {
    try {
      await reminderApi.delete(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch { /* silent */ }
  }

  const upcoming = reminders.filter((r) => !r.triggered);
  const past = reminders.filter((r) => r.triggered);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="fixed bottom-24 end-6 z-50 w-80 bg-white dark:bg-slate-900 shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary-500" />
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                {he ? 'תזכורות' : 'Reminders'}
              </h3>
              {upcoming.length > 0 && (
                <span className="text-[10px] bg-primary-100 dark:bg-primary-950 text-primary-600 px-1.5 py-0.5 rounded-full font-medium">
                  {upcoming.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowCreate(true)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Plus className="w-4 h-4 text-slate-500" />
              </button>
              <button onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto">
            {reminders.length === 0 ? (
              <div className="py-10 text-center">
                <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400">{he ? 'אין תזכורות' : 'No reminders'}</p>
                <button onClick={() => setShowCreate(true)}
                  className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium">
                  {he ? '+ צור תזכורת' : '+ Create reminder'}
                </button>
              </div>
            ) : (
              <div className="p-2 space-y-1.5">
                {upcoming.length > 0 && (
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 pt-1">
                    {he ? 'ממתינות' : 'Upcoming'}
                  </p>
                )}
                {upcoming.map((r) => (
                  <ReminderRow key={r.id} reminder={r} onDelete={handleDelete} he={he} />
                ))}
                {past.length > 0 && (
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 pt-2">
                    {he ? 'עברו' : 'Past'}
                  </p>
                )}
                {past.map((r) => (
                  <ReminderRow key={r.id} reminder={r} onDelete={handleDelete} he={he} past />
                ))}
              </div>
            )}
          </div>

          {/* Create Modal */}
          <Modal isOpen={showCreate} onClose={() => setShowCreate(false)}
            title={he ? 'תזכורת חדשה' : 'New Reminder'} size="sm">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {he ? 'כותרת' : 'Title'}
                </label>
                <input type="text" className="input" value={title}
                  onChange={(e) => setTitle(e.target.value)} autoFocus dir="auto" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {he ? 'תוכן (אופציונלי)' : 'Content (optional)'}
                </label>
                <textarea className="input resize-none" rows={2} value={content}
                  onChange={(e) => setContent(e.target.value)} dir="auto" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {he ? 'תאריך' : 'Date'}
                  </label>
                  <input type="date" className="input text-sm" value={date}
                    onChange={(e) => setDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {he ? 'שעה' : 'Time'}
                  </label>
                  <input type="time" className="input text-sm" value={time}
                    onChange={(e) => setTime(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {he ? 'צבע' : 'Color'}
                </label>
                <div className="flex gap-2">
                  {REMINDER_COLORS.map((c) => (
                    <button key={c} onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${
                        color === c ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900 scale-110' : ''
                      }`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
                  {he ? 'ביטול' : 'Cancel'}
                </button>
                <button onClick={handleCreate}
                  disabled={!title.trim() || !date || !time || creating}
                  className="btn-primary flex-1">
                  {creating ? (he ? 'יוצר...' : 'Creating...') : (he ? 'צור תזכורת' : 'Create')}
                </button>
              </div>
            </div>
          </Modal>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ReminderRow({ reminder, onDelete, he, past }: {
  reminder: ReminderItem; onDelete: (id: string) => void; he: boolean; past?: boolean;
}) {
  const dt = new Date(reminder.triggerAt);
  return (
    <div className={`flex items-start gap-2.5 p-2.5 rounded-xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${past ? 'opacity-60' : ''}`}>
      <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: reminder.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{reminder.title}</p>
        {reminder.content && (
          <p className="text-xs text-slate-500 truncate mt-0.5">{reminder.content}</p>
        )}
        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {dt.toLocaleDateString(he ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short' })}
          {' '}
          {dt.toLocaleTimeString(he ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <button onClick={() => onDelete(reminder.id)}
        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors shrink-0">
        <Trash2 className="w-3.5 h-3.5 text-red-400" />
      </button>
    </div>
  );
}
