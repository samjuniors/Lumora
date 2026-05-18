import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Shield, 
  TrendingUp, 
  Plus, 
  Search, 
  ChevronRight, 
  Trophy, 
  Target, 
  Zap,
  Loader2,
  Lock,
  MessageSquare,
  Sparkles,
  Users2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { syndicateService, userService } from '../services/dbProvider';
import { Syndicate, User } from '../types';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

import { Card, Button } from '../components/CommonUI';

export const Syndicates = () => {
    const { user, setUser, updateResources } = useAuth();
    const [syndicates, setSyndicates] = useState<Syndicate[]>([]);
    const [mySyndicate, setMySyndicate] = useState<Syndicate | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const navigate = useNavigate();

    // Form states
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [tag, setTag] = useState('');

    useEffect(() => {
        fetchData();
    }, [user?.syndicateId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const all = await syndicateService.getAllSyndicates();
            setSyndicates(all);
            if (user?.syndicateId) {
                const my = all.find(s => s.id === user.syndicateId);
                if (my) setMySyndicate(my);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        const costCoins = 500;
        const costDiamonds = 10;

        if (user.coins < costCoins || (user.diamonds || 0) < costDiamonds) {
            toast.error(`Creation costs ${costCoins} Coins & ${costDiamonds} Diamonds!`);
            return;
        }

        if (!tag.match(/^[A-Z0-9]{3,4}$/)) {
            toast.error("Tag must be 3-4 uppercase characters/numbers.");
            return;
        }

        setIsCreating(true);
        try {
            const syndicateData: Omit<Syndicate, 'id'> = {
                name,
                description,
                tag: tag.toUpperCase(),
                leaderId: user.id,
                memberIds: [user.id],
                totalScore: 0,
                coinsStaked: 0,
                level: 1,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            const sid = await syndicateService.createSyndicate(syndicateData);
            await userService.updateUser(user.id, { 
                syndicateId: sid,
                coins: user.coins - costCoins,
                diamonds: (user.diamonds || 0) - costDiamonds,
                updatedAt: Date.now()
            });

            updateResources({ 
                coins: user.coins - costCoins, 
                diamonds: (user.diamonds || 0) - costDiamonds 
            });
            setUser(prev => prev ? { ...prev, syndicateId: sid } : null);
            
            toast.success(`Syndicate [${tag.toUpperCase()}] Established!`);
            setShowCreateModal(false);
            fetchData();
        } catch (err) {
            console.error(err);
            toast.error("Failed to establish Syndicate.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoin = async (syndicate: Syndicate) => {
        if (!user) return;
        if (user.syndicateId) {
           toast.error("Already in a Syndicate! Leave current one first.");
           return;
        }

        try {
            const updatedMembers = [...syndicate.memberIds, user.id];
            await syndicateService.updateSyndicate(syndicate.id, { 
                memberIds: updatedMembers,
                updatedAt: Date.now()
            });
            await userService.updateUser(user.id, { 
                syndicateId: syndicate.id,
                updatedAt: Date.now()
            });

            setUser(prev => prev ? { ...prev, syndicateId: syndicate.id } : null);
            toast.success(`Joined ${syndicate.name}!`);
            fetchData();
        } catch (err) {
            console.error(err);
            toast.error("Failed to join.");
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-12 h-12 text-brand-gold animate-spin" />
            <p className="text-text-secondary font-black uppercase text-xs tracking-widest">Scanning Networks...</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 space-y-16">
            {/* Header */}
            <div className="text-center space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/5 text-brand-gold rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">
                    <Shield size={12} />
                    Established Operative Networks
                </div>
                <h1 className="text-5xl md:text-6xl font-black text-text-primary tracking-tighter">The Syndicates</h1>
                <p className="text-text-muted font-bold max-w-2xl mx-auto italic text-sm md:text-base opacity-70 leading-relaxed uppercase tracking-tight">
                  Global networks of elite operatives pooling intelligence and capital to achieve absolute academic dominance.
                </p>
            </div>

            {mySyndicate ? (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <Card 
                        variant="glass" 
                        className="p-10 md:p-14 border-white/[0.03] shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-gold/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        
                        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-16">
                            <div className="lg:col-span-2 space-y-12">
                                <div className="flex items-center gap-8">
                                    <div className="w-24 h-24 bg-brand-gold text-bg-main rounded-3xl flex items-center justify-center text-5xl font-black shadow-2xl shadow-brand-gold/20">
                                       {mySyndicate.tag}
                                    </div>
                                    <div className="min-w-0 space-y-2">
                                       <div className="flex items-center gap-4 flex-wrap">
                                          <h2 className="text-4xl md:text-5xl font-black text-text-primary tracking-tighter">{mySyndicate.name}</h2>
                                          <span className="px-3 py-1 bg-brand-gold/10 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] text-brand-gold border border-brand-gold/20">Phase {mySyndicate.level}</span>
                                       </div>
                                       <p className="text-text-muted font-medium italic opacity-80 text-lg leading-relaxed">{mySyndicate.description}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] shadow-inner">
                                       <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-3 opacity-50">Personnel</p>
                                       <div className="flex items-center gap-3">
                                          <Users size={20} className="text-brand-gold/40" />
                                          <span className="text-2xl font-black tabular-nums text-text-primary">{mySyndicate.memberIds.length}<span className="text-xs text-text-muted ml-2 opacity-50">/ 20</span></span>
                                       </div>
                                    </div>
                                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] shadow-inner">
                                       <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-3 opacity-50">Impact</p>
                                       <div className="flex items-center gap-3">
                                          <TrendingUp size={20} className="text-emerald-500/40" />
                                          <span className="text-2xl font-black tabular-nums text-emerald-500">{mySyndicate.totalScore.toLocaleString()}</span>
                                       </div>
                                    </div>
                                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] shadow-inner">
                                       <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-3 opacity-50">Asset Pool</p>
                                       <div className="flex items-center gap-3 text-brand-gold">
                                          <Zap size={20} className="opacity-40" />
                                          <span className="text-2xl font-black tabular-nums">🪙 {mySyndicate.coinsStaked}</span>
                                       </div>
                                    </div>
                                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] shadow-inner">
                                       <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-3 opacity-50">Authority</p>
                                       <div className="flex items-center gap-3 text-white">
                                          <Trophy size={20} className="text-brand-gold/40" />
                                          <span className="text-[11px] font-black uppercase tracking-[0.2em] truncate">{mySyndicate.leaderId === user.id ? 'Overlord' : 'Operative'}</span>
                                       </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/[0.03] border border-white/5 rounded-[3rem] p-8 space-y-10 shadow-inner">
                               <div className="flex items-center justify-between">
                                 <h3 className="text-xl font-black text-text-primary flex items-center gap-3 tracking-tight">
                                    <Target className="text-brand-gold" size={24} /> Targets
                                 </h3>
                                 <button className="text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] hover:text-white transition">All Intel</button>
                               </div>

                               <div className="space-y-4">
                                  <div className="p-5 bg-black/20 border border-white/5 rounded-2xl flex items-center justify-between group transition-all hover:border-brand-gold/30">
                                     <div className="min-w-0 space-y-1">
                                        <p className="text-xs font-black uppercase tracking-[0.1em] text-text-primary truncate">Syndicate Rally</p>
                                        <p className="text-[10px] text-text-muted font-bold tracking-tight">Collective A+ = Asset Dividend</p>
                                     </div>
                                     <Plus className="text-text-muted group-hover:text-brand-gold transition-colors shrink-0" size={18} />
                                  </div>
                                  <div className="p-5 bg-white/[0.01] border border-white/5 rounded-2xl opacity-30 flex items-center justify-between cursor-not-allowed">
                                     <div className="space-y-1">
                                        <p className="text-xs font-black uppercase tracking-[0.1em] text-text-primary">War Zone Entry</p>
                                        <p className="text-[10px] text-text-muted font-bold tracking-tight">Unlocks at Phase 5 Evolution</p>
                                     </div>
                                     <Lock size={16} />
                                  </div>
                               </div>
                               
                               <Button 
                                variant="gold" 
                                size="lg" 
                                icon={MessageSquare} 
                                className="w-full font-black text-[10px] uppercase tracking-[0.2em] py-5"
                               >
                                  Sync Encrypted Chat
                               </Button>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                   <Card variant="flat" className="p-12 flex flex-col items-center justify-center text-center space-y-8 bg-white/[0.02] border-white/[0.03]">
                      <div className="w-24 h-24 bg-brand-gold text-bg-main rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-brand-gold/20">
                         <Plus size={48} />
                      </div>
                      <div className="space-y-3">
                         <h3 className="text-3xl font-black text-text-primary tracking-tighter">Establish A Syndicate</h3>
                         <p className="text-text-muted text-sm md:text-base font-bold italic opacity-70 leading-relaxed uppercase tracking-tight max-w-sm">Establish absolute authority. Manage collective assets. Govern the fleet.</p>
                      </div>
                      <div className="flex items-center gap-8 py-2">
                         <span className="text-brand-gold font-black text-[11px] uppercase tracking-[0.2em] flex items-center gap-2"><Zap size={16} /> 500 Coins</span>
                         <span className="text-cyan-400 font-black text-[11px] uppercase tracking-[0.2em] flex items-center gap-2"><Sparkles size={16} /> 10 Diamonds</span>
                      </div>
                      <Button 
                        variant="gold"
                        size="xl"
                        onClick={() => setShowCreateModal(true)}
                        className="px-12 py-6 font-black text-[11px] uppercase tracking-[0.3em]"
                      >
                         Claim Leadership
                      </Button>
                   </Card>

                   <div className="space-y-6">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted flex items-center gap-3 ml-2 opacity-50">
                         <Search size={16} /> Available Networks
                      </h3>
                      <div className="space-y-4">
                         {syndicates.length === 0 ? (
                            <div className="py-24 flex flex-col items-center justify-center text-center px-10 bg-white/[0.01] rounded-[3rem] border border-dashed border-white/10">
                               <Users2 size={48} className="text-text-muted/20 mb-6" />
                               <p className="text-sm font-bold text-text-muted italic uppercase tracking-widest opacity-40">No active Syndicates detected on global grid.</p>
                            </div>
                         ) : (
                            syndicates.map(s => (
                                <motion.div 
                                    key={s.id}
                                    whileHover={{ x: 6 }}
                                    className="group cursor-pointer"
                                    onClick={() => handleJoin(s)}
                                >
                                    <Card variant="flat" className="p-6 flex items-center justify-between border-white/[0.03] group-hover:border-white/10 group-hover:bg-white/[0.04] transition-all">
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-center text-2xl font-black text-brand-gold group-hover:bg-brand-gold group-hover:text-bg-main group-hover:border-transparent transition-all shadow-lg">
                                               {s.tag}
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="font-black text-lg text-text-primary tracking-tight group-hover:text-brand-gold transition-colors">{s.name}</h4>
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted opacity-60">Phase {s.level} &bull; {s.memberIds.length} Operatives</p>
                                            </div>
                                        </div>
                                        <div className="p-3 text-text-muted group-hover:text-brand-gold transition-colors border border-transparent group-hover:border-brand-gold/20 rounded-xl">
                                            <ChevronRight size={24} />
                                        </div>
                                    </Card>
                                </motion.div>
                            ))
                         )}
                      </div>
                   </div>
                </div>
            )}

            {/* Global Syndicate Leaderboard */}
            <Card variant="flat" className="border-white/[0.03] overflow-hidden shadow-2xl">
                <div className="p-8 md:p-10 border-b border-white/[0.03] flex items-center justify-between bg-white/[0.01]">
                    <div>
                        <h3 className="text-2xl font-black text-text-primary tracking-tight">Syndicate Leaderboard</h3>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted mt-2">Live Global Performance Index</p>
                    </div>
                    <div className="w-12 h-12 bg-white/[0.03] rounded-2xl flex items-center justify-center text-brand-gold border border-white/5">
                        <Trophy size={24} />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-black/20 text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">
                                <th className="px-10 py-6">Rank</th>
                                <th className="px-10 py-6">Syndicate</th>
                                <th className="px-10 py-6 text-center">Personnel</th>
                                <th className="px-10 py-6 text-right">Strategic Impact</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {syndicates.sort((a,b) => b.totalScore - a.totalScore).map((s, idx) => (
                                <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-10 py-8">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm",
                                            idx === 0 ? "bg-brand-gold text-bg-main shadow-xl shadow-brand-gold/20 scale-110" : "bg-white/[0.03] border border-white/5 text-text-primary"
                                        )}>
                                            #{idx + 1}
                                        </div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-4">
                                            <span className="w-12 h-12 bg-white/[0.03] rounded-xl flex items-center justify-center font-black text-base text-brand-gold border border-white/5 shadow-inner">
                                               {s.tag}
                                            </span>
                                            <span className="font-black text-lg text-text-primary tracking-tight">{s.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8 font-mono text-center">
                                       <span className="text-sm font-black text-text-secondary tabular-nums">{s.memberIds.length}</span>
                                       <span className="text-[10px] text-text-muted font-bold opacity-30 ml-1">/20</span>
                                    </td>
                                    <td className="px-10 py-8 text-right">
                                        <span className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl font-black text-sm border border-emerald-500/10 tabular-nums shadow-lg shadow-emerald-500/5">
                                            {s.totalScore.toLocaleString()}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Creation Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-main/80 backdrop-blur-2xl"
                    >
                        <motion.form 
                            onSubmit={handleCreate}
                            initial={{ scale: 0.95, y: 30 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 30 }}
                            className="bg-bg-surface border border-brand-gold/30 rounded-[3.5rem] p-10 md:p-14 max-w-xl w-full space-y-10 relative shadow-2xl shadow-brand-gold/10"
                        >
                            <button 
                                type="button"
                                onClick={() => setShowCreateModal(false)} 
                                className="absolute top-10 right-10 text-text-muted hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl"
                            >
                                <X size={28} />
                            </button>

                            <div className="space-y-4">
                                <h3 className="text-4xl font-black text-text-primary tracking-tighter">Sign The Charter</h3>
                                <p className="text-sm md:text-base text-text-muted font-bold italic opacity-70 uppercase tracking-tight">Define the fleet's identity and initiate operative recruitment.</p>
                            </div>

                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-text-muted tracking-[0.3em] ml-2">Syndicate Designation</label>
                                    <input 
                                        required
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="Identification Name"
                                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-8 py-5 outline-none focus:border-brand-gold focus:ring-8 focus:ring-brand-gold/5 transition-all font-black text-lg placeholder:text-text-muted/20" 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase text-text-muted tracking-[0.3em] ml-2">Fleet Tag (3-4 Chars)</label>
                                        <input 
                                            required
                                            value={tag}
                                            onChange={e => setTag(e.target.value.toUpperCase())}
                                            maxLength={4}
                                            placeholder="PNX"
                                            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-8 py-5 outline-none focus:border-brand-gold focus:ring-8 focus:ring-brand-gold/5 transition-all font-black text-center text-xl tracking-tighter placeholder:text-text-muted/20" 
                                        />
                                    </div>
                                    <div className="flex flex-col justify-end">
                                        <div className="bg-brand-gold/5 border border-brand-gold/10 rounded-2xl p-5 flex items-center justify-center gap-3 backdrop-blur-sm">
                                           <Users2 size={20} className="text-brand-gold/60" />
                                           <span className="text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] leading-none">Global Lock</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-text-muted tracking-[0.3em] ml-2">Mission Manifest (Public Intel)</label>
                                    <textarea 
                                        required
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="State your organization's primary directive..."
                                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-8 py-5 outline-none focus:border-brand-gold focus:ring-8 focus:ring-brand-gold/5 transition-all font-bold text-sm h-32 resize-none placeholder:text-text-muted/20 leading-relaxed" 
                                    />
                                </div>
                            </div>

                            <Button 
                                type="submit"
                                variant="gold"
                                size="xl"
                                disabled={isCreating}
                                className="w-full py-6 font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-brand-gold/20"
                            >
                                {isCreating ? "Establishing Node..." : "Authorize Charter & Deploy"}
                            </Button>
                        </motion.form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const X = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18M6 6l12 12" />
    </svg>
);
