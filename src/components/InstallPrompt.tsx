import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, ArrowUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    // Detect OS and Browser
    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua);
    const mac = /Macintosh/.test(ua) && !ios;
    const safari = /^((?!chrome|android).)*safari/i.test(ua);
    
    setIsIOS(ios);
    setIsMac(mac);
    setIsSafari(safari);

    // Check if already in standalone mode
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    // Check if dismissed recently (wait 3 days)
    const lastPrompt = localStorage.getItem('install_prompt_dismissed');
    const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
    if (lastPrompt && Date.now() - parseInt(lastPrompt) < THREE_DAYS) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // For Chrome/Android, show standard prompt after 5s delay to be less intrusive
      const timer = setTimeout(() => setShowPrompt(true), 5000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS/Safari where beforeinstallprompt won't fire
    if ((ios || (mac && safari)) && !deferredPrompt) {
        const timer = setTimeout(() => setShowPrompt(true), 5000);
        return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response: ${outcome}`);
      setDeferredPrompt(null);
      setShowPrompt(false);
      if (outcome === 'accepted') {
        localStorage.setItem('install_prompt_dismissed', Date.now().toString());
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('install_prompt_dismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  // iOS / Safari Mac Flow
  if (isIOS || (isMac && isSafari)) {
    return (
      <AnimatePresence>
        <motion.div
           key="ios-prompt"
           initial={{ opacity: 0, y: 50 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: 50 }}
           className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[1000] px-4 w-full max-w-sm"
        >
          <div className="bg-bg-surface rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-6 border border-border-main flex flex-col gap-4 relative">
            <button 
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1 text-text-secondary/80 hover:text-text-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-brand-gold-hover rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200">
                <Download className="w-7 h-7 text-bg-main" />
              </div>
              <div>
                <h4 className="font-black text-text-primary text-lg">Install Lumora</h4>
                <p className="text-xs text-text-secondary font-medium leading-relaxed">Add to Home Screen for the best experience</p>
              </div>
            </div>

            <div className="space-y-3 bg-bg-main p-4 rounded-2xl border border-border-main">
                <div className="flex items-center gap-3 text-sm font-bold text-text-secondary">
                    <div className="w-6 h-6 rounded-full bg-bg-surface flex items-center justify-center border border-border-main text-[10px]">1</div>
                    <p className="flex items-center gap-1.5">
                        Tap <Share className="w-4 h-4 text-brand-gold" /> {isMac ? 'in Safari' : 'on the menu'}
                    </p>
                </div>
                <div className="flex items-center gap-3 text-sm font-bold text-text-secondary">
                    <div className="w-6 h-6 rounded-full bg-bg-surface flex items-center justify-center border border-border-main text-[10px]">2</div>
                    <p className="flex items-center gap-1.5">
                        Choose <PlusSquare className="w-4 h-4 text-brand-gold" /> {isMac ? 'Add to Dock' : 'Add to Home Screen'}
                    </p>
                </div>
            </div>

            <p className="text-[10px] text-center text-text-secondary/80 font-black uppercase tracking-widest">
                Safe & Fast • No App Store needed
            </p>
          </div>
          {isIOS && (
            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="flex justify-center mt-2"
            >
              <div className="bg-brand-gold-hover p-2 rounded-full shadow-lg">
                <ArrowUp className="w-5 h-5 text-bg-main" />
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    );
  }

  // Standard (Chrome/Android/Windows) Flow
  return (
    <AnimatePresence>
      <motion.div
        key="standard-prompt"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[1000] px-4 w-full max-w-sm"
      >
        <div className="bg-bg-surface rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-6 border border-border-main flex flex-col gap-5">
          <div className="flex items-center gap-4 w-full">
            <div className="w-14 h-14 bg-brand-gold-hover rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200">
              <Download className="w-7 h-7 text-bg-main" />
            </div>
            <div className="flex-1">
              <h4 className="font-black text-text-primary text-lg">Install Lumina</h4>
              <p className="text-xs text-text-secondary font-medium">Fast access from your home screen</p>
            </div>
          </div>
          <div className="flex gap-3 w-full">
            <button
              onClick={handleDismiss}
              className="flex-1 px-4 py-3 bg-border-main hover:bg-border-main text-text-secondary rounded-2xl text-sm font-bold transition active:scale-95"
            >
              Not Now
            </button>
            <button
              onClick={handleInstallClick}
              className="flex-1 px-4 py-3 bg-brand-gold-hover hover:bg-indigo-700 text-bg-main rounded-2xl text-sm font-bold transition shadow-lg shadow-indigo-600/30 active:scale-95"
            >
              Install App
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

