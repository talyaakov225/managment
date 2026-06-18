import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowRight } from 'lucide-react';
import { useLang } from '../context/LangContext';

export function NotFoundPage() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const he = lang === 'he';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="text-8xl font-black text-primary-500/20 mb-4">404</div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {he ? 'הדף לא נמצא' : 'Page Not Found'}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          {he ? 'הדף שחיפשת לא קיים או שהוסר.' : 'The page you\'re looking for doesn\'t exist or has been removed.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary px-5 py-2.5 flex items-center gap-2"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            {he ? 'חזרה' : 'Go Back'}
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary px-5 py-2.5 flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            {he ? 'דף הבית' : 'Home'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
