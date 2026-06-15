import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Clock } from 'lucide-react';
import { useLang } from '../context/LangContext';
import type { ReminderItem } from '../services/api';

interface ReminderPopupProps {
  reminders: ReminderItem[];
  onDismiss: (id: string) => void;
}

export function ReminderPopup({ reminders, onDismiss }: ReminderPopupProps) {
  const { lang } = useLang();
  const he = lang === 'he';

  return (
    <div className="fixed top-16 end-4 z-[200] flex flex-col items-end gap-3 pointer-events-none">
      <AnimatePresence>
        {reminders.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="pointer-events-auto w-[340px] max-w-[90vw] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border overflow-hidden"
            style={{ borderColor: r.color }}
          >
            <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ backgroundColor: r.color + '12' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: r.color + '22' }}>
                <Bell className="w-4 h-4" style={{ color: r.color }} />
              </div>
              <p className="flex-1 text-xs font-semibold" style={{ color: r.color }}>
                {he ? 'תזכורת' : 'Reminder'}
              </p>
              <button onClick={() => onDismiss(r.id)}
                className="p-1 rounded-lg hover:bg-black/10 transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="px-4 py-3">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-0.5" dir="auto">{r.title}</h4>
              {r.content && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2" dir="auto">{r.content}</p>
              )}
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(r.triggerAt).toLocaleString(he ? 'he-IL' : 'en-US', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
            <div className="px-4 pb-3">
              <button onClick={() => onDismiss(r.id)}
                className="w-full py-2 rounded-xl text-sm font-medium text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: r.color }}>
                {he ? 'הבנתי' : 'Dismiss'}
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
