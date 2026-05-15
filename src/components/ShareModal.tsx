import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Share2, Twitter, MessageCircle, Link2, Ghost } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  url?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ 
  isOpen, 
  onClose, 
  title = "Join Lumora Platform", 
  url = "https://app.samjuniors.com" 
}) => {
  const shareText = `🚀 Check out Lumina! The ultimate gamified learning platform. Join me here: ${url}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Join me on Lumina Platform!`,
          url,
        });
        toast.success('Shared successfully!');
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      copyToClipboard();
    }
  };

  const shareViaWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const shareViaTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-text-primary/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-bg-surface rounded-[40px] shadow-2xl p-8 w-full max-w-sm relative z-10 overflow-hidden"
          >
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-brand-gold-secondary-hover rounded-full opacity-50 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-48 h-48 bg-purple-50 rounded-full opacity-50 blur-3xl pointer-events-none" />

            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-text-secondary/80 hover:text-text-primary bg-bg-main hover:bg-border-main rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-200">
                <Share2 className="w-8 h-8 text-bg-main" />
              </div>
              <h2 className="text-2xl font-black text-text-primary tracking-tight">Invite Friends</h2>
              <p className="text-text-secondary font-medium text-sm mt-2">Help others level up their skills on Lumina!</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <button 
                onClick={handleNativeShare}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-bg-main hover:bg-border-main rounded-3xl transition-all border border-border-main hover:scale-105 active:scale-95"
              >
                <div className="w-10 h-10 bg-brand-gold-secondary-hover text-brand-gold rounded-xl flex items-center justify-center">
                  <Ghost className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-text-primary">Native Share</span>
              </button>
              <button 
                onClick={shareViaWhatsApp}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-bg-main hover:bg-border-main rounded-3xl transition-all border border-border-main hover:scale-105 active:scale-95"
              >
                <div className="w-10 h-10 bg-success-green/20 text-emerald-600 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-text-primary">WhatsApp</span>
              </button>
              <button 
                onClick={shareViaTwitter}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-bg-main hover:bg-border-main rounded-3xl transition-all border border-border-main hover:scale-105 active:scale-95"
              >
                <div className="w-10 h-10 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center">
                  <Twitter className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-text-primary">Twitter (X)</span>
              </button>
              <button 
                onClick={copyToClipboard}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-bg-main hover:bg-border-main rounded-3xl transition-all border border-border-main hover:scale-105 active:scale-95"
              >
                <div className="w-10 h-10 bg-brand-gold/20 text-brand-gold rounded-xl flex items-center justify-center">
                  <Link2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-text-primary">Copy Link</span>
              </button>
            </div>

            <div className="bg-bg-main border border-border-main p-4 rounded-2xl">
              <div className="flex items-center justify-between gap-3 overflow-hidden">
                <span className="text-xs font-bold text-text-secondary truncate flex-1">{url}</span>
                <button 
                  onClick={copyToClipboard}
                  className="bg-bg-surface p-2 rounded-xl border border-border-main text-brand-gold hover:bg-brand-gold-secondary-hover transition-colors shadow-sm"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-[10px] font-black text-text-secondary/80 text-center uppercase tracking-widest mt-6">
              Level up together 🚀
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
