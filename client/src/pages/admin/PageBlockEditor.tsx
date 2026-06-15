import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, Trash2, GripVertical, ArrowRight, ArrowLeft,
  Type, Table, LayoutGrid, List, Minus, Heading, ExternalLink,
  Eye, EyeOff, Save, X, PlusCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminPagesApi } from '../../services/adminApi';
import { useLang } from '../../context/LangContext';
import { Modal } from '../../components/Modal';
import type { CustomPage, PageBlock } from '../../types/admin';

const BLOCK_TYPES = [
  { type: 'heading', icon: Heading, labelHe: 'כותרת', labelEn: 'Heading' },
  { type: 'text', icon: Type, labelHe: 'טקסט', labelEn: 'Text' },
  { type: 'table', icon: Table, labelHe: 'טבלה', labelEn: 'Table' },
  { type: 'cards', icon: LayoutGrid, labelHe: 'כרטיסים', labelEn: 'Cards' },
  { type: 'list', icon: List, labelHe: 'רשימה', labelEn: 'List' },
  { type: 'divider', icon: Minus, labelHe: 'קו הפרדה', labelEn: 'Divider' },
];

function getDefaultContent(type: string): string {
  switch (type) {
    case 'heading': return JSON.stringify({ text: '', level: 2 });
    case 'text': return JSON.stringify({ text: '' });
    case 'table': return JSON.stringify({ headers: ['עמודה 1', 'עמודה 2', 'עמודה 3'], rows: [['', '', '']] });
    case 'cards': return JSON.stringify({ cards: [{ title: '', description: '' }] });
    case 'list': return JSON.stringify({ items: [''] });
    case 'divider': return JSON.stringify({});
    default: return '{}';
  }
}

type ParsedContent = Record<string, unknown>;

function parseContent(block: PageBlock): ParsedContent {
  try { return JSON.parse(block.content); } catch { return {}; }
}

