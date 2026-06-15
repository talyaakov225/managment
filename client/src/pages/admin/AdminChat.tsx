import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MessageCircle, Trash2, AlertTriangle, Hash, Users,
  FileText, Loader2,
} from 'lucide-react';
import { adminChatApi } from '../../services/adminApi';
import { useLang } from '../../context/LangContext';
import { Modal } from '../../components/Modal';
import toast from 'react-hot-toast';

interface ChannelStats {
  id: string;
  name: string;
  isGeneral: boolean;
  createdAt: string;
  _count: { messages: number; members: number };
}

export function AdminChat() {
  const { lang, dateLocale } = useLang();
  const he = lang === 'he';
  const [channels, setChannels] = useState<ChannelStats[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [totalAttachments, setTotalAttachments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'clear_channel' | 'clear_all' | 'delete_channel';
    channelId?: string;
    channelName?: string;
  } | null>(null);

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    setLoading(true);
    try {
      const { data } = await adminChatApi.getStats();
      setChannels(data.channels);
      setTotalMessages(data.totalMessages);
      setTotalAttachments(data.totalAttachments);
    } catch {
      toast.error(he ? 'טעינה נכשלה' : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!confirmAction) return;
    const key = confirmAction.type + (confirmAction.channelId || '');
    setActionLoading(key);
    try {
      if (confirmAction.type === 'clear_all') {
        const { data } = await adminChatApi.clearAll();
        toast.success(he ? `${data.deleted} הודעות נמחקו` : `${data.deleted} messages deleted`);
      } else if (confirmAction.type === 'clear_channel' && confirmAction.channelId) {
        const { data } = await adminChatApi.clearChannel(confirmAction.channelId);
        toast.success(he ? `${data.deleted} הודעות נמחקו` : `${data.deleted} messages deleted`);
      } else if (confirmAction.type === 'delete_channel' && confirmAction.channelId) {
        await adminChatApi.deleteChannel(confirmAction.channelId);
        toast.success(he ? 'הערוץ נמחק' : 'Channel deleted');
      }
      setConfirmAction(null);
      loadStats();
    } catch {
      toast.error(he ? 'הפעולה נכשלה' : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  }

  const confirmMessages: Record<string, { title: string; desc: string }> = {
    clear_all: {
      title: he ? 'מחיקת כל ההודעות' : 'Delete All Messages',
      desc: he
        ? 'פעולה זו תמחק את כל ההודעות, קבצים מצורפים ותגובות מכל הערוצים. לא ניתן לבטל.'
        : 'This will permanently delete all messages, attachments, and reactions from all channels. Cannot be undone.',
    },
    clear_channel: {
      title: he ? `מחיקת הודעות מ-${confirmAction?.channelName || ''}` : `Clear messages from ${confirmAction?.channelName || ''}`,
      desc: he
        ? 'כל ההודעות, קבצים מצורפים ותגובות בערוץ זה יימחקו לצמיתות.'
        : 'All messages, attachments, and reactions in this channel will be permanently deleted.',
    },
    delete_channel: {
      title: he ? `מחיקת ערוץ ${confirmAction?.channelName || ''}` : `Delete channel ${confirmAction?.channelName || ''}`,
      desc: he
        ? 'הערוץ וכל תוכנו יימחקו לצמיתות. לא ניתן למחוק את הערוץ הכללי.'
        : 'The channel and all its content will be permanently deleted. The general channel cannot be deleted.',
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {he ? 'ניהול צ׳אט' : 'Chat Management'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {he ? 'מחיקת הודעות וניהול ערוצים — ניקוי נתוני בדיקה לפני העלאה לאוויר.' : 'Delete messages and manage channels — clean up test data before going live.'}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary-100 dark:bg-primary-900/40">
              <MessageCircle className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalMessages}</p>
              <p className="text-xs text-slate-500">{he ? 'סה"כ הודעות' : 'Total Messages'}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/40">
              <Hash className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{channels.length}</p>
              <p className="text-xs text-slate-500">{he ? 'ערוצים' : 'Channels'}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/40">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalAttachments}</p>
              <p className="text-xs text-slate-500">{he ? 'קבצים מצורפים' : 'Attachments'}</p>
            </div>
          </div>
        </div>

        {/* Clear All */}
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl p-5 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-red-700 dark:text-red-400">
                  {he ? 'מחיקת כל ההודעות מכל הערוצים' : 'Delete all messages from all channels'}
                </h3>
                <p className="text-xs text-red-500 dark:text-red-400/80 mt-0.5">
                  {he ? 'פעולה זו אינה ניתנת לביטול' : 'This action cannot be undone'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setConfirmAction({ type: 'clear_all' })}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {he ? 'מחק הכל' : 'Delete All'}
            </button>
          </div>
        </div>

        {/* Channels list */}
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          {he ? 'ערוצים' : 'Channels'}
        </h2>
        <div className="space-y-3">
          {channels.map((ch) => (
            <div
              key={ch.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-4 flex-wrap"
            >
              <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                <div className={`p-2 rounded-lg ${ch.isGeneral ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
                  <Hash className={`w-4 h-4 ${ch.isGeneral ? 'text-emerald-600' : 'text-slate-500'}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    {ch.name}
                    {ch.isGeneral && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold">
                        {he ? 'כללי' : 'General'}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(ch.createdAt).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5" />
                  {ch._count.messages} {he ? 'הודעות' : 'messages'}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {ch._count.members} {he ? 'חברים' : 'members'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmAction({ type: 'clear_channel', channelId: ch.id, channelName: ch.name })}
                  disabled={ch._count.messages === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400 text-xs font-medium hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {he ? 'נקה הודעות' : 'Clear Messages'}
                </button>
                {!ch.isGeneral && (
                  <button
                    onClick={() => setConfirmAction({ type: 'delete_channel', channelId: ch.id, channelName: ch.name })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 text-red-500 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {he ? 'מחק ערוץ' : 'Delete Channel'}
                  </button>
                )}
              </div>
            </div>
          ))}

          {channels.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">{he ? 'אין ערוצים' : 'No channels'}</p>
          )}
        </div>
      </motion.div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction ? confirmMessages[confirmAction.type]?.title : ''}
        size="sm"
      >
        {confirmAction && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">
                {confirmMessages[confirmAction.type]?.desc}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)} className="btn-secondary flex-1">
                {he ? 'ביטול' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirm}
                disabled={!!actionLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {he ? 'מחק' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
