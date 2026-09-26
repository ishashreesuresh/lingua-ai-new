import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div
        className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md ${
          toast.type === 'success'
            ? 'bg-neutral-900/95 dark:bg-neutral-100/95 text-white dark:text-neutral-900 border-neutral-800 dark:border-neutral-200'
            : toast.type === 'error'
            ? 'bg-rose-950/95 dark:bg-rose-50/95 text-rose-100 dark:text-rose-900 border-rose-800 dark:border-rose-200'
            : 'bg-neutral-900/95 dark:bg-neutral-100/95 text-white dark:text-neutral-900 border-neutral-800 dark:border-neutral-200'
        }`}
      >
        {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
        {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
        {toast.type === 'info' && <Info className="w-5 h-5 text-[#6842E8] shrink-0 mt-0.5" />}

        <div className="flex-1 text-sm font-medium leading-relaxed">{toast.message}</div>

        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-200 dark:hover:text-neutral-800 transition-colors p-0.5 rounded"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
