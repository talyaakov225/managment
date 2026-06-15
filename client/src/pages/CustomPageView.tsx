import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileX } from 'lucide-react';
import { navPublicApi } from '../services/adminApi';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import type { CustomPage } from '../types/admin';

export function CustomPageView() {
  const { slug } = useParams<{ slug: string }>();
  const { lang } = useLang();
  const { user } = useAuth();
  const isAdmin = user?.globalRole === 'ADMIN' || user?.globalRole === 'SUPER_ADMIN';
  const [page, setPage] = useState<CustomPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(false);
    navPublicApi.getPage(slug.toLowerCase())
      .then((res) => setPage(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto text-center py-20">
        <FileX className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
          {lang === 'he' ? 'הדף לא נמצא' : 'Page not found'}
        </p>
        <p className="text-sm text-slate-400 mb-6">
          {lang === 'he' ? `הדף "${slug}" לא קיים או לא פורסם עדיין.` : `The page "${slug}" does not exist or is not published yet.`}
        </p>
        {isAdmin && (
          <Link to="/admin/pages" className="btn-primary inline-flex items-center gap-2">
            {lang === 'he' ? 'צור דף חדש בפאנל הניהול' : 'Create page in Admin Panel'}
          </Link>
        )}
      </div>
    );
  }

  const title = lang === 'he' ? page.title_he : page.title_en;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">{title}</h1>
        {page.description && (
          <p className="text-slate-500 mb-8">{page.description}</p>
        )}

        <div className="space-y-6">
          {page.blocks.map((block) => {
            let content: Record<string, unknown> = {};
            try { content = JSON.parse(block.content); } catch { /* empty */ }

            return <PageBlockRenderer key={block.id} type={block.type} content={content} />;
          })}
        </div>
      </motion.div>
    </div>
  );
}

function PageBlockRenderer({ type, content }: { type: string; content: Record<string, unknown> }) {
  switch (type) {
    case 'heading': {
      const level = (content.level as number) || 2;
      const text = content.text as string || '';
      if (level === 1) return <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{text}</h1>;
      if (level === 3) return <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{text}</h3>;
      return <h2 className="text-xl font-bold text-slate-900 dark:text-white">{text}</h2>;
    }
    case 'text':
      return <p className="text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{content.text as string}</p>;
    case 'divider':
      return <hr className="border-slate-200 dark:border-slate-700" />;
    case 'list':
      return (
        <ul className="space-y-2">
          {(content.items as string[] || []).map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 shrink-0" />
              <span className="text-slate-600 dark:text-slate-400">{item}</span>
            </li>
          ))}
        </ul>
      );
    case 'table':
      return (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                {(content.headers as string[] || []).map((h, i) => (
                  <th key={i} className="text-start p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(content.rows as string[][] || []).map((row, ri) => (
                <tr key={ri} className="border-b border-slate-100 dark:border-slate-800">
                  {row.map((cell, ci) => (
                    <td key={ci} className="p-3 text-slate-600 dark:text-slate-400">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'cards':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(content.cards as { title: string; description: string; icon?: string }[] || []).map((card, i) => (
            <div key={i} className="card p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{card.title}</h3>
              <p className="text-sm text-slate-500">{card.description}</p>
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}
