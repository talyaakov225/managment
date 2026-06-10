import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, Trash2, GripVertical, ArrowRight, ArrowLeft,
  Type, Table, LayoutGrid, List, Minus, Heading,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminPagesApi } from '../../services/adminApi';
import { useLang } from '../../context/LangContext';
import { Modal } from '../../components/Modal';
import type { CustomPage, PageBlock } from '../../types/admin';

const BLOCK_TYPES = [
  { type: 'heading', icon: Heading, label: 'Heading' },
  { type: 'text', icon: Type, label: 'Text' },
  { type: 'table', icon: Table, label: 'Table' },
  { type: 'cards', icon: LayoutGrid, label: 'Cards' },
  { type: 'list', icon: List, label: 'List' },
  { type: 'divider', icon: Minus, label: 'Divider' },
];

function getDefaultContent(type: string): string {
  switch (type) {
    case 'heading': return JSON.stringify({ text: 'כותרת חדשה', level: 2 });
    case 'text': return JSON.stringify({ text: 'טקסט חדש כאן...' });
    case 'table': return JSON.stringify({ headers: ['עמודה 1', 'עמודה 2'], rows: [['תא 1', 'תא 2']] });
    case 'cards': return JSON.stringify({ cards: [{ title: 'כרטיס 1', description: 'תיאור', icon: 'Star' }] });
    case 'list': return JSON.stringify({ items: ['פריט 1', 'פריט 2', 'פריט 3'] });
    case 'divider': return JSON.stringify({});
    default: return '{}';
  }
}

export function PageBlockEditor() {
  const { id } = useParams<{ id: string }>();
  const { t, isRTL } = useLang();
  const navigate = useNavigate();
  const [page, setPage] = useState<CustomPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [editingBlock, setEditingBlock] = useState<PageBlock | null>(null);
  const [editContent, setEditContent] = useState('');

  const BackIcon = isRTL ? ArrowLeft : ArrowRight;

  useEffect(() => { if (id) load(); }, [id]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await adminPagesApi.getById(id!);
      setPage(data);
    } finally { setLoading(false); }
  }

  async function handleAddBlock(type: string) {
    try {
      await adminPagesApi.createBlock(id!, { type, content: getDefaultContent(type) });
      toast.success(t.admin.created);
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

  async function handleSaveBlock() {
    if (!editingBlock) return;
    try {
      JSON.parse(editContent);
    } catch {
      toast.error('Invalid JSON');
      return;
    }
    try {
      await adminPagesApi.updateBlock(id!, editingBlock.id, { content: editContent });
      toast.success(t.common.saved);
      setEditingBlock(null);
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

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/admin/pages')} className="btn-ghost p-2">
            <BackIcon className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{page.title_he}</h1>
            <p className="text-sm text-slate-400 font-mono">/{page.slug}</p>
          </div>
          <button onClick={() => setShowAddBlock(true)} className="btn-primary">
            <Plus className="w-4 h-4" />{t.admin.addBlock}
          </button>
        </div>

        <div className="space-y-4">
          {page.blocks.map((block) => {
            let parsed: Record<string, unknown> = {};
            try { parsed = JSON.parse(block.content); } catch { /* keep empty */ }

            return (
              <div key={block.id} className="card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />
                  <span className="text-xs font-bold uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{block.type}</span>
                  <div className="flex-1" />
                  <button
                    onClick={() => { setEditingBlock(block); setEditContent(JSON.stringify(parsed, null, 2)); }}
                    className="btn-ghost p-1.5 text-primary-500"
                  >
                    <Type className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteBlock(block.id)} className="btn-ghost p-1.5 text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <BlockPreview type={block.type} content={parsed} />
              </div>
            );
          })}

          {page.blocks.length === 0 && (
            <div className="card p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
              <p className="text-slate-400 mb-3">{t.admin.noBlocks}</p>
              <button onClick={() => setShowAddBlock(true)} className="btn-primary">
                <Plus className="w-4 h-4" />{t.admin.addBlock}
              </button>
            </div>
          )}
        </div>

        <Modal isOpen={showAddBlock} onClose={() => setShowAddBlock(false)} title={t.admin.addBlock} size="sm">
          <div className="grid grid-cols-2 gap-3">
            {BLOCK_TYPES.map((bt) => (
              <button
                key={bt.type}
                onClick={() => handleAddBlock(bt.type)}
                className="card p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow cursor-pointer"
              >
                <bt.icon className="w-6 h-6 text-primary-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{bt.label}</span>
              </button>
            ))}
          </div>
        </Modal>

        <Modal isOpen={!!editingBlock} onClose={() => setEditingBlock(null)} title={t.admin.editBlock} size="md">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">JSON Content</label>
              <textarea
                className="input resize-none font-mono text-sm"
                dir="ltr"
                rows={12}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditingBlock(null)} className="btn-secondary flex-1">{t.common.cancel}</button>
              <button onClick={handleSaveBlock} className="btn-primary flex-1">{t.common.save}</button>
            </div>
          </div>
        </Modal>
      </motion.div>
    </div>
  );
}

function BlockPreview({ type, content }: { type: string; content: Record<string, unknown> }) {
  switch (type) {
    case 'heading':
      return <h2 className="text-lg font-bold text-slate-900 dark:text-white">{content.text as string || 'Heading'}</h2>;
    case 'text':
      return <p className="text-sm text-slate-600 dark:text-slate-400">{content.text as string || 'Text block'}</p>;
    case 'divider':
      return <hr className="border-slate-200 dark:border-slate-700" />;
    case 'list':
      return (
        <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
          {(content.items as string[] || []).map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      );
    case 'table':
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>{(content.headers as string[] || []).map((h, i) => <th key={i} className="text-start p-2 text-slate-500 border-b border-slate-200 dark:border-slate-700">{h}</th>)}</tr>
            </thead>
            <tbody>
              {(content.rows as string[][] || []).map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => <td key={ci} className="p-2 text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'cards':
      return (
        <div className="grid grid-cols-2 gap-3">
          {(content.cards as { title: string; description: string }[] || []).map((card, i) => (
            <div key={i} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <p className="text-sm font-medium text-slate-900 dark:text-white">{card.title}</p>
              <p className="text-xs text-slate-500">{card.description}</p>
            </div>
          ))}
        </div>
      );
    default:
      return <p className="text-xs text-slate-400">{JSON.stringify(content).slice(0, 200)}</p>;
  }
}
