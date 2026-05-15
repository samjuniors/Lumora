import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Download, X, Sparkles } from 'lucide-react';
import { usePWAUpdate } from '../hooks/usePWAUpdate';

export const PWAUpdatePrompt = () => {
    const { updateAvailable, updateApp } = usePWAUpdate();

    return (
        <AnimatePresence>
            {updateAvailable && (
                <motion.div
                    key="pwa-update-prompt"
                    initial={{ y: 50, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 50, opacity: 0, scale: 0.9 }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm"
                >
                    <div
                        className="bg-text-primary border border-white/10 rounded-[28px] p-4 shadow-2xl shadow-brand-gold/20 backdrop-blur-xl relative overflow-hidden group"
                    >
                        {/* Background flare */}
                        <div className="absolute -top-12 -right-12 w-24 h-24 bg-brand-gold/20 blur-3xl group-hover:bg-brand-gold/30 transition-all duration-700" />
                        
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 bg-brand-gold rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/40">
                                <RefreshCw className="text-bg-main animate-spin-slow" size={24} />
                            </div>
                            
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h4 className="text-bg-main font-black text-sm tracking-tight uppercase">Update Ready</h4>
                                    <Sparkles size={12} className="text-indigo-400" />
                                </div>
                                <p className="text-text-secondary/80 text-[11px] font-bold leading-tight uppercase tracking-widest">A new version of Lumina is available</p>
                            </div>
                            
                            <button 
                                onClick={updateApp}
                                className="bg-bg-surface hover:bg-indigo-400 hover:text-bg-main text-text-primary px-4 py-2.5 rounded-xl font-black text-xs transition-all active:scale-95 shadow-md flex items-center gap-2 shrink-0"
                            >
                                RELOAD <Download size={14} />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
