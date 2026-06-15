import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { stickyNoteApi, type StickyNote } from '../services/api';
import { useLang } from '../context/LangContext';
import toast from 'react-hot-toast';

const NOTE_COLORS = [
  { value: '#fef08a', label: 'Yellow' },
  { value: '#bbf7d0', label: 'Green' },
  { value: '#bfdbfe', label: 'Blue' },
  { value: '#fecaca', label: 'Red' },
  { value: '#e9d5ff', label: 'Purple' },
  { value: '#fed7aa', label: 'Orange' },
  { value: '#fce7f3', label: 'Pink' },
  { value: '#ffffff', label: 'White' },
];

interface StickyNotesProps {
  open: boolean;
  onClose: () => void;
}

export function StickyNotes({ open, onClose }: StickyNotesProps) {
  const { lang } = useLang();
  const he = lang === 'he';
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      stickyNoteApi.getAll().then(({ data }) => {
        setNotes(data);
        setLoading(false);
        if (data.length === 0) createNote();
      }).catch(() => setLoading(false));
    }
  }, [open]);

  useEffect(() => {
    if (open && textareaRef.current) textareaRef.current.focus();
  }, [open, activeIdx]);

  const activeNote = notes[activeIdx];

  async function createNote(color?: string) {
    try {
      const { data } = await stickyNoteApi.create({ color: color || '#fef08a' });
      setNotes((prev) => [...prev, data]);
      setActiveIdx(notes.length);
    } catch { toast.error(he ? 'שגיאה ביצירת פתק' : 'Failed to create note'); }
  }

  async function deleteNote(id: string) {
    try {
      await stickyNoteApi.delete(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      setActiveIdx((i) => Math.max(0, Math.min(i, notes.length - 2)));
    } catch { toast.error(he ? 'שגיאה במחיקה' : 'Failed to delete'); }
  }

  function updateContent(content: string) {
    if (!activeNote) return;
    setNotes((prev) => prev.map((n) => n.id === activeNote.id ? { ...n, content } : n));
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      stickyNoteApi.update(activeNote.id, { content }).catch(() => {});
    }, 500);
  }

  function updateColor(color: string) {
    if (!activeNote) return;
    setNotes((prev) => prev.map((n) => n.id === activeNote.id ? { ...n, color } : n));
    stickyNoteApi.update(activeNote.id, { color }).catch(() => {});
  }

  function goPrev() { setActiveIdx((i) => Math.max(0, i - 1)); }
  function goNext() { setActiveIdx((i) => Math.min(notes.length - 1, i + 1)); }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="fixed bottom-24 end-6 z-50 w-72 shadow-2xl rounded-2xl overflow-hidden"
          style={{ backgroundColor: activeNote?.color || '#fef08a' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-black/5">
            <div className="flex items-center gap-1">
              <button onClick={goPrev} disabled={activeIdx <= 0}
                className="p-1 rounded hover:bg-black/10 disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-black/60 min-w-[40px] text-center">
                {notes.length > 0 ? `${activeIdx + 1}/${notes.length}` : '0/0'}
              </span>
              <button onClick={goNext} disabled={activeIdx >= notes.length - 1}
                className="p-1 rounded hover:bg-black/10 disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-0.5">
              <button onClick={() => createNote(activeNote?.color)}
                className="p-1 rounded hover:bg-black/10 transition-colors" title={he ? 'פתק חדש' : 'New note'}>
                <Plus className="w-4 h-4" />
              </button>
              {activeNote && notes.length > 1 && (
                <button onClick={() => deleteNote(activeNote.id)}
                  className="p-1 rounded hover:bg-red-200 transition-colors" title={he ? 'מחק' : 'Delete'}>
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                </button>
              )}
              <button onClick={onClose}
                className="p-1 rounded hover:bg-black/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-3 pb-2">
            <textarea
              ref={textareaRef}
              value={activeNote?.content || ''}
              onChange={(e) => updateContent(e.target.value)}
              placeholder={he ? 'כתוב כאן...' : 'Write here...'}
              className="w-full h-40 resize-none bg-transparent border-none outline-none text-sm leading-relaxed text-slate-800 placeholder:text-black/30"
              dir="auto"
            />
          </div>

          {/* Color Picker */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-black/5">
            {NOTE_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => updateColor(c.value)}
                className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                  activeNote?.color === c.value ? 'border-black/40 scale-110' : 'border-black/10'
                }`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
