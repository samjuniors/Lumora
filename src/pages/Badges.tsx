import React, { useState } from 'react';
import { Achievements } from '../components/Achievements';
import { BadgeList } from '../components/BadgeList';
import { motion, AnimatePresence } from 'motion/react';
import { Award, Sparkles, Trophy } from 'lucide-react';
import { cn } from '../lib/utils';

export const Badges = () => {
    const [activeTab, setActiveTab] = useState<'badges' | 'achievements'>('badges');

    return (
        <div className="max-w-6xl mx-auto w-full space-y-6 pb-24">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-bg-surface p-6 md:p-10 rounded-[2.5rem] border flex flex-col items-center justify-center text-center relative overflow-hidden"
            >
                <div className="w-20 h-20 md:w-24 md:h-24 bg-pink-500/10 rounded-3xl flex items-center justify-center mb-6 border border-pink-500/20 shadow-inner relative group cursor-pointer transition-all hover:scale-105 active:scale-95">
                    <Award className="w-10 h-10 md:w-12 md:h-12 text-pink-500 relative z-10" />
                    <Sparkles className="w-5 h-5 text-brand-gold absolute -top-2 -right-2 motion-safe:animate-pulse" />
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-text-primary tracking-tighter mb-4 flex items-center justify-center gap-3">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-rose-500 drop-shadow-sm">Your Badges</span>
                </h1>
                <p className="text-text-secondary text-base md:text-xl font-medium max-w-2xl leading-relaxed">
                    Collect extreme achievements and unlock unique rewards as you progress through challenges.
                </p>
                
                <div className="flex bg-bg-main p-1.5 rounded-2xl md:rounded-[2rem] border border-border-main mt-8">
                  <button
                    onClick={() => setActiveTab('badges')}
                    className={cn(
                      "px-6 md:px-10 py-3 md:py-4 rounded-xl md:rounded-[1.5rem] font-black text-sm md:text-lg transition-all duration-300 flex items-center gap-2",
                      activeTab === 'badges' ? "bg-bg-surface text-brand-gold shadow-sm scale-105" : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    <Award className="w-5 h-5" /> 25 Badges
                  </button>
                  <button
                    onClick={() => setActiveTab('achievements')}
                    className={cn(
                      "px-6 md:px-10 py-3 md:py-4 rounded-xl md:rounded-[1.5rem] font-black text-sm md:text-lg transition-all duration-300 flex items-center gap-2",
                      activeTab === 'achievements' ? "bg-bg-surface text-pink-500 shadow-sm scale-105" : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    <Trophy className="w-5 h-5" /> Unlimited Tiers
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
