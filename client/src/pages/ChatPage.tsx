import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, MessageCircle, Search, LinkIcon, X, Users, Hash, Menu,
  Reply, AtSign, ArrowUpRight, Smile, Plus, Pencil, Trash2,
  Pin, PinOff, Paperclip, Mic, MicOff, Bold, Italic, Strikethrough,
  Code, ChevronDown, Check, CheckCheck, Image as ImageIcon, File as FileIcon,
} from 'lucide-react';
import { PageSpinner } from '../components/Skeleton';
import { chatApi, taskApi, projectApi } from '../services/api';
import type { ChatChannel, ChatMessage, ChatSearchResult, TypingUser } from '../services/api';
import type { Task, Project, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import toast from 'react-hot-toast';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🔥', '👏', '✅', '👀', '🎉', '😮', '💯'];
const API_BASE = '';

export function ChatPage() {
  const { user } = useAuth();
  const { t, lang, dateLocale } = useLang();
  const navigate = useNavigate();
  const he = lang === 'he';

  // Channel state
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<(User & { lastSeen?: string })[]>([]);
  const [presence, setPresence] = useState<Record<string, boolean>>({});

  // Message input state
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
  const [editText, setEditText] = useState('');

  // UI state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState<string | null>(null);
  const [showInputEmoji, setShowInputEmoji] = useState(false);

  // Mobile sidebar
  const [showSidebar, setShowSidebar] = useState(true);

  // Feature panels
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showDMPicker, setShowDMPicker] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showTaskLink, setShowTaskLink] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Channel creation
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [newChannelMembers, setNewChannelMembers] = useState<string[]>([]);

  // Task linking
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [taskSearch, setTaskSearch] = useState('');

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatSearchResult[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  // Typing
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const lastTypingSentRef = useRef(0);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Read receipts
  const [readStatus, setReadStatus] = useState<Array<{ userId: string; lastRead: string; user: { name: string } }>>([]);

  // Pinned messages
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesTopRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Init ──
  useEffect(() => {
    loadChannels();
    projectApi.getAll().then((r) => setAllProjects(r.data)).catch(() => {});
    chatApi.getUsers().then((r) => setAllUsers(r.data)).catch(() => {});
    chatApi.getPresence().then((r) => setPresence(r.data)).catch(() => {});

    const presenceInterval = setInterval(() => {
      chatApi.getPresence().then((r) => setPresence(r.data)).catch(() => {});
    }, 30_000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (typingPollRef.current) clearInterval(typingPollRef.current);
      clearInterval(presenceInterval);
    };
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages.length]);

  async function loadChannels() {
    setLoading(true);
    try {
      const { data } = await chatApi.getChannels();
      setChannels(data);
      if (!activeChannel) {
        const general = data.find((c) => c.isGeneral) || data[0];
        if (general) selectChannel(general);
      }
    } catch { toast.error(t.chat.loadFailed); }
    finally { setLoading(false); }
  }

  function selectChannel(ch: ChatChannel) {
    setActiveChannel(ch);
    setMessages([]);
    setCurrentPage(1);
    setReplyingTo(null);
    setEditingMsg(null);
    if (window.innerWidth < 768) setShowSidebar(false);
    loadMessages(ch.id, 1);

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => loadMessages(ch.id, 1, true), 3000);

    if (typingPollRef.current) clearInterval(typingPollRef.current);
    typingPollRef.current = setInterval(() => {
      chatApi.getTyping(ch.id).then((r) => setTypingUsers(r.data)).catch(() => {});
    }, 2000);

    chatApi.getReadStatus(ch.id).then((r) => setReadStatus(r.data)).catch(() => {});
  }

  async function loadMessages(channelId: string, page: number, isPolling = false) {
    try {
      const { data } = await chatApi.getMessages(channelId, page);
      if (page === 1) {
        setMessages(data.messages);
      } else {
        setMessages((prev) => [...data.messages, ...prev]);
      }
      setHasMore(data.hasMore);
      if (!isPolling) setCurrentPage(page);
      // Update channel unread in sidebar
      setChannels((prev) => prev.map((c) => c.id === channelId ? { ...c, unreadCount: 0 } : c));
    } catch { /* silent */ }
  }

  async function loadOlderMessages() {
    if (!activeChannel || loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    const prevHeight = scrollContainerRef.current?.scrollHeight || 0;
    const nextPage = currentPage + 1;
    await loadMessages(activeChannel.id, nextPage);
    setCurrentPage(nextPage);
    setLoadingOlder(false);
    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        const newHeight = scrollContainerRef.current.scrollHeight;
        scrollContainerRef.current.scrollTop = newHeight - prevHeight;
      }
    });
  }

  // Infinite scroll observer
  useEffect(() => {
    const el = messagesTopRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !loadingOlder) loadOlderMessages(); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingOlder, activeChannel?.id, currentPage]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  // ── Send Message ──
  async function handleSend() {
    if (!newMessage.trim() || !activeChannel || sending) return;
    setSending(true);
    try {
      const { data } = await chatApi.sendMessage(activeChannel.id, {
        content: newMessage.trim(),
        taskId: selectedTaskId || undefined,
        replyToId: replyingTo?.id || undefined,
      });
      setMessages((prev) => [...prev, data]);
      setNewMessage('');
      setSelectedTaskId(null);
      setReplyingTo(null);
      inputRef.current?.focus();
    } catch { toast.error(t.chat.sendFailed); }
    finally { setSending(false); }
  }

  // ── Edit Message ──
  async function handleSaveEdit() {
    if (!editingMsg || !editText.trim()) return;
    try {
      const { data } = await chatApi.editMessage(editingMsg.id, editText.trim());
      setMessages((prev) => prev.map((m) => m.id === data.id ? data : m));
      setEditingMsg(null);
      setEditText('');
    } catch {
      toast.error(t.chat.editExpired);
    }
  }

  // ── Delete Message ──
  async function handleDeleteMessage(id: string) {
    try {
      await chatApi.deleteMessage(id);
      setMessages((prev) => prev.map((m) => m.id === id ? { ...m, isDeleted: true, content: '' } : m));
      setShowDeleteConfirm(null);
    } catch { toast.error(he ? 'המחיקה נכשלה' : 'Delete failed'); }
  }

  // ── Reactions ──
  async function handleToggleReaction(messageId: string, emoji: string) {
    try {
      const { data } = await chatApi.toggleReaction(messageId, emoji);
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          if (data.action === 'removed') {
            return { ...msg, reactions: msg.reactions.filter((r) => !(r.emoji === emoji && r.userId === user?.id)) };
          }
          return {
            ...msg,
            reactions: [...msg.reactions, { id: 'temp-' + Date.now(), emoji, userId: user!.id, user: { id: user!.id, name: user!.name } }],
          };
        })
      );
      setEmojiPickerMsgId(null);
    } catch { /* silent */ }
  }

  // ── Pin ──
  async function handleTogglePin(msgId: string) {
    try {
      const { data } = await chatApi.togglePin(msgId);
      setMessages((prev) => prev.map((m) => m.id === data.id ? data : m));
    } catch { /* silent */ }
  }

  // ── Typing ──
  function sendTypingEvent() {
    if (!activeChannel) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current > 2000) {
      lastTypingSentRef.current = now;
      chatApi.sendTyping(activeChannel.id).catch(() => {});
    }
  }

  // ── File Upload ──
  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0 || !activeChannel) return;
    try {
      const { data: uploaded } = await chatApi.uploadFiles(Array.from(files));
      const { data: msg } = await chatApi.sendMessageWithFiles(activeChannel.id, {
        content: '',
        attachments: uploaded,
      });
      setMessages((prev) => [...prev, msg]);
    } catch { toast.error(he ? 'העלאת הקובץ נכשלה' : 'File upload failed'); }
  }

  // ── Voice Recording ──
  async function toggleRecording() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setRecordingTime(0);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        audioChunksRef.current = [];
        recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
          await handleFileUpload(createFileList([file]));
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        setRecordingTime(0);
        recordingTimerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000);
      } catch { toast.error(he ? 'לא ניתן לגשת למיקרופון' : 'Cannot access microphone'); }
    }
  }

  // ── Search ──
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const { data } = await chatApi.search(searchQuery, activeChannel?.id);
        setSearchResults(data);
      } catch { /* silent */ }
    }, 300);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchQuery, activeChannel?.id]);

  // ── Create Channel ──
  async function handleCreateChannel() {
    if (!newChannelName.trim()) return;
    try {
      const { data } = await chatApi.createChannel({
        name: newChannelName.trim(),
        description: newChannelDesc.trim() || undefined,
        memberIds: newChannelMembers,
      });
      setChannels((prev) => [data, ...prev]);
      selectChannel(data);
      setShowCreateChannel(false);
      setNewChannelName('');
      setNewChannelDesc('');
      setNewChannelMembers([]);
      toast.success(t.chat.channelCreated);
    } catch { toast.error(t.chat.createFailed); }
  }

  // ── Create DM ──
  async function handleCreateDM(targetUserId: string) {
    try {
      const { data } = await chatApi.createDirect(targetUserId);
      const exists = channels.find((c) => c.id === data.id);
      if (!exists) setChannels((prev) => [data, ...prev]);
      selectChannel(data);
      setShowDMPicker(false);
    } catch { toast.error(t.chat.createFailed); }
  }

  // ── Task Link ──
  async function loadTasksForLink() {
    if (allProjects.length > 0 && allTasks.length === 0) {
      const allT: Task[] = [];
      for (const p of allProjects.slice(0, 10)) {
        try { const { data } = await taskApi.getByProject(p.id); allT.push(...data); } catch { /* */ }
      }
      setAllTasks(allT);
    }
    setShowTaskLink(true);
  }

  // ── Mention handler ──
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewMessage(val);
    sendTypingEvent();

    const lastAt = val.lastIndexOf('@');
    if (lastAt >= 0 && (lastAt === 0 || val[lastAt - 1] === ' ')) {
      const query = val.slice(lastAt + 1);
      if (!query.includes(' ')) { setMentionFilter(query); setShowMentions(true); return; }
    }
    setShowMentions(false);
  }, [activeChannel]);

  function insertMention(userName: string) {
    const lastAt = newMessage.lastIndexOf('@');
    setNewMessage(newMessage.slice(0, lastAt) + `@${userName} `);
    setShowMentions(false);
    inputRef.current?.focus();
  }

  function insertFormatting(marker: string) {
    const input = inputRef.current;
    if (!input) {
      setNewMessage((prev) => prev + marker + marker);
      return;
    }

    const start = input.selectionStart ?? newMessage.length;
    const end = input.selectionEnd ?? newMessage.length;
    const selected = newMessage.slice(start, end);

    if (selected) {
      const before = newMessage.slice(0, start);
      const after = newMessage.slice(end);
      const wrapped = `${marker}${selected}${marker}`;
      setNewMessage(before + wrapped + after);
      requestAnimationFrame(() => {
        input.focus();
        input.setSelectionRange(start + marker.length, start + marker.length + selected.length);
      });
    } else {
      const before = newMessage.slice(0, start);
      const after = newMessage.slice(start);
      const placeholder = marker + marker;
      setNewMessage(before + placeholder + after);
      requestAnimationFrame(() => {
        input.focus();
        const cursorPos = start + marker.length;
        input.setSelectionRange(cursorPos, cursorPos);
      });
    }
  }

  const filteredMentionUsers = allUsers.filter((u) =>
    u.name.toLowerCase().includes(mentionFilter.toLowerCase()) && u.id !== user?.id
  );

  const filteredTasks = taskSearch
    ? allTasks.filter((tk) => tk.title.toLowerCase().includes(taskSearch.toLowerCase()))
    : allTasks;

  // ── Helpers ──
  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return t.chat.today;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return t.chat.yesterday;
    return d.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' });
  }

  function shouldShowDate(i: number) {
    if (i === 0) return true;
    return new Date(messages[i - 1].createdAt).toDateString() !== new Date(messages[i].createdAt).toDateString();
  }

  function renderContent(text: string) {
    const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push(...renderInline(text.slice(lastIdx, match.index), parts.length));
      }
      const lang = match[1] || '';
      const code = match[2].replace(/\n$/, '');
      parts.push(
        <div key={`cb-${match.index}`} dir="ltr" className="my-2 rounded-lg overflow-hidden border border-slate-700 dark:border-slate-600 text-start max-w-full">
          {lang && (
            <div className="px-3 py-1 bg-slate-800 dark:bg-slate-950 text-[10px] text-slate-400 font-mono uppercase tracking-wider border-b border-slate-700 dark:border-slate-600">
              {lang}
            </div>
          )}
          <pre className="p-3 bg-slate-900 dark:bg-[#1e1e1e] text-sm font-mono leading-relaxed overflow-x-auto whitespace-pre">
            <code className="text-emerald-400 dark:text-emerald-300">{code}</code>
          </pre>
        </div>
      );
      lastIdx = match.index + match[0].length;
    }

    if (lastIdx < text.length) {
      parts.push(...renderInline(text.slice(lastIdx), parts.length));
    }

    return parts.length > 0 ? parts : renderInline(text, 0);
  }

  function renderInline(text: string, keyOffset: number): React.ReactNode[] {
    const segments = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|`[^`]+`|@\S+)/g);
    return segments.filter(Boolean).map((seg, i) => {
      const key = keyOffset + i;
      if (seg.startsWith('@')) return <span key={key} className="font-semibold text-primary-500 bg-primary-50 dark:bg-primary-950/40 px-0.5 rounded">{seg}</span>;
      if (seg.startsWith('**') && seg.endsWith('**') && seg.length > 4) return <strong key={key} className="font-bold">{seg.slice(2, -2)}</strong>;
      if (seg.startsWith('*') && seg.endsWith('*') && !seg.startsWith('**') && seg.length > 2) return <em key={key}>{seg.slice(1, -1)}</em>;
      if (seg.startsWith('~~') && seg.endsWith('~~') && seg.length > 4) return <s key={key} className="text-slate-400">{seg.slice(2, -2)}</s>;
      if (seg.startsWith('`') && seg.endsWith('`') && seg.length > 2) return <code key={key} dir="ltr" className="px-1.5 py-0.5 rounded bg-slate-800 dark:bg-[#1e1e1e] text-xs font-mono text-emerald-400 dark:text-emerald-300 inline-block">{seg.slice(1, -1)}</code>;
      return <span key={key}>{seg}</span>;
    });
  }

  function groupReactions(reactions: ChatMessage['reactions']) {
    const map = new Map<string, { emoji: string; users: { id: string; name: string }[]; myReaction: boolean }>();
    for (const r of reactions) {
      if (!map.has(r.emoji)) map.set(r.emoji, { emoji: r.emoji, users: [], myReaction: false });
      const g = map.get(r.emoji)!;
      g.users.push(r.user);
      if (r.userId === user?.id) g.myReaction = true;
    }
    return Array.from(map.values());
  }

  function getChannelDisplayName(ch: ChatChannel) {
    if (ch.isGeneral) return he ? 'כללי' : 'General';
    const isDM = !ch.isGeneral && ch.members.length === 2;
    if (isDM) {
      const other = ch.members.find((m) => m.userId !== user?.id);
      return other?.user.name || ch.name;
    }
    return ch.name;
  }

  function isDM(ch: ChatChannel) {
    return !ch.isGeneral && ch.members.length === 2;
  }

  function getReadReceipt(msg: ChatMessage) {
    if (msg.authorId !== user?.id) return null;
    const otherMembers = readStatus.filter((m) => m.userId !== user?.id);
    if (otherMembers.length === 0) return 'sent';
    const allRead = otherMembers.every((m) => new Date(m.lastRead) >= new Date(msg.createdAt));
    return allRead ? 'read' : 'sent';
  }

  function isImageMime(mime: string) { return mime.startsWith('image/'); }
  function isAudioMime(mime: string) { return mime.startsWith('audio/'); }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function formatRecordingTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  // ── Loading ──
  if (loading) {
    return <PageSpinner />;
  }

  const groupChannels = channels.filter((c) => !isDM(c) && !c.isGeneral);
  const dmChannels = channels.filter((c) => isDM(c));
  const generalChannel = channels.find((c) => c.isGeneral);

  return (
    <div className="flex h-full relative">
      {/* ── Channel Sidebar ── */}
      <div className={`${showSidebar ? 'flex' : 'hidden'} md:flex w-full md:w-72 shrink-0 bg-white dark:bg-slate-900 border-e border-slate-200 dark:border-slate-800 flex-col h-full absolute md:relative inset-0 z-20`}>
        {/* Sidebar Header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t.chat.title}</h2>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowSearch(true)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-500 transition-colors" title={t.chat.searchMessages}>
              <Search className="w-4 h-4" />
            </button>
            <button onClick={() => setShowDMPicker(true)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-500 transition-colors" title={t.chat.newDM}>
              <AtSign className="w-4 h-4" />
            </button>
            <button onClick={() => setShowCreateChannel(true)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-500 transition-colors" title={t.chat.newChannel}>
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Channel List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {/* General */}
          {generalChannel && (
            <div>
              <button
                onClick={() => selectChannel(generalChannel)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  activeChannel?.id === generalChannel.id
                    ? 'bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Hash className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-start font-medium truncate">{he ? 'כללי' : 'General'}</span>
                {generalChannel.unreadCount > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {generalChannel.unreadCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Group Channels */}
          {groupChannels.length > 0 && (
            <div>
              <p className="px-3 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.chat.channels}</p>
              {groupChannels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => selectChannel(ch)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                    activeChannel?.id === ch.id
                      ? 'bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Hash className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-start truncate">{ch.name}</span>
                  {ch.unreadCount > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary-500 text-white text-[10px] flex items-center justify-center font-bold">{ch.unreadCount}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* DMs */}
          {dmChannels.length > 0 && (
            <div>
              <p className="px-3 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.chat.directMessages}</p>
              {dmChannels.map((ch) => {
                const other = ch.members.find((m) => m.userId !== user?.id);
                const isOnline = other ? presence[other.userId] : false;
                return (
                  <button
                    key={ch.id}
                    onClick={() => selectChannel(ch)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                      activeChannel?.id === ch.id
                        ? 'bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <Avatar name={other?.user.name || '?'} size="xs" />
                      <span className={`absolute -bottom-0.5 -end-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${isOnline ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                    </div>
                    <span className="flex-1 text-start truncate">{other?.user.name}</span>
                    {ch.unreadCount > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary-500 text-white text-[10px] flex items-center justify-center font-bold">{ch.unreadCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {activeChannel ? (
          <>
            {/* Header */}
            <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-4 shrink-0">
              <button onClick={() => setShowSidebar(true)} className="md:hidden p-2 -ms-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                <Menu className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                {isDM(activeChannel) ? (
                  <Avatar name={getChannelDisplayName(activeChannel)} size="sm" />
                ) : (
                  <Hash className="w-5 h-5 text-primary-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-bold text-slate-900 dark:text-white truncate">{getChannelDisplayName(activeChannel)}</h1>
                <p className="text-xs text-slate-400">
                  {activeChannel.members.length} {t.chat.members}
                  {isDM(activeChannel) && (() => {
                    const other = activeChannel.members.find((m) => m.userId !== user?.id);
                    return other && presence[other.userId] ? ` • ${t.chat.online}` : '';
                  })()}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { if (activeChannel) chatApi.getPinned(activeChannel.id).then((r) => { setPinnedMessages(r.data); setShowPinned(true); }).catch(() => {}); }}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-500 transition-colors" title={t.chat.pinnedMessages}>
                  <Pin className="w-4 h-4" />
                </button>
                <button onClick={() => setShowMembers(true)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-500 transition-colors" title={t.chat.members}>
                  <Users className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 bg-slate-50 dark:bg-slate-950 space-y-1" onClick={() => { setEmojiPickerMsgId(null); setHoveredMsgId(null); }}>
              {/* Load older */}
              <div ref={messagesTopRef} />
              {loadingOlder && (
                <div className="flex justify-center py-3">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    {t.chat.loadingOlder}
                  </div>
                </div>
              )}

              {messages.length === 0 && !loadingOlder && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageCircle className="w-14 h-14 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">{t.chat.noMessages}</p>
                  </div>
                </div>
              )}

              {messages.map((msg, i) => {
                const isMe = msg.authorId === user?.id;
                const showAvatar = i === 0 || messages[i - 1]?.authorId !== msg.authorId ||
                  new Date(msg.createdAt).getTime() - new Date(messages[i - 1]?.createdAt).getTime() > 300000;
                const showDateLabel = shouldShowDate(i);
                const isHovered = hoveredMsgId === msg.id;
                const isEmoji = !msg.isDeleted && /^\p{Emoji}$/u.test(msg.content.trim()) && msg.content.trim().length <= 4 && !msg.task && msg.attachments.length === 0;
                const reactionGroups = groupReactions(msg.reactions || []);
                const receipt = getReadReceipt(msg);
                const isBot = msg.type === 'bot';

                if (msg.isDeleted) {
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800/50 text-xs text-slate-400 italic">
                        {t.chat.messageDeleted}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id}>
                    {showDateLabel && (
                      <div className="flex items-center justify-center my-4">
                        <span className="px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    {showAvatar && <div className="h-2" />}

                    <div
                      className={`flex group ${isMe ? 'justify-end' : 'justify-start'}`}
                      onMouseEnter={() => setHoveredMsgId(msg.id)}
                      onMouseLeave={() => { if (emojiPickerMsgId !== msg.id) setHoveredMsgId(null); }}
                    >
                      <div className={`flex gap-2.5 max-w-[65%] ${isMe ? 'flex-row-reverse' : ''}`}>
                        {!isMe && showAvatar ? (
                          <div className="shrink-0 mt-auto"><Avatar name={msg.author.name} size="sm" /></div>
                        ) : (
                          !isMe && <div className="w-8 shrink-0" />
                        )}
                        <div className={`flex flex-col min-w-0 ${isMe ? 'items-end' : 'items-start'}`}>
                          {showAvatar && !isMe && (
                            <p className={`text-xs font-semibold mb-1 ms-2 ${isBot ? 'text-amber-500' : 'text-primary-600 dark:text-primary-400'}`}>
                              {isBot ? '🤖 Bot' : msg.author.name}
                            </p>
                          )}

                          {msg.replyTo && (
                            <div className={`ms-2 me-2 mb-1 px-3 py-1.5 rounded-lg border-s-2 ${isMe ? 'border-primary-300 bg-primary-500/10' : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800/70'}`}>
                              <p className="text-[11px] font-semibold text-primary-600 dark:text-primary-400">{msg.replyTo.author.name}</p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{msg.replyTo.content.slice(0, 60)}</p>
                            </div>
                          )}

                          {msg.isPinned && (
                            <div className="flex items-center gap-1 ms-2 mb-0.5">
                              <Pin className="w-3 h-3 text-amber-500" />
                              <span className="text-[10px] text-amber-500 font-medium">{t.chat.pinnedBy} {msg.pinnedBy?.name}</span>
                            </div>
                          )}

                          <div className="relative">
                            {isEmoji ? (
                              <div className="text-4xl px-2 py-1">{msg.content}</div>
                            ) : (
                              <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm overflow-hidden ${
                                isBot
                                  ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-800 rounded-es-md'
                                  : isMe
                                    ? 'bg-primary-600 text-white rounded-ee-md'
                                    : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700 rounded-es-md'
                              }`}>
                                {msg.content && (
                                  <div className="whitespace-pre-wrap break-words overflow-hidden">{renderContent(msg.content)}</div>
                                )}

                                {/* Attachments */}
                                {msg.attachments?.map((att) => (
                                  <div key={att.id} className="mt-2">
                                    {isImageMime(att.mimeType) ? (
                                      <img src={`${API_BASE}${att.url}`} alt={att.originalName} className="max-w-full max-h-60 rounded-lg cursor-pointer" onClick={() => window.open(`${API_BASE}${att.url}`, '_blank')} />
                                    ) : isAudioMime(att.mimeType) ? (
                                      <div className="flex items-center gap-2">
                                        <Mic className="w-4 h-4 shrink-0" />
                                        <audio controls src={`${API_BASE}${att.url}`} className="h-8 max-w-[200px]" />
                                      </div>
                                    ) : (
                                      <a href={`${API_BASE}${att.url}`} target="_blank" rel="noopener noreferrer"
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${isMe ? 'bg-primary-700/50 text-primary-100 hover:bg-primary-700/70' : 'bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600'}`}>
                                        <FileIcon className="w-4 h-4 shrink-0" />
                                        <span className="truncate flex-1">{att.originalName}</span>
                                        <span className="text-[10px] opacity-70">{formatFileSize(att.size)}</span>
                                      </a>
                                    )}
                                  </div>
                                ))}

                                {msg.task && (
                                  <button onClick={(e) => { e.stopPropagation(); navigate(`/projects/${msg.task!.projectId}`); }}
                                    className={`mt-2 w-full px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-colors ${isMe ? 'bg-primary-700/50 text-primary-100 hover:bg-primary-700/70' : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'}`}>
                                    <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                                    <span className="font-medium truncate flex-1 text-start">{msg.task.title}</span>
                                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${msg.task.status === 'DONE' ? 'bg-emerald-500/20 text-emerald-300' : msg.task.status === 'IN_PROGRESS' ? 'bg-blue-500/20 text-blue-300' : msg.task.status === 'REVIEW' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-500/20 text-slate-300'}`}>
                                      {t.status[msg.task.status as keyof typeof t.status] || msg.task.status}
                                    </span>
                                    <ArrowUpRight className="w-3 h-3 shrink-0 opacity-60" />
                                  </button>
                                )}

                                {msg.editedAt && (
                                  <span className={`text-[10px] opacity-60 mt-1 block ${isMe ? 'text-end' : 'text-start'}`}>({t.chat.edited})</span>
                                )}
                              </div>
                            )}

                            {/* Reactions */}
                            {reactionGroups.length > 0 && (
                              <div className={`flex flex-wrap gap-1.5 mt-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                {reactionGroups.map((rg) => (
                                  <button key={rg.emoji} onClick={(e) => { e.stopPropagation(); handleToggleReaction(msg.id, rg.emoji); }}
                                    title={rg.users.map((u) => u.name).join(', ')}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors border ${rg.myReaction ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                    <span className="text-sm">{rg.emoji}</span>
                                    <span className={`font-semibold ${rg.myReaction ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500'}`}>{rg.users.length}</span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Hover Actions */}
                            <AnimatePresence>
                              {isHovered && (
                                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                                  className={`absolute ${isMe ? 'end-0' : 'start-0'} bottom-full mb-1 flex items-center gap-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg px-1 py-0.5 z-10`}
                                  onClick={(e) => e.stopPropagation()}>
                                  <button onClick={() => { setReplyingTo(msg); inputRef.current?.focus(); setHoveredMsgId(null); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500 transition-colors" title={t.chat.reply}>
                                    <Reply className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => setEmojiPickerMsgId(emojiPickerMsgId === msg.id ? null : msg.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500 transition-colors" title={he ? 'תגובה' : 'React'}>
                                    <Smile className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => handleTogglePin(msg.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-amber-500 transition-colors" title={msg.isPinned ? t.chat.unpinMessage : t.chat.pinMessage}>
                                    {msg.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                                  </button>
                                  {isMe && (
                                    <>
                                      <button onClick={() => { setEditingMsg(msg); setEditText(msg.content); setHoveredMsgId(null); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-colors" title={t.chat.editMessage}>
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button onClick={() => setShowDeleteConfirm(msg.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors" title={t.chat.deleteMessage}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Emoji picker */}
                            <AnimatePresence>
                              {emojiPickerMsgId === msg.id && (
                                <motion.div initial={{ opacity: 0, scale: 0.9, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -5 }}
                                  className={`absolute ${isMe ? 'end-0' : 'start-0'} bottom-full mb-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-2.5 z-20`}
                                  onClick={(e) => e.stopPropagation()}>
                                  <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                                    {REACTION_EMOJIS.map((emoji) => (
                                      <button key={emoji} onClick={() => handleToggleReaction(msg.id, emoji)} className="w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-xl transition-transform hover:scale-125">{emoji}</button>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'justify-end me-1' : 'justify-start ms-2'}`}>
                            <p className="text-[10px] text-slate-400">{formatTime(msg.createdAt)}</p>
                            {receipt && isMe && (
                              <span className="text-[10px]">
                                {receipt === 'read'
                                  ? <CheckCheck className="w-3 h-3 text-blue-500 inline" />
                                  : <Check className="w-3 h-3 text-slate-400 inline" />
                                }
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Typing indicator */}
            <AnimatePresence>
              {typingUsers.length > 0 && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="px-6 py-1.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
                  <p className="text-xs text-slate-400 animate-pulse">
                    {typingUsers.map((u) => u.name).join(', ')} {typingUsers.length === 1 ? t.chat.typingOne : t.chat.typingMany}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Edit bar */}
            <AnimatePresence>
              {editingMsg && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="px-4 py-2 bg-blue-50 dark:bg-blue-950/30 border-t border-blue-200 dark:border-blue-800 flex items-center gap-3 shrink-0 overflow-hidden">
                  <Pencil className="w-4 h-4 text-blue-500 shrink-0" />
                  <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingMsg(null); }}
                    className="input flex-1 text-sm" autoFocus />
                  <button onClick={handleSaveEdit} className="btn-primary text-xs px-3 py-1.5">{t.common.save}</button>
                  <button onClick={() => setEditingMsg(null)} className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50">
                    <X className="w-4 h-4 text-blue-500" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reply indicator */}
            <AnimatePresence>
              {replyingTo && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center gap-3 shrink-0 overflow-hidden">
                  <Reply className="w-4 h-4 text-primary-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-primary-600 dark:text-primary-400">{replyingTo.author.name}</p>
                    <p className="text-xs text-slate-500 truncate">{replyingTo.content.slice(0, 80)}</p>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Task link indicator */}
            <AnimatePresence>
              {selectedTaskId && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="px-4 py-2 bg-primary-50 dark:bg-primary-950/30 border-t border-primary-100 dark:border-primary-900 flex items-center gap-2 shrink-0 overflow-hidden">
                  <LinkIcon className="w-4 h-4 text-primary-500 shrink-0" />
                  <span className="text-sm text-primary-700 dark:text-primary-300 truncate flex-1">{allTasks.find((tk) => tk.id === selectedTaskId)?.title}</span>
                  <button onClick={() => setSelectedTaskId(null)} className="p-0.5 rounded hover:bg-primary-100 dark:hover:bg-primary-900/50">
                    <X className="w-4 h-4 text-primary-500" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Area */}
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 relative">
              {/* @mention dropdown */}
              <AnimatePresence>
                {showMentions && filteredMentionUsers.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full mb-1 start-4 end-4 max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-20">
                    <div className="max-h-40 overflow-y-auto">
                      {filteredMentionUsers.map((u) => (
                        <button key={u.id} onClick={() => insertMention(u.name)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-start">
                          <Avatar name={u.name} size="sm" />
                          <span className="text-sm font-medium text-slate-900 dark:text-white">{u.name}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Emoji picker for input */}
              <AnimatePresence>
                {showInputEmoji && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full mb-1 start-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 z-20">
                    <div className="grid grid-cols-5 gap-1.5">
                      {['😊', '😂', '❤️', '👍', '🔥', '🎉', '👏', '✅', '💯', '😮', '🙏', '💪', '⭐', '🚀', '👀'].map((emoji) => (
                        <button key={emoji} onClick={() => { setNewMessage((prev) => prev + emoji); setShowInputEmoji(false); inputRef.current?.focus(); }}
                          className="w-10 h-10 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-xl transition-transform hover:scale-125">{emoji}</button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Formatting bar */}
              <div className="flex items-center gap-1 mb-2 max-w-4xl mx-auto">
                <button onClick={() => insertFormatting('**')} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors" title={t.chat.bold}><Bold className="w-3.5 h-3.5" /></button>
                <button onClick={() => insertFormatting('*')} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors" title={t.chat.italic}><Italic className="w-3.5 h-3.5" /></button>
                <button onClick={() => insertFormatting('~~')} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors" title={t.chat.strike}><Strikethrough className="w-3.5 h-3.5" /></button>
                <button onClick={() => insertFormatting('`')} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors" title={t.chat.code}><Code className="w-3.5 h-3.5" /></button>
                <button
                  onClick={() => {
                    const input = inputRef.current;
                    if (!input) return;
                    const start = input.selectionStart ?? newMessage.length;
                    const end = input.selectionEnd ?? newMessage.length;
                    const selected = newMessage.slice(start, end);
                    const before = newMessage.slice(0, start);
                    const after = newMessage.slice(end);
                    const block = selected ? `\`\`\`\n${selected}\n\`\`\`` : '```\n\n```';
                    setNewMessage(before + block + after);
                    requestAnimationFrame(() => {
                      input.focus();
                      const pos = before.length + 4;
                      input.setSelectionRange(pos, pos);
                    });
                  }}
                  className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                  title={he ? 'בלוק קוד' : 'Code Block'}
                >
                  <span className="text-[10px] font-mono font-bold leading-none">{'{}'}</span>
                </button>
                <div className="flex-1" />
              </div>

              <div className="flex items-end gap-2 max-w-4xl mx-auto">
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => { handleFileUpload(e.target.files); e.target.value = ''; }} />
                <button onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-500 transition-colors shrink-0" title={t.chat.attachFile}>
                  <Paperclip className="w-5 h-5" />
                </button>
                <button onClick={loadTasksForLink} className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-500 transition-colors shrink-0" title={t.chat.linkTask}>
                  <LinkIcon className="w-5 h-5" />
                </button>
                <button onClick={() => { setNewMessage((prev) => prev + '@'); setShowMentions(true); setMentionFilter(''); inputRef.current?.focus(); }} className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-500 transition-colors shrink-0">
                  <AtSign className="w-5 h-5" />
                </button>
                <button onClick={() => setShowInputEmoji(!showInputEmoji)} className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-500 transition-colors shrink-0">
                  <Smile className="w-5 h-5" />
                </button>
                <button onClick={toggleRecording} className={`p-2.5 rounded-xl transition-colors shrink-0 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-500'}`} title={t.chat.voiceMessage}>
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                {isRecording ? (
                  <div className="input flex-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm text-red-500 font-medium">{t.chat.recording} {formatRecordingTime(recordingTime)}</span>
                  </div>
                ) : (
                  <textarea
                    ref={inputRef}
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                      if (e.key === 'Escape') { setShowMentions(false); setReplyingTo(null); setShowInputEmoji(false); }
                    }}
                    placeholder={replyingTo ? (he ? 'הקלידו תגובה...' : 'Type a reply...') : t.chat.typeMessage}
                    className="input flex-1 resize-none min-h-[40px] max-h-[120px]"
                    rows={1}
                    dir="auto"
                  />
                )}
                <button onClick={handleSend} disabled={!newMessage.trim() || sending} className="btn-primary p-2.5 rounded-xl shrink-0">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-400">{t.chat.selectChannel}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}

      {/* Create Channel */}
      <Modal isOpen={showCreateChannel} onClose={() => setShowCreateChannel(false)} title={t.chat.newChannel} size="sm">
        <div className="space-y-4">
          <p className="text-xs text-slate-400">{t.chat.createChannelDesc}</p>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.chat.channelName}</label>
            <input type="text" className="input" placeholder={t.chat.channelNamePlaceholder} value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.chat.description}</label>
            <input type="text" className="input" value={newChannelDesc} onChange={(e) => setNewChannelDesc(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.chat.addMembers}</label>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {allUsers.map((u) => (
                <label key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                  <input type="checkbox" checked={newChannelMembers.includes(u.id)} onChange={(e) => {
                    setNewChannelMembers(e.target.checked ? [...newChannelMembers, u.id] : newChannelMembers.filter((id) => id !== u.id));
                  }} className="rounded" />
                  <Avatar name={u.name} size="sm" />
                  <span className="text-sm text-slate-900 dark:text-white">{u.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowCreateChannel(false)} className="btn-secondary flex-1">{t.common.cancel}</button>
            <button onClick={handleCreateChannel} disabled={!newChannelName.trim()} className="btn-primary flex-1">{t.common.create}</button>
          </div>
        </div>
      </Modal>

      {/* DM Picker */}
      <Modal isOpen={showDMPicker} onClose={() => setShowDMPicker(false)} title={t.chat.newDM} size="sm">
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {allUsers.map((u) => {
            const isOnline = presence[u.id];
            return (
              <button key={u.id} onClick={() => handleCreateDM(u.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-start">
                <div className="relative">
                  <Avatar name={u.name} size="md" />
                  <span className={`absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${isOnline ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{u.name}</p>
                  <p className="text-xs text-slate-400">{isOnline ? t.chat.online : t.chat.offline}</p>
                </div>
                <span className="text-xs text-primary-500">{t.chat.startDM}</span>
              </button>
            );
          })}
        </div>
      </Modal>

      {/* Members */}
      <Modal isOpen={showMembers} onClose={() => setShowMembers(false)} title={t.chat.members} size="sm">
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {activeChannel?.members?.map((m) => {
            const isOnline = presence[m.userId];
            return (
              <div key={m.userId} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800">
                <div className="relative">
                  <Avatar name={m.user.name} size="md" />
                  <span className={`absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${isOnline ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {m.user.name}
                    {m.userId === user?.id && <span className="text-xs text-slate-400 ms-2">({t.common.you})</span>}
                  </p>
                  <p className="text-xs text-slate-400">{isOnline ? t.chat.online : t.chat.offline}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* Pinned Messages */}
      <Modal isOpen={showPinned} onClose={() => setShowPinned(false)} title={t.chat.pinnedMessages} size="md">
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {pinnedMessages.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">{t.chat.noPinnedMessages}</p>
          ) : (
            pinnedMessages.map((msg) => (
              <div key={msg.id} className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar name={msg.author.name} size="xs" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{msg.author.name}</span>
                  <span className="text-[10px] text-slate-400">{formatTime(msg.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-900 dark:text-white whitespace-pre-wrap">{renderContent(msg.content)}</p>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Search */}
      <Modal isOpen={showSearch} onClose={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }} title={t.chat.searchResults} size="md">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" className="input ps-10 text-sm" placeholder={t.chat.searchMessages} value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus />
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {searchResults.length === 0 && searchQuery && (
              <p className="text-center text-sm text-slate-400 py-4">{t.chat.noSearchResults}</p>
            )}
            {searchResults.map((r) => (
              <button key={r.id} onClick={() => {
                const ch = channels.find((c) => c.id === r.channel.id);
                if (ch) { selectChannel(ch); setShowSearch(false); setSearchQuery(''); setSearchResults([]); }
              }} className="w-full text-start px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <Avatar name={r.author.name} size="xs" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{r.author.name}</span>
                  <span className="text-[10px] text-slate-400">{formatDate(r.createdAt)} {formatTime(r.createdAt)}</span>
                  <span className="text-[10px] text-primary-500">#{r.channel.name}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{r.content}</p>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title={t.chat.deleteMessage} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">{t.chat.deleteConfirm}</p>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowDeleteConfirm(null)} className="btn-secondary flex-1">{t.common.cancel}</button>
            <button onClick={() => showDeleteConfirm && handleDeleteMessage(showDeleteConfirm)} className="btn-danger flex-1">{t.common.delete}</button>
          </div>
        </div>
      </Modal>

      {/* Link Task */}
      <Modal isOpen={showTaskLink} onClose={() => setShowTaskLink(false)} title={t.chat.linkTask} size="sm">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" className="input ps-10 text-sm" placeholder={t.chat.searchTask} value={taskSearch} onChange={(e) => setTaskSearch(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {filteredTasks.map((tk) => (
              <button key={tk.id} onClick={() => { setSelectedTaskId(tk.id); setShowTaskLink(false); inputRef.current?.focus(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-start">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${tk.status === 'DONE' ? 'bg-emerald-400' : tk.status === 'IN_PROGRESS' ? 'bg-blue-400' : tk.status === 'REVIEW' ? 'bg-amber-400' : 'bg-slate-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{tk.title}</p>
                  <p className="text-xs text-slate-400">{tk.project?.name} • {t.status[tk.status as keyof typeof t.status] || tk.status}</p>
                </div>
              </button>
            ))}
            {filteredTasks.length === 0 && <p className="text-center text-sm text-slate-400 py-4">{t.chat.noTasks}</p>}
          </div>
        </div>
      </Modal>
    </div>
  );
}

function createFileList(files: File[]): FileList {
  const dt = new DataTransfer();
  files.forEach((f) => dt.items.add(f));
  return dt.files;
}
