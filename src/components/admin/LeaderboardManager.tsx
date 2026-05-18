import React, { useState, useEffect } from 'react';
import { Award, TrendingUp, Shield, Crown } from 'lucide-react';
import { userService } from '../../services/dbProvider';
import { User } from '../../types';
import { cn } from '../../lib/utils';

const LeaderboardManager = () => {
    const [globalLeaderboard, setGlobalLeaderboard] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                const all = await userService.getAllUsers();
                const students = all.filter(u => u.role === 'student');
                students.sort((a,b) => (b.coins || 0) - (a.coins || 0));
                setGlobalLeaderboard(students.slice(0, 50));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    if (loading) return <div className="p-20 text-center animate-pulse text-text-secondary font-black uppercase text-xs tracking-widest">Compiling rankings...</div>;

    return (
        <div className="bg-bg-surface rounded-[40px] border border-border-main shadow-sm overflow-hidden p-8">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-3xl font-black text-text-primary tracking-tight flex items-center gap-3">
                        <Award className="text-brand-gold w-8 h-8" /> Rank & Dominance
                    </h2>
                    <p className="text-text-secondary/80 font-bold uppercase tracking-widest text-xs mt-1">Platform-wide student rankings by liquidity</p>
                </div>
            </div>

            <div className="space-y-4">
                {globalLeaderboard.map((u, idx) => (
                    <div key={u.id} className="flex items-center gap-4 p-4 md:p-6 bg-bg-main border border-border-main/50 rounded-3xl group hover:border-brand-gold/30 hover:bg-brand-gold/5 transition-all">
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shrink-0",
                            idx === 0 ? "bg-brand-gold text-bg-main" :
                            idx === 1 ? "bg-slate-300 text-bg-main" :
                            idx === 2 ? "bg-amber-700 text-white" : "bg-bg-surface text-text-secondary border border-border-main"
                        )}>
                            {idx + 1}
                        </div>
                        
                        <div className="flex-grow flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full border-2 border-border-main bg-bg-surface flex items-center justify-center text-text-secondary font-bold shrink-0">
                                {u.name.charAt(0)}
                            </div>
                            <div className="overflow-hidden">
                                <h4 className="font-black text-text-primary tracking-tight truncate flex items-center gap-2">
                                    {u.name}
                                    {idx === 0 && <Crown className="w-4 h-4 text-brand-gold fill-current" />}
                                </h4>
                                <p className="text-[10px] text-text-secondary/60 font-bold uppercase tracking-widest">{u.email}</p>
                            </div>
                        </div>

                        <div className="text-right shrink-0">
                            <div className="flex items-center justify-end gap-1.5 text-brand-gold font-black text-lg">
                                <TrendingUp className="w-4 h-4" /> {u.coins.toLocaleString()}
                            </div>
                            <p className="text-[10px] text-text-secondary/60 font-bold uppercase tracking-widest">Net Worth</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LeaderboardManager;
