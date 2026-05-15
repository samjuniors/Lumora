import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Check, ArrowRight, Sparkles, X, Star, Bell, Shield } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbProvider';

export const VersionUpdateModal = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const VERSION = "2.1.0";

    useEffect(() => {
        const lastSeenLocal = localStorage.getItem('last_seen_version');
        
        // Show only if the version has changed and not yet seen locally
        if (lastSeenLocal !== VERSION) {
            const timer = setTimeout(() => setIsOpen(true), 1200);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = async () => {
        localStorage.setItem('last_seen_version', VERSION);
        setIsOpen(false);
        
        if (user?.id) {
            try {
                // Also persist to DB to stay synced across sessions
                await dbService.updateUser(user.id, {
                    lastSeenVersion: VERSION,
                    updatedAt: Date.now()
                });
            } catch (err) {
                console.error("Failed to update version seen status", err);
            }
        }
    };

    const updates = [
        { icon: <Zap className="text-brand-gold" />, title: "Diamond Economy", desc: "Level up by collecting Diamonds from achievements, drops, and transacting with peers." },
        { icon: <Sparkles className="text-brand-gold" />, title: "Peer Boosting", desc: "Send coins to friends; they receive Diamonds 1:1, increasing their tier instantly." },
        { icon: <Shield className="text-brand-gold" />, title: "Pro Dark Mode", desc: "Consolidated system protocols with a sleek, high-contrast professional interface." },
        { icon: <Bell className="text-brand-gold" />, title: "Instant Sync", desc: "Optimized transfer speeds and real-time balance updates across your wallet." }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    key="version-modal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 30 }}
                        className="bg-[#0A0F1A] border border-white/10 rounded-[32px] w-full max-w-sm relative z-10 overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,1)] ring-1 ring-white/5"
                    >
                        {/* Header Banner */}
                        <div className="bg-[#1A2B48] p-6 text-center relative overflow-hidden border-b border-white/5">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-brand-gold/10 blur-[64px] rounded-full" />
                            <div className="relative z-10">
                                <div className="inline-flex items-center gap-1.5 bg-brand-gold/10 text-brand-gold px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-4 border border-brand-gold/20">
                                    <Shield size={10} /> System Protocol
                                </div>
                                <h2 className="text-4xl font-black text-white tracking-tighter leading-none mb-1 italic">V{VERSION}</h2>
                                <p className="text-brand-gold/70 text-[10px] font-black uppercase tracking-[0.2em]">Diamond Update</p>
                            </div>
                        </div>

                        <div className="p-6 md:p-8">
                            <div className="space-y-5 mb-8">
                                {updates.map((upd, i) => (
                                    <div key={i} className="flex gap-4 items-start group">
                                        <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center shrink-0 border border-white/10 group-hover:border-brand-gold/30 transition-colors">
                                            {upd.icon}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm leading-tight mb-0.5">{upd.title}</h4>
                                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{upd.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button 
                                onClick={handleClose}
                                className="w-full bg-brand-gold hover:bg-[#C5A02E] text-[#1A2B48] font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-brand-gold/10 text-sm"
                            >
                                Get Started <ArrowRight size={16} />
                            </button>

                            <p className="text-center text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-4">
                                Auto-Encrypted Handshake Complete
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
