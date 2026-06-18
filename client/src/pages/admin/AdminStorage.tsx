import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HardDrive, FileText, Trash2, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminChatApi } from '../../services/adminApi';
import { useLang } from '../../context/LangContext';

interface ChannelStats {
  id: string; name: string; isGeneral: boolean; createdAt: string;
  _count: { messages: number; members: number };
}

export function AdminStorage() {
  const { lang, dateLocale } = useLang();
  const he = lang === 'he';
  const [totalAttachments, setTotalAttachments] = useState(0);
  const [channels, setChannels] = useState<ChannelStats[]>([]);
  const [loading, setLoading] = useState(true);

  const l = {
    title: he ? 'ניהול אחסון' : 'Storage Management',
    desc: he ? 'קבצים מצורפים מהצ׳אט' : 'Chat attachment storage overview',
    totalFiles: he ? 'סה"כ קבצים' : 'Total Files',
    byChannel: he ? 'קבצים לפי ערוץ' : 'Files by Channel',
    channel: he ? 'ערוץ' : 'Channel',
    messages: he ? 'הודעות' : 'Messages',
    date: he ? 'תאריך' : 'Date',
    clean: he ? 'נקה לא בשימוש' : 'Clean Unused',
    cleanToast: he ? 'תכונה זו תהיה זמינה בקרוב' : 'This feature will be available soon',
    noData: he ? 'אין נתונים' : 'No data',
    note: he ? 'רשימת קבצים מפורטת תהיה זמינה עם endpoint ייעודי' : 'Detailed file listing will be available with a dedicated endpoint',
  };

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await adminChatApi.getStats();
      setTotalAttachments(data.totalAttachments);
      setChannels(data.channels);
    } catch {
      toast.error(he ? 'טעינה נכשלה' : 'Failed to load');
    } finally { setLoading(false); }
  }

  function handleClean() {
    toast(l.cleanToast, { icon: '🧹' });
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{l.title}</h1>
            <p className="text-sm text-slate-500 mt-1">{l.desc}</p>
          </div>
          <button onClick={handleClean} className="btn-secondary">
            <Trash2 className="w-4 h-4" />{l.clean}
          </button>
        </div>

        <div className="card p-5 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
            <HardDrive className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalAttachments}</p>
            <p className="text-sm text-slate-500">{l.totalFiles}</p>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">{l.byChannel}</h2>
        <p className="text-xs text-slate-400 mb-3 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />{l.note}</p>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
              <th className="text-start p-3 font-medium">{l.channel}</th>
              <th className="text-start p-3 font-medium">{l.messages}</th>
              <th className="text-start p-3 font-medium">{l.date}</th>
            </tr></thead>
            <tbody>
              {channels.length === 0 ? (
                <tr><td colSpan={3} className="p-8 text-center text-slate-400">{l.noData}</td></tr>
              ) : channels.map((ch) => (
                <tr key={ch.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <td className="p-3 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />{ch.name}
                  </td>
                  <td className="p-3 text-slate-500">{ch._count.messages}</td>
                  <td className="p-3 text-slate-400">{new Date(ch.createdAt).toLocaleDateString(dateLocale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
