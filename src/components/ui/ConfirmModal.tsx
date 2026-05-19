import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
}

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary'
}: ConfirmModalProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-bg-surface border border-white/5 rounded-[2rem] shadow-premium overflow-hidden z-[10000]"
          >
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-center mb-6">
                <div className={cn(
                  "w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg",
                  variant === 'danger' ? "bg-rose-500/10 text-rose-500" :
                  variant === 'warning' ? "bg-amber-500/10 text-amber-500" :
                  "bg-brand-gold/10 text-brand-gold"
                )}>
                  <AlertCircle className="w-8 h-8" />
                </div>
              </div>

              <h3 className="text-xl font-black text-center text-text-primary uppercase tracking-tight mb-2">
                {title}
              </h3>
              <p className="text-sm text-center text-text-secondary leading-relaxed mb-8">
                {message}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={onClose}
                  className="py-4 px-6 bg-white/5 hover:bg-white/10 text-text-primary font-bold rounded-2xl transition-all active:scale-95 border border-white/5"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={cn(
                    "py-4 px-6 font-black rounded-2xl transition-all active:scale-95 shadow-lg",
                    variant === 'danger' ? "bg-rose-500 hover:bg-rose-600 text-white" :
                    variant === 'warning' ? "bg-amber-500 hover:bg-amber-600 text-bg-main" :
                    "bg-brand-gold hover:bg-brand-gold/90 text-bg-main"
                  )}
                >
                  {confirmText}
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-text-secondary/50 hover:text-white rounded-full hover:bg-white/5 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
