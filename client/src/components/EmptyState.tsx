import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
}

function EmptyIllustration({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="relative mb-6">
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-950/40 dark:to-primary-900/20 flex items-center justify-center">
        <Icon className="w-10 h-10 text-primary-400 dark:text-primary-500" />
      </div>
      <div className="absolute -top-2 -end-2 w-6 h-6 rounded-full bg-primary-200 dark:bg-primary-900/50 animate-pulse" />
      <div className="absolute -bottom-1 -start-3 w-4 h-4 rounded-full bg-primary-300/50 dark:bg-primary-800/40 animate-pulse delay-300" />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, compact }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center px-4 ${compact ? 'py-8' : 'py-16'}`}
    >
      {compact ? (
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-slate-400 dark:text-slate-500" />
        </div>
      ) : (
        <EmptyIllustration icon={Icon} />
      )}
      <h3 className={`font-semibold text-slate-700 dark:text-slate-300 mb-1.5 ${compact ? 'text-base' : 'text-lg'}`}>{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs leading-relaxed">{description}</p>
      {action && (
        <button onClick={action.onClick} className="btn-primary mt-5 shadow-lg shadow-primary-500/20">
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
