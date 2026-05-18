import React from 'react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  unit?: string;
  subtitle?: string;
}

const StatCard = ({ title, value, icon, color, unit = '', subtitle }: StatCardProps) => {
    const colors: Record<string, string> = {
        blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        amber: "bg-brand-gold/10 text-brand-gold border-brand-gold/20",
        indigo: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
        emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    };

    return (
        <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-all duration-300 group">
            <div className="flex justify-between items-start mb-6">
                <div className={cn("w-12 h-12 flex items-center justify-center rounded-xl border transition-transform group-hover:scale-105 duration-300", colors[color])}>
                    {icon}
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/5 px-3 py-1 rounded-full border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Live</span>
                </div>
            </div>
            <div className="space-y-1">
                <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">{title}</h4>
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-text-primary tracking-tighter">{value}</span>
                    {unit && <span className="text-sm font-bold text-text-secondary">{unit}</span>}
                </div>
                {subtitle && <p className="text-[10px] text-text-secondary font-bold uppercase tracking-tight opacity-60">{subtitle}</p>}
            </div>
        </div>
    );
};

export default StatCard;