export function PageBlockEditor() {
  const { id } = useParams<{ id: string }>();
  const { t, lang, isRTL } = useLang();
  const navigate = useNavigate();
  const [page, setPage] = useState<CustomPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleHe, setTitleHe] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [pageDesc, setPageDesc] = useState('');

  const BackIcon = isRTL ? ArrowLeft : ArrowRight;

  useEffect(() => { if (id) load(); }, [id]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await adminPagesApi.getById(id!);
      setPage(data);
      setTitleHe(data.title_he);
      setTitleEn(data.title_en);
      setPageDesc(data.description || '');
    } finally { setLoading(false); }
  }

  async function handleAddBlock(type: string) {
    try {
      await adminPagesApi.createBlock(id!, { type, content: getDefaultContent(type) });
      toast.success(lang === 'he' ? 'בלוק נוסף!' : 'Block added!');
      setShowAddBlock(false);
      load();
    } catch { toast.error(t.admin.createFailed); }
  }

  async function handleDeleteBlock(blockId: string) {
    try {
      await adminPagesApi.deleteBlock(id!, blockId);
      toast.success(t.admin.deleted);
      load();
    } catch { toast.error(t.admin.deleteFailed); }
  }

  async function handleSaveBlock(blockId: string, content: ParsedContent) {
    try {
      await adminPagesApi.updateBlock(id!, blockId, { content: JSON.stringify(content) });
      toast.success(t.common.saved);
      load();
    } catch { toast.error(t.admin.updateFailed); }
  }

  async function handleTogglePublish() {
    if (!page) return;
    try {
      await adminPagesApi.update(page.id, { isPublished: !page.isPublished });
      toast.success(page.isPublished
        ? (lang === 'he' ? 'הדף הוסתר' : 'Page unpublished')
        : (lang === 'he' ? 'הדף פורסם!' : 'Page published!'));
      load();
    } catch { toast.error(t.admin.updateFailed); }
  }

  async function handleSavePageMeta() {
    if (!page) return;
    try {
      await adminPagesApi.update(page.id, { title_he: titleHe, title_en: titleEn, description: pageDesc || null });
      toast.success(t.common.saved);
      setEditingTitle(false);
      load();
    } catch { toast.error(t.admin.updateFailed); }
  }

  if (loading || !page) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pageUrl = `/pages/${page.slug}`;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <button onClick={() => navigate('/admin/pages')} className="btn-ghost p-2">
            <BackIcon className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input className="input text-sm" placeholder={lang === 'he' ? 'כותרת בעברית' : 'Hebrew title'} value={titleHe} onChange={(e) => setTitleHe(e.target.value)} />
                  <input className="input text-sm" placeholder={lang === 'he' ? 'כותרת באנגלית' : 'English title'} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
                </div>
                <input className="input text-sm" placeholder={lang === 'he' ? 'תיאור (אופציונלי)' : 'Description (optional)'} value={pageDesc} onChange={(e) => setPageDesc(e.target.value)} />
                <div className="flex gap-2">
                  <button onClick={handleSavePageMeta} className="btn-primary text-xs px-3 py-1"><Save className="w-3 h-3" /></button>
                  <button onClick={() => setEditingTitle(false)} className="btn-ghost text-xs px-3 py-1"><X className="w-3 h-3" /></button>
                </div>
              </div>
            ) : (
              <div className="cursor-pointer" onClick={() => setEditingTitle(true)}>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white hover:text-primary-600 transition-colors">{page.title_he}</h1>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-sm text-slate-400 font-mono">/{page.slug}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${page.isPublished ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    {page.isPublished ? (lang === 'he' ? 'מפורסם' : 'Published') : (lang === 'he' ? 'טיוטה' : 'Draft')}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost p-2" title={lang === 'he' ? 'תצוגה מקדימה' : 'Preview'}>
              <ExternalLink className="w-4 h-4" />
            </a>
            <button onClick={handleTogglePublish} className="btn-ghost p-2" title={page.isPublished ? 'Unpublish' : 'Publish'}>
              {page.isPublished ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-emerald-500" />}
            </button>
            <button onClick={() => setShowAddBlock(true)} className="btn-primary text-sm">
              <Plus className="w-4 h-4" />
              {lang === 'he' ? 'הוספת בלוק' : 'Add Block'}
            </button>
          </div>
        </div>

        {/* Info bar */}
        <div className="card p-3 mb-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            {lang === 'he'
              ? `💡 הדף נגיש בכתובת: ${pageUrl} — ודא שיש פריט ניווט עם כתובת זו כדי שהדף יופיע בתפריט.`
              : `💡 This page is accessible at: ${pageUrl} — make sure a nav item with this URL exists for it to appear in the menu.`}
          </p>
        </div>

        {/* Blocks */}
        <div className="space-y-4">
          {page.blocks.map((block) => (
            <BlockEditor
              key={block.id}
              block={block}
              lang={lang}
              onSave={(content) => handleSaveBlock(block.id, content)}
              onDelete={() => handleDeleteBlock(block.id)}
            />
          ))}

          {page.blocks.length === 0 && (
            <div className="card p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
              <Type className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 mb-4">
                {lang === 'he' ? 'הדף ריק. הוסיפו את הבלוק הראשון כדי להתחיל לבנות תוכן.' : 'Page is empty. Add your first block to start building content.'}
              </p>
              <button onClick={() => setShowAddBlock(true)} className="btn-primary">
                <Plus className="w-4 h-4" />
                {lang === 'he' ? 'הוספת בלוק' : 'Add Block'}
              </button>
            </div>
          )}
        </div>

        {/* Add block modal */}
        <Modal isOpen={showAddBlock} onClose={() => setShowAddBlock(false)} title={lang === 'he' ? 'הוספת בלוק תוכן' : 'Add Content Block'} size="sm">
          <div className="grid grid-cols-2 gap-3">
            {BLOCK_TYPES.map((bt) => (
              <button
                key={bt.type}
                onClick={() => handleAddBlock(bt.type)}
                className="card p-4 flex flex-col items-center gap-2 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-700 transition-all cursor-pointer"
              >
                <bt.icon className="w-6 h-6 text-primary-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{lang === 'he' ? bt.labelHe : bt.labelEn}</span>
              </button>
            ))}
          </div>
        </Modal>
      </motion.div>
    </div>
  );
}

