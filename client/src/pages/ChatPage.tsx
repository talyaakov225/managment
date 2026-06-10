import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Send, MessageCircle, Search, LinkIcon, X, Users,
} from 'lucide-react';
import { chatApi, taskApi, projectApi } from '../services/api';
import type { ChatChannel, ChatMessage } from '../services/api';
import type { Task, Project } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import toast from 'react-hot-toast';

export function ChatPage() {
  const { user } = useAuth();
  const { t, dateLocale } = useLang();
  const [channel, setChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showTaskLink, setShowTaskLink] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskSearch, setTaskSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadChat();
    projectApi.getAll().then((r) => setAllProjects(r.data)).catch(() => {});
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function loadChat() {
    setLoading(true);
    try {
      const { data: channels } = await chatApi.getChannels();
      const general = channels.find((c) => c.isGeneral) || channels[0];
      if (general) {
        setChannel(general);
        await loadMessages(general.id);
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(() => loadMessages(general.id), 3000);
      }
    } catch {
      toast.error(t.chat.loadFailed || 'Failed to load chat');
    } finally { setLoading(false); }
  }

  async function loadMessages(channelId: string) {
    try {
      const { data } = await chatApi.getMessages(channelId);
      setMessages(data);
    } catch { /* silent */ }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function handleSend() {
    if (!newMessage.trim() || !channel || sending) return;
    setSending(true);
    try {
      const { data } = await chatApi.sendMessage(channel.id, {
        content: newMessage.trim(),
        taskId: selectedTaskId || undefined,
      });
      setMessages((prev) => [...prev, data]);
      setNewMessage('');
      setSelectedTaskId(null);
    } catch { toast.error(t.chat.sendFailed); }
    finally { setSending(false); }
  }

  async function loadTasksForLink() {
    if (allProjects.length > 0 && allTasks.length === 0) {
      try {
        const allT: Task[] = [];
        for (const p of allProjects.slice(0, 10)) {
          const { data } = await taskApi.getByProject(p.id);
          allT.push(...data);
        }
        setAllTasks(allT);
      } catch { /* silent */ }
    }
    setShowTaskLink(true);
  }

  const filteredTasks = taskSearch
    ? allTasks.filter((tk) => tk.title.toLowerCase().includes(taskSearch.toLowerCase()))
    : allTasks;

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return t.chat.today || 'היום';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return t.chat.yesterday || 'אתמול';
    return d.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' });
  }

  function shouldShowDate(i: number) {
    if (i === 0) return true;
    const prev = new Date(messages[i - 1].createdAt).toDateString();
    const curr = new Date(messages[i].createdAt).toDateString();
    return prev !== curr;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-4 shrink-0">
        <div className="w-11 h-11 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
          <MessageCircle className="w-6 h-6 text-primary-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">{t.chat.title}</h1>
          <p className="text-xs text-slate-400">
            {channel?.members?.length || 0} {t.chat.members}
          </p>
        </div>
        <button
          onClick={() => setShowMembers(true)}
          className="btn-secondary text-sm"
        >
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">{t.chat.members}</span>
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-slate-50 dark:bg-slate-950 space-y-1">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircle className="w-14 h-14 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-400">{t.chat.noMessages || 'אין הודעות עדיין. שלחו את ההודעה הראשונה!'}</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.authorId === user?.id;
          const showAvatar = i === 0 || messages[i - 1]?.authorId !== msg.authorId ||
            new Date(msg.createdAt).getTime() - new Date(messages[i - 1]?.createdAt).getTime() > 300000;
          const showDate = shouldShowDate(i);

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex items-center justify-center my-4">
                  <span className="px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {formatDate(msg.createdAt)}
                  </span>
                </div>
              )}

              {showAvatar && <div className="h-2" />}

              <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-2.5 max-w-[70%] ${isMe ? 'flex-row-reverse' : ''}`}>
                  {!isMe && showAvatar ? (
                    <div className="shrink-0 mt-auto">
                      <Avatar name={msg.author.name} size="sm" />
                    </div>
                  ) : (
                    !isMe && <div className="w-8 shrink-0" />
                  )}
                  <div className={isMe ? 'items-end' : 'items-start'}>
                    {showAvatar && !isMe && (
                      <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 mb-1 ms-2">{msg.author.name}</p>
                    )}
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      isMe
                        ? 'bg-primary-600 text-white rounded-ee-md'
                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700 rounded-es-md'
                    }`}>
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      {msg.task && (
                        <div className={`mt-2 px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${
                          isMe ? 'bg-primary-700/50 text-primary-100' : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                          <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                          <span className="font-medium truncate">{msg.task.title}</span>
                          <span className={`shrink-0 w-2 h-2 rounded-full ${
                            msg.task.status === 'DONE' ? 'bg-emerald-400' :
                            msg.task.status === 'IN_PROGRESS' ? 'bg-blue-400' :
                            msg.task.status === 'REVIEW' ? 'bg-amber-400' : 'bg-slate-400'
                          }`} />
                        </div>
                      )}
                    </div>
                    <p className={`text-[10px] text-slate-400 mt-0.5 ${isMe ? 'text-end me-1' : 'text-start ms-2'}`}>
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Task link indicator */}
      {selectedTaskId && (
        <div className="px-4 py-2 bg-primary-50 dark:bg-primary-950/30 border-t border-primary-100 dark:border-primary-900 flex items-center gap-2 shrink-0">
          <LinkIcon className="w-4 h-4 text-primary-500 shrink-0" />
          <span className="text-sm text-primary-700 dark:text-primary-300 truncate flex-1">
            {allTasks.find((tk) => tk.id === selectedTaskId)?.title}
          </span>
          <button onClick={() => setSelectedTaskId(null)} className="p-0.5 rounded hover:bg-primary-100 dark:hover:bg-primary-900/50">
            <X className="w-4 h-4 text-primary-500" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <button
            onClick={loadTasksForLink}
            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-500 transition-colors shrink-0"
            title={t.chat.linkTask}
          >
            <LinkIcon className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={t.chat.typeMessage}
            className="input flex-1"
            dir="auto"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="btn-primary p-2.5 rounded-xl shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Members Modal */}
      <Modal isOpen={showMembers} onClose={() => setShowMembers(false)} title={t.chat.members} size="sm">
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {channel?.members?.map((m) => (
            <div key={m.userId} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800">
              <Avatar name={m.user.name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {m.user.name}
                  {m.userId === user?.id && <span className="text-xs text-slate-400 ms-2">({t.common.you})</span>}
                </p>
              </div>
            </div>
          )) || (
            <p className="text-center text-sm text-slate-400 py-4">{t.chat.noMembers || 'אין חברים'}</p>
          )}
        </div>
      </Modal>

      {/* Link Task Modal */}
      <Modal isOpen={showTaskLink} onClose={() => setShowTaskLink(false)} title={t.chat.linkTask} size="sm">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" className="input ps-10 text-sm" placeholder={t.chat.searchTask} value={taskSearch} onChange={(e) => setTaskSearch(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {filteredTasks.map((tk) => (
              <button
                key={tk.id}
                onClick={() => { setSelectedTaskId(tk.id); setShowTaskLink(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-start"
              >
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  tk.status === 'DONE' ? 'bg-emerald-400' :
                  tk.status === 'IN_PROGRESS' ? 'bg-blue-400' :
                  tk.status === 'REVIEW' ? 'bg-amber-400' : 'bg-slate-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{tk.title}</p>
                  <p className="text-xs text-slate-400">{tk.project?.name}</p>
                </div>
              </button>
            ))}
            {filteredTasks.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-4">{t.chat.noTasks}</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
