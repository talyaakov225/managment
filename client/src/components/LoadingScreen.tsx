import { motion } from 'framer-motion';

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <motion.img
          src="/assets/לוגו תקשורת חדש.svg"
          alt="Logo"
          className="w-14 h-14 object-contain"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <p className="text-slate-500 dark:text-slate-400 font-medium">רמי לוי תקשורת</p>
      </motion.div>
    </div>
  );
}