/* ───── Visual Block Editor ───── */

interface BlockEditorProps {
  block: PageBlock;
  lang: string;
  onSave: (content: ParsedContent) => void;
  onDelete: () => void;
}

function BlockEditor({ block, lang, onSave, onDelete }: BlockEditorProps) {
  const [content, setContent] = useState<ParsedContent>(() => parseContent(block));
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setContent(parseContent(block)); setDirty(false); }, [block.content]);

  const update = useCallback((patch: Partial<ParsedContent>) => {
    setContent((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  }, []);

  const typeLabel = BLOCK_TYPES.find((bt) => bt.type === block.type);

  return (
    <div className={`card p-4 transition-all ${dirty ? 'ring-2 ring-amber-400/50' : ''}`}>
      <div className="flex items-center gap-3 mb-3">
        <GripVertical className="w-4 h-4 text-slate-300 cursor-grab shrink-0" />
        <span className="text-xs font-bold uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
          {lang === 'he' ? typeLabel?.labelHe : typeLabel?.labelEn}
        </span>
        <div className="flex-1" />
        {dirty && (
          <button onClick={() => onSave(content)} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
            <Save className="w-3 h-3" />
            {lang === 'he' ? 'שמירה' : 'Save'}
          </button>
        )}
        <button onClick={onDelete} className="btn-ghost p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {block.type === 'heading' && <HeadingEditor content={content} onChange={update} lang={lang} />}
      {block.type === 'text' && <TextEditor content={content} onChange={update} lang={lang} />}
      {block.type === 'list' && <ListEditor content={content} onChange={update} lang={lang} />}
      {block.type === 'table' && <TableEditor content={content} onChange={update} lang={lang} />}
      {block.type === 'cards' && <CardsEditor content={content} onChange={update} lang={lang} />}
      {block.type === 'divider' && <hr className="border-slate-200 dark:border-slate-700 my-2" />}
    </div>
  );
}

/* ── Heading Editor ── */

function HeadingEditor({ content, onChange, lang }: { content: ParsedContent; onChange: (p: Partial<ParsedContent>) => void; lang: string }) {
  const level = (content.level as number) || 2;
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 mb-2">
        {[1, 2, 3].map((l) => (
          <button
            key={l}
            onClick={() => onChange({ level: l })}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${level === l ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}
          >
            H{l}
          </button>
        ))}
      </div>
      <input
        className="input text-lg font-bold"
        placeholder={lang === 'he' ? 'הקלידו כותרת...' : 'Type heading...'}
        value={(content.text as string) || ''}
        onChange={(e) => onChange({ text: e.target.value })}
      />
    </div>
  );
}

/* ── Text Editor ── */

function TextEditor({ content, onChange, lang }: { content: ParsedContent; onChange: (p: Partial<ParsedContent>) => void; lang: string }) {
  return (
    <textarea
      className="input resize-none text-sm min-h-[80px]"
      placeholder={lang === 'he' ? 'הקלידו טקסט...' : 'Type text...'}
      rows={4}
      value={(content.text as string) || ''}
      onChange={(e) => onChange({ text: e.target.value })}
    />
  );
}

/* ── List Editor ── */

