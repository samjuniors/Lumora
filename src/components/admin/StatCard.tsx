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
        blue: "bg-blue-50 text-blue-600",
        amber: "bg-brand-gold/10 text-brand-gold",
        indigo: "bg-brand-gold-secondary-hover text-brand-gold",
        emerald: "bg-success-green/10 text-emerald-600",
    };

    return (
        <div className="bg-bg-surface rounded-[32px] p-6 border border-border-main shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex justify-between items-start mb-4">
                <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110 duration-300", colors[color])}>
                    <div className="w-6 h-6 flex items-center justify-center">
                        {icon}
                    </div>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Live</span>
                </div>
            </div>
            <div>
                <h4 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-1">{title}</h4>
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-text-primary tracking-tight">{value}</span>
                    {unit && <span className="text-sm font-bold text-text-secondary">{unit}</span>}
                </div>
                {subtitle && <p className="text-xs text-text-secondary font-medium mt-1">{subtitle}</p>}
            </div>
        </div>
    );
};

export default StatCard;
