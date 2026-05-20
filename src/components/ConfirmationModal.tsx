import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './CommonUI';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info' | 'success';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'warning'
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-text-primary/60 backdrop-blur-sm shadow-2xl"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-bg-surface w-full max-w-sm rounded-[1.5rem] border border-border-main p-6 shadow-2xl relative overflow-hidden"
          >
            {/* Background Accent */}
            <div className={cn(
              "absolute top-0 left-0 right-0 h-1",
              type === 'danger' && "bg-error",
              type === 'warning' && "bg-brand-gold",
              type === 'info' && "bg-info",
              type === 'success' && "bg-success"
            )} />

            <div className="flex flex-col items-center text-center">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center mb-4 border-4",
                type === 'danger' && "bg-error/10 text-error border-error/20",
                type === 'warning' && "bg-brand-gold/10 text-brand-gold border-brand-gold/20",
                type === 'info' && "bg-info/10 text-info border-info/20",
                type === 'success' && "bg-success/10 text-success border-success/20"
              )}>
                {type === 'danger' && <AlertCircle className="w-6 h-6" />}
                {type === 'warning' && <AlertCircle className="w-6 h-6" />}
                {type === 'info' && <Info className="w-6 h-6" />}
                {type === 'success' && <CheckCircle2 className="w-6 h-6" />}
              </div>
              
              <h3 className="text-xl font-bold text-text-primary mb-2 tracking-tight">{title}</h3>
              <p className="text-sm text-text-secondary mb-6">{message}</p>
              
              <div className="flex gap-3 w-full">
                <Button 
                  variant="outline" 
                  onClick={onCancel}
                  className="flex-1 font-bold rounded-xl bg-bg-surface hover:bg-bg-main hover:text-text-primary"
                >
                  {cancelText}
                </Button>
                <Button 
                  onClick={() => {
                    onConfirm();
                  }}
                  variant={type === 'danger' ? 'danger' : type === 'warning' ? 'gold' : 'primary'}
                  className="flex-1 font-bold rounded-xl text-bg-main"
                >
                  {confirmText}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;