function ListEditor({ content, onChange, lang }: { content: ParsedContent; onChange: (p: Partial<ParsedContent>) => void; lang: string }) {
  const items = (content.items as string[]) || [];

  function updateItem(index: number, value: string) {
    const next = [...items];
    next[index] = value;
    onChange({ items: next });
  }

  function addItem() {
    onChange({ items: [...items, ''] });
  }

  function removeItem(index: number) {
    onChange({ items: items.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary-400 shrink-0" />
          <input
            className="input text-sm flex-1"
            placeholder={lang === 'he' ? `פריט ${i + 1}` : `Item ${i + 1}`}
            value={item}
            onChange={(e) => updateItem(i, e.target.value)}
          />
          <button onClick={() => removeItem(i)} className="btn-ghost p-1 text-red-400 hover:text-red-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button onClick={addItem} className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium px-1 py-1">
        <PlusCircle className="w-3.5 h-3.5" />
        {lang === 'he' ? 'הוספת פריט' : 'Add item'}
      </button>
    </div>
  );
}

/* ── Table Editor ── */

function TableEditor({ content, onChange, lang }: { content: ParsedContent; onChange: (p: Partial<ParsedContent>) => void; lang: string }) {
  const headers = (content.headers as string[]) || [];
  const rows = (content.rows as string[][]) || [];

  function updateHeader(index: number, value: string) {
    const next = [...headers];
    next[index] = value;
    onChange({ headers: next });
  }

  function updateCell(ri: number, ci: number, value: string) {
    const next = rows.map((r) => [...r]);
    next[ri][ci] = value;
    onChange({ rows: next });
  }

  function addColumn() {
    onChange({
      headers: [...headers, ''],
      rows: rows.map((r) => [...r, '']),
    });
  }

  function removeColumn(index: number) {
    if (headers.length <= 1) return;
    onChange({
      headers: headers.filter((_, i) => i !== index),
      rows: rows.map((r) => r.filter((_, i) => i !== index)),
    });
  }

  function addRow() {
    onChange({ rows: [...rows, headers.map(() => '')] });
  }

  function removeRow(index: number) {
    onChange({ rows: rows.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="p-0">
                  <div className="flex items-center gap-1">
                    <input
                      className="w-full px-2 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-primary-500 outline-none"
                      placeholder={lang === 'he' ? `כותרת ${i + 1}` : `Header ${i + 1}`}
                      value={h}
                      onChange={(e) => updateHeader(i, e.target.value)}
                    />
                    {headers.length > 1 && (
                      <button onClick={() => removeColumn(i)} className="text-red-400 hover:text-red-600 shrink-0 p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className="p-0.5">
                    <input
                      className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-400 focus:ring-1 focus:ring-primary-500 outline-none"
                      value={cell}
                      onChange={(e) => updateCell(ri, ci, e.target.value)}
                    />
                  </td>
                ))}
                <td className="w-8 text-center">
                  <button onClick={() => removeRow(ri)} className="text-red-400 hover:text-red-600 p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3">
        <button onClick={addRow} className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium">
          <PlusCircle className="w-3.5 h-3.5" />
          {lang === 'he' ? 'הוספת שורה' : 'Add row'}
        </button>
        <button onClick={addColumn} className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium">
          <PlusCircle className="w-3.5 h-3.5" />
          {lang === 'he' ? 'הוספת עמודה' : 'Add column'}
        </button>
      </div>
    </div>
  );
}

/* ── Cards Editor ── */

function CardsEditor({ content, onChange, lang }: { content: ParsedContent; onChange: (p: Partial<ParsedContent>) => void; lang: string }) {
  const cards = (content.cards as { title: string; description: string }[]) || [];

  function updateCard(index: number, field: 'title' | 'description', value: string) {
    const next = cards.map((c, i) => i === index ? { ...c, [field]: value } : c);
    onChange({ cards: next });
  }

  function addCard() {
    onChange({ cards: [...cards, { title: '', description: '' }] });
  }

  function removeCard(index: number) {
    onChange({ cards: cards.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cards.map((card, i) => (
          <div key={i} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 relative group">
            <button
              onClick={() => removeCard(i)}
              className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <input
              className="input text-sm font-medium"
              placeholder={lang === 'he' ? 'כותרת הכרטיס' : 'Card title'}
              value={card.title}
              onChange={(e) => updateCard(i, 'title', e.target.value)}
            />
            <textarea
              className="input text-xs resize-none"
              rows={2}
              placeholder={lang === 'he' ? 'תיאור' : 'Description'}
              value={card.description}
              onChange={(e) => updateCard(i, 'description', e.target.value)}
            />
          </div>
        ))}
      </div>
      <button onClick={addCard} className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium">
        <PlusCircle className="w-3.5 h-3.5" />
        {lang === 'he' ? 'הוספת כרטיס' : 'Add card'}
      </button>
    </div>
  );
}
