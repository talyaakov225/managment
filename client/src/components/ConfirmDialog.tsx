import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning';
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="sm">
      <div className="text-center">
        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${variant === 'danger' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
          <AlertTriangle className={`w-6 h-6 ${variant === 'danger' ? 'text-red-500' : 'text-amber-500'}`} />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{message}</p>
        <div className="flex items-center gap-3 justify-center">
          <button onClick={onClose} className="btn-secondary px-4 py-2 text-sm">
            {cancelText}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`px-4 py-2 text-sm rounded-xl font-medium text-white transition-colors ${variant === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
