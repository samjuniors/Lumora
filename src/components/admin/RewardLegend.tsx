import React from 'react';
import { Coins, Sparkles, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/utils';

export const GRADE_REWARDS = {
    'A+': { min: 95, label: 'Exceptional', multiplier: 1.0, color: 'text-brand-gold', bg: 'bg-brand-gold/10 border-brand-gold/20' },
    'A': { min: 90, label: 'Excellent', multiplier: 0.8, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    'B+': { min: 85, label: 'Great', multiplier: 0.6, color: 'text-cyan-500', bg: 'bg-cyan-500/10 border-cyan-500/20' },
    'B': { min: 80, label: 'Good', multiplier: 0.4, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
    'C': { min: 70, label: 'Average', multiplier: 0.2, color: 'text-slate-400', bg: 'bg-slate-400/10 border-slate-400/20' },
    'D': { min: 60, label: 'Marginal', multiplier: 0.1, color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' },
    'F': { min: 0, label: 'Fail', multiplier: 0, color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20' }
};

export type LetterGrade = keyof typeof GRADE_REWARDS;

export const RewardLegend = () => (
    <div className="bg-bg-surface rounded-[32px] p-8 border border-border-main shadow-sm">
        <div className="flex items-center gap-3 mb-6">
            <div className="bg-brand-gold/20 p-2 rounded-xl">
                <Sparkles className="w-5 h-5 text-brand-gold transition-pulse" />
            </div>
            <div>
                <h3 className="text-xl font-black text-text-primary tracking-tight">Grade Reward Structure</h3>
                <p className="text-xs text-text-secondary font-bold uppercase tracking-widest mt-0.5">Automated Assignment Payouts</p>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {Object.entries(GRADE_REWARDS).sort((a,b)=>b[1].min-a[1].min).map(([grade, info]) => (
                <div key={grade} className={cn("p-5 rounded-3xl border shadow-sm flex flex-col gap-2 transition-all hover:-translate-y-1", info.bg)}>
                    <div className="flex justify-between items-center">
                        <span className={cn("text-3xl font-black", info.color)}>{grade}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary/60">Score: {info.min}+</span>
                    </div>
                    <div className="text-sm font-bold text-text-primary">{info.label}</div>
                    <div className={cn("text-xs font-black uppercase tracking-tight flex items-center gap-1", info.color)}>
                        <Coins className="w-3 h-3 fill-current" />
                        {info.multiplier > 0 ? `${Math.round(info.multiplier * 100)}% of Reward` : 'No Coin Reward'}
                    </div>
                </div>
            ))}
        </div>
        <div className="mt-6 p-4 bg-bg-main rounded-2xl border border-border-main flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" />
            <p className="text-xs font-medium text-text-secondary leading-relaxed italic">
                Note: Rewards are calculated based on the MISSION BONUS defined in each assignment. Late submissions may have penalties applied regardless of grade.
            </p>
        </div>
    </div>
);
