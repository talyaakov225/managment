import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Heading1, Heading2, Heading3,
  Quote, Code, Highlighter, Palette,
  Table as TableIcon, ListChecks, Undo2, Redo2, Minus,
} from 'lucide-react';
import { useLang } from '../context/LangContext';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  editable?: boolean;
}

const COLORS = [
  '#000000', '#4B5563', '#DC2626', '#EA580C', '#D97706',
  '#16A34A', '#2563EB', '#7C3AED', '#DB2777', '#0891B2',
];

const HIGHLIGHT_COLORS = [
  '#FEF08A', '#BBF7D0', '#BFDBFE', '#DDD6FE', '#FBCFE8',
  '#FED7AA', '#99F6E4', '#E5E7EB',
];

function MenuBar({ editor }: { editor: Editor }) {
  const { t } = useLang();

  return (
    <div className="flex flex-wrap gap-0.5 p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
      <ToolGroup>
        <ToolBtn icon={<Undo2 className="w-4 h-4" />} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title={t.editor.undo} />
        <ToolBtn icon={<Redo2 className="w-4 h-4" />} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title={t.editor.redo} />
      </ToolGroup>

      <Divider />

      <ToolGroup>
        <ToolBtn icon={<Heading1 className="w-4 h-4" />} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title={t.editor.heading1} />
        <ToolBtn icon={<Heading2 className="w-4 h-4" />} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title={t.editor.heading2} />
        <ToolBtn icon={<Heading3 className="w-4 h-4" />} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title={t.editor.heading3} />
      </ToolGroup>

      <Divider />

      <ToolGroup>
        <ToolBtn icon={<Bold className="w-4 h-4" />} onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title={t.editor.bold} />
        <ToolBtn icon={<Italic className="w-4 h-4" />} onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title={t.editor.italic} />
        <ToolBtn icon={<UnderlineIcon className="w-4 h-4" />} onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title={t.editor.underline} />
        <ToolBtn icon={<Strikethrough className="w-4 h-4" />} onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title={t.editor.strikethrough} />
        <ToolBtn icon={<Code className="w-4 h-4" />} onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title={t.editor.code} />
      </ToolGroup>

      <Divider />

      <ToolGroup>
        <ColorPicker
          icon={<Palette className="w-4 h-4" />}
          colors={COLORS}
          onSelect={(color) => editor.chain().focus().setColor(color).run()}
          onClear={() => editor.chain().focus().unsetColor().run()}
          title={t.editor.textColor}
        />
        <ColorPicker
          icon={<Highlighter className="w-4 h-4" />}
          colors={HIGHLIGHT_COLORS}
          onSelect={(color) => editor.chain().focus().toggleHighlight({ color }).run()}
          onClear={() => editor.chain().focus().unsetHighlight().run()}
          title={t.editor.highlight}
          isHighlight
        />
      </ToolGroup>

      <Divider />

      <ToolGroup>
        <ToolBtn icon={<List className="w-4 h-4" />} onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title={t.editor.bulletList} />
        <ToolBtn icon={<ListOrdered className="w-4 h-4" />} onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title={t.editor.orderedList} />
        <ToolBtn icon={<ListChecks className="w-4 h-4" />} onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title={t.editor.taskList} />
      </ToolGroup>

      <Divider />

      <ToolGroup>
        <ToolBtn icon={<Quote className="w-4 h-4" />} onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title={t.editor.blockquote} />
        <ToolBtn icon={<Minus className="w-4 h-4" />} onClick={() => editor.chain().focus().setHorizontalRule().run()} title={t.editor.divider} />
      </ToolGroup>

      <Divider />

      <ToolGroup>
        <ToolBtn
          icon={<TableIcon className="w-4 h-4" />}
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title={t.editor.insertTable}
        />
        {editor.isActive('table') && (
          <>
            <ToolBtn icon={<span className="text-[10px] font-bold leading-none">+C</span>} onClick={() => editor.chain().focus().addColumnAfter().run()} title={t.editor.addColumn} />
            <ToolBtn icon={<span className="text-[10px] font-bold leading-none">+R</span>} onClick={() => editor.chain().focus().addRowAfter().run()} title={t.editor.addRow} />
            <ToolBtn icon={<span className="text-[10px] font-bold leading-none text-red-400">-C</span>} onClick={() => editor.chain().focus().deleteColumn().run()} title={t.editor.deleteColumn} />
            <ToolBtn icon={<span className="text-[10px] font-bold leading-none text-red-400">-R</span>} onClick={() => editor.chain().focus().deleteRow().run()} title={t.editor.deleteRow} />
            <ToolBtn icon={<span className="text-[10px] font-bold leading-none text-red-500">×T</span>} onClick={() => editor.chain().focus().deleteTable().run()} title={t.editor.deleteTable} />
          </>
        )}
      </ToolGroup>
    </div>
  );
}

function ToolGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function Divider() {
  return <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />;
}

function ToolBtn({ icon, onClick, active, disabled, title }: {
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-md transition-all ${
        active
          ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
      } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    >
      {icon}
    </button>
  );
}

function ColorPicker({ icon, colors, onSelect, onClear, title, isHighlight }: {
  icon: React.ReactNode;
  colors: string[];
  onSelect: (color: string) => void;
  onClear: () => void;
  title?: string;
  isHighlight?: boolean;
}) {
  return (
    <div className="relative group">
      <button type="button" className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700" title={title}>
        {icon}
      </button>
      <div className="absolute start-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-50 hidden group-hover:block min-w-[140px]">
        <div className="grid grid-cols-5 gap-1 mb-1.5">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onSelect(color)}
              className={`w-6 h-6 rounded-md border border-slate-200 dark:border-slate-600 hover:scale-110 transition-transform ${isHighlight ? '' : ''}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="w-full text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 py-1 text-center"
        >
          {title ? '✕' : '✕'}
        </button>
      </div>
    </div>
  );
}

export function RichTextEditor({ content, onChange, editable = true }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true, lastColumnResizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      TextStyle,
      Color,
    ],
    content,
    editable,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  if (!editor) return null;

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      {editable && <MenuBar editor={editor} />}
      <div className="overflow-x-auto">
        <EditorContent
          editor={editor}
          className={`prose prose-sm dark:prose-invert max-w-none p-4 min-h-[120px] focus:outline-none [&_table]:text-[13px] ${editable ? '' : 'cursor-default'}`}
        />
      </div>
    </div>
  );
}

export function RichTextViewer({ content }: { content: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      TextStyle,
      Color,
    ],
    content,
    editable: false,
  });

  if (!editor) return null;

  return (
    <div className="overflow-x-auto">
      <EditorContent
        editor={editor}
        className="prose prose-sm dark:prose-invert max-w-none [&_table]:text-[13px]"
      />
    </div>
  );
}
