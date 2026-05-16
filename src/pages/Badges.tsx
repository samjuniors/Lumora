import React, { useState } from 'react';
import { Achievements } from '../components/Achievements';
import { BadgeList } from '../components/BadgeList';
import { motion, AnimatePresence } from 'motion/react';
import { Award, Sparkles, Trophy } from 'lucide-react';
import { cn } from '../lib/utils';

export const Badges = () => {
    const [activeTab, setActiveTab] = useState<'badges' | 'achievements'>('badges');

    return (
        <div className="max-w-6xl mx-auto w-full space-y-6 pb-8">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-navy-900 p-8 md:p-12 rounded-[2.5rem] border border-brand-gold/20 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-glow-gold"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/5 rounded-full blur-[60px] -mr-20 -mt-20 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-[40px] -ml-10 -mb-10 pointer-events-none"></div>

                <div className="w-20 h-20 md:w-24 md:h-24 bg-navy-950 rounded-[2rem] flex items-center justify-center mb-8 border border-brand-gold/20 shadow-inner relative group cursor-pointer transition-all hover:scale-105 active:scale-95 ring-1 ring-brand-gold/30">
                    <Award className="w-10 h-10 md:w-12 md:h-12 text-brand-gold relative z-10" />
                    <Sparkles className="w-5 h-5 text-brand-gold absolute -top-2 -right-2 motion-safe:animate-pulse" />
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-7xl font-display font-bold text-white tracking-tight mb-4">
                    Recognition & Achievements
                </h1>
                <p className="text-text-muted text-base md:text-xl font-medium max-w-2xl leading-relaxed">
                    Showcase your academic dominance through earned badges and unlock elite status markers.
                </p>
                
                <div className="flex bg-navy-950 p-1.5 rounded-2xl md:rounded-[2rem] border border-navy-700/50 mt-10 shadow-soft">
                  <button
                    onClick={() => setActiveTab('badges')}
                    className={cn(
                      "px-6 md:px-10 py-3 md:py-4 rounded-xl md:rounded-[1.5rem] font-bold text-sm md:text-lg transition-all duration-300 flex items-center gap-2",
                      activeTab === 'badges' ? "bg-navy-800 text-brand-gold shadow-glow-gold/10 border border-brand-gold/20" : "text-text-muted hover:text-white"
                    )}
                  >
                    <Award className="w-5 h-5" /> Hall of Honor
                  </button>
                  <button
                    onClick={() => setActiveTab('achievements')}
                    className={cn(
                      "px-6 md:px-10 py-3 md:py-4 rounded-xl md:rounded-[1.5rem] font-bold text-sm md:text-lg transition-all duration-300 flex items-center gap-2",
                      activeTab === 'achievements' ? "bg-navy-800 text-brand-gold shadow-glow-gold/10 border border-brand-gold/20" : "text-text-muted hover:text-white"
                    )}
                  >
                    <Trophy className="w-5 h-5" /> Milestones
                  </button>
                </div>
            </motion.div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                >
                    {activeTab === 'achievements' ? <Achievements /> : <BadgeList />}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};
