import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Check, ArrowRight, Sparkles, X, Star, Bell, Shield } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbProvider';

export const VersionUpdateModal = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const VERSION = "2.0.3";

    useEffect(() => {
        const lastSeenLocal = localStorage.getItem('last_seen_version');
        const lastSeenUser = user?.lastSeenVersion;
        
        if (lastSeenLocal !== VERSION && lastSeenUser !== VERSION) {
            const timer = setTimeout(() => setIsOpen(true), 1500);
            return () => clearTimeout(timer);
        }
    }, [user?.lastSeenVersion]);

    const handleClose = async () => {
        localStorage.setItem('last_seen_version', VERSION);
        setIsOpen(false);
        
        if (user?.id) {
            try {
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
        { icon: <Zap className="text-amber-500" />, title: "Super Admin Minting", desc: "Instantly issue coins without verification hassles through the wallet console." },
        { icon: <Bell className="text-brand-gold" />, title: "Sleek Mobile UI", desc: "A brand new, compact, card-shuffle admin menu tailored for small screens." },
        { icon: <Star className="text-purple-500" />, title: "Inline Economy Audit", desc: "Admins can seamlessly adjust transaction values without disruptive popups." },
        { icon: <Shield className="text-emerald-500" />, title: "Bug Fixes", desc: "Resolved wallet scrolling issues and hid irrelevant profile stats for admins." }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    key="version-modal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-text-primary/80 backdrop-blur-xl"
                >
                    
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 40 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 40 }}
                        className="bg-bg-surface border border-border-main rounded-[40px] w-full max-w-xl relative z-10 overflow-hidden shadow-2xl flex flex-col md:flex-row"
                    >
                        <div className="md:w-2/5 bg-text-primary p-8 flex flex-col justify-between text-bg-main relative">
                            <div className="absolute top-0 right-0 w-full h-full bg-brand-gold/10 pointer-events-none" />
                            <div className="relative">
                                <div className="inline-flex items-center gap-2 bg-brand-gold/20 text-brand-gold px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-brand-gold/20">
                                    System Protocol
                                </div>
                                <h2 className="text-5xl font-black tracking-tighter leading-none mb-1">V{VERSION}</h2>
                                <p className="text-brand-gold text-sm font-bold uppercase tracking-widest">Quality Patch</p>
                            </div>
                            <div className="bg-bg-surface/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                                <p className="text-[10px] text-bg-main/40 font-bold uppercase tracking-[0.2em] mb-2 leading-none">Security Status</p>
                                <div className="flex items-center gap-2 text-emerald-400 font-black text-xs">
                                    <Shield size={14} /> SYSTEM STABLE
                                </div>
                            </div>
                        </div>

                        <div className="md:w-3/5 p-8 md:p-12">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h3 className="text-2xl font-black text-text-primary tracking-tight">Mission Update</h3>
                                    <p className="text-xs text-text-secondary font-bold uppercase tracking-widest mt-1">Version {VERSION} Global Rollout</p>
                                </div>
                                <X className="text-text-secondary hover:text-text-primary cursor-pointer" onClick={handleClose} />
                            </div>

                            <div className="space-y-6 mb-10">
                                {updates.map((upd, i) => (
                                    <div key={i} className="flex gap-4 group">
                                        <div className="w-10 h-10 bg-bg-main rounded-xl flex items-center justify-center shrink-0 border border-border-main group-hover:bg-bg-surface group-hover:shadow-md transition-all">
                                            {upd.icon}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-text-primary text-sm">{upd.title}</h4>
                                            <p className="text-xs text-text-secondary font-medium leading-relaxed">{upd.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button 
                                onClick={handleClose}
                                className="w-full bg-brand-gold hover:bg-brand-gold-hover text-bg-main font-black py-5 rounded-[22px] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-brand-gold/20"
                            >
                                Continue to Dashboard <ArrowRight size={20} />
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
