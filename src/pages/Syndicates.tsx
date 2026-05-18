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
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
            {/* Header */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-navy-900 border border-brand-gold/20 text-brand-gold rounded-full text-[10px] font-bold uppercase tracking-[0.2em] shadow-soft">
                    <Shield size={12} />
                    Established Operatives
                </div>
                <h1 className="text-4xl md:text-5xl font-display font-bold text-text-primary tracking-tight">The Syndicates</h1>
                <p className="text-text-secondary font-medium max-w-xl mx-auto italic text-sm opacity-80">
                  Global networks of elite students pooling intelligence and capital to achieve academic dominance.
                </p>
            </div>

            {mySyndicate ? (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-navy-950 border border-brand-gold/30 rounded-[3rem] p-8 md:p-12 text-white relative overflow-hidden shadow-glow-gold"
                >
                    <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    
                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-12">
                        <div className="lg:col-span-2 space-y-10">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 bg-brand-gold text-navy-950 rounded-[2rem] flex items-center justify-center text-4xl font-display font-bold shadow-soft">
                                   {mySyndicate.tag}
                                </div>
                                <div className="min-w-0">
                                   <div className="flex items-center gap-4 mb-2 flex-wrap">
                                      <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight truncate">{mySyndicate.name}</h2>
                                      <span className="px-3 py-1 bg-brand-gold/10 rounded-lg text-[10px] font-bold uppercase tracking-widest text-brand-gold border border-brand-gold/20">Phase {mySyndicate.level}</span>
                                   </div>
                                   <p className="text-text-secondary font-medium italic opacity-80 line-clamp-2">{mySyndicate.description}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="p-4 bg-navy-900 border border-navy-800 rounded-2xl shadow-soft">
                                   <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 opacity-50">Personnel</p>
                                   <div className="flex items-center gap-2">
                                      <Users size={18} className="text-brand-gold/50" />
                                      <span className="text-lg font-bold tabular-nums text-white">{mySyndicate.memberIds.length}<span className="text-xs text-text-secondary ml-1">/ 20</span></span>
                                   </div>
                                </div>
                                <div className="p-4 bg-navy-900 border border-navy-800 rounded-2xl shadow-soft">
                                   <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 opacity-50">Impact</p>
                                   <div className="flex items-center gap-2">
                                      <TrendingUp size={18} className="text-success/50" />
                                      <span className="text-lg font-bold tabular-nums text-success">{mySyndicate.totalScore.toLocaleString()}</span>
                                   </div>
                                </div>
                                <div className="p-4 bg-navy-900 border border-navy-800 rounded-2xl shadow-soft">
                                   <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 opacity-50">Asset Pool</p>
                                   <div className="flex items-center gap-2 text-brand-gold">
                                      <Zap size={18} className="opacity-50" />
                                      <span className="text-lg font-bold tabular-nums">🪙 {mySyndicate.coinsStaked}</span>
                                   </div>
                                </div>
                                <div className="p-4 bg-navy-900 border border-navy-800 rounded-2xl shadow-soft">
                                   <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 opacity-50">Authority</p>
                                   <div className="flex items-center gap-2 text-brand-gold">
                                      <Trophy size={18} className="opacity-50" />
                                      <span className="text-[11px] font-bold uppercase tracking-widest truncate">{mySyndicate.leaderId === user.id ? 'Overlord' : 'Operative'}</span>
                                   </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-navy-900 border border-navy-800 rounded-[2.5rem] p-6 space-y-8 shadow-soft">
                           <div className="flex items-center justify-between">
                             <h3 className="text-lg font-display font-bold flex items-center gap-2">
                                <Target className="text-brand-gold" size={20} /> Targets
                             </h3>
                             <button className="text-[10px] font-bold text-brand-gold uppercase tracking-widest hover:text-white transition">View All</button>
                           </div>

                           <div className="space-y-3">
                              <div className="p-4 bg-navy-950 border border-navy-800 rounded-2xl flex items-center justify-between group transition-all hover:border-brand-gold/30">
                                 <div className="min-w-0">
                                    <p className="text-xs font-bold uppercase tracking-tight text-white mb-1 truncate">Syndicate Rally</p>
                                    <p className="text-[10px] text-text-secondary font-medium italic">Collective A+ = Dividend</p>
                                 </div>
                                 <Plus className="text-text-secondary group-hover:text-brand-gold transition-colors shrink-0" size={16} />
                              </div>
                              <div className="p-4 bg-navy-950/50 border border-navy-800 rounded-2xl opacity-40 flex items-center justify-between cursor-not-allowed">
                                 <div>
                                    <p className="text-xs font-bold uppercase tracking-tight text-white mb-1">War Zone Entry</p>
                                    <p className="text-[10px] text-text-secondary">Unlocks at Phase 5</p>
                                 </div>
                                 <Lock size={14} />
                              </div>
                           </div>
                           <button className="w-full bg-brand-gold text-navy-950 py-3.5 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-glow-gold">
                               Sync encrypted chat
                           </button>
                        </div>
                    </div>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                   <div className="card-premium p-10 flex flex-col items-center justify-center text-center space-y-6 bg-navy-900/50">
                      <div className="w-20 h-20 bg-brand-gold text-navy-950 rounded-[2rem] flex items-center justify-center shadow-glow-gold">
                         <Plus size={40} />
                      </div>
                      <div>
                         <h3 className="text-2xl font-display font-bold text-text-primary tracking-tight">Charter A Syndicate</h3>
                         <p className="text-text-secondary text-sm font-medium mt-2 max-w-sm italic opacity-80 leading-relaxed">Establish your own fleet. Exercise absolute authority and manage collective assets.</p>
                      </div>
                      <div className="flex items-center gap-6 py-2">
                         <span className="text-brand-gold font-bold text-[11px] uppercase tracking-widest flex items-center gap-1.5"><Zap size={14} /> 500 Coins</span>
                         <span className="text-cyan-400 font-bold text-[11px] uppercase tracking-widest flex items-center gap-1.5"><Sparkles size={14} /> 10 Diamonds</span>
                      </div>
                      <button 
                        onClick={() => setShowCreateModal(true)}
                        className="bg-brand-gold text-navy-950 px-10 py-4 rounded-xl font-bold text-[11px] uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-glow-gold"
                      >
                         Claim Leadership
                      </button>
                   </div>

                   <div className="space-y-4">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2 ml-2 opacity-50">
                         <Search size={14} /> Available Operations
                      </h3>
                      <div className="space-y-3">
                         {syndicates.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center text-center px-8 bg-navy-900/50 rounded-[2.5rem] border border-dashed border-navy-800">
                               <Users2 size={40} className="text-text-secondary/20 mb-4" />
                               <p className="text-sm font-medium text-text-secondary italic">No active Syndicates detected on the global network.</p>
                            </div>
                         ) : (
                            syndicates.map(s => (
                                <motion.div 
                                    key={s.id}
                                    whileHover={{ x: 4 }}
                                    className="card-premium p-6 flex items-center justify-between group transition-all hover:bg-navy-900 cursor-pointer"
                                    onClick={() => handleJoin(s)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-navy-800 border border-navy-700 rounded-xl flex items-center justify-center text-xl font-display font-bold text-brand-gold group-hover:bg-brand-gold group-hover:text-navy-950 group-hover:border-transparent transition-all shadow-soft">
                                           {s.tag}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-text-primary tracking-tight group-hover:text-brand-gold transition-colors">{s.name}</h4>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60">Phase {s.level} • {s.memberIds.length} Personnel</p>
                                        </div>
                                    </div>
                                    <div className="p-2 text-text-secondary group-hover:text-brand-gold transition-colors">
                                        <ChevronRight size={20} />
                                    </div>
                                </motion.div>
                            ))
                         )}
                      </div>
                   </div>
                </div>
            )}

            {/* Global Syndicate Leaderboard */}
            <div className="bg-bg-surface border border-border-main rounded-[2.5rem] overflow-hidden">
                <div className="p-8 border-b border-border-main flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black text-text-primary tracking-tight">Syndicate Leaderboard</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary mt-1">Live Global Rankings</p>
                    </div>
                    <Trophy className="text-brand-gold" />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-bg-main/5 text-[10px] font-black uppercase tracking-widest text-text-secondary">
                                <th className="px-8 py-4">Rank</th>
                                <th className="px-8 py-4">Syndicate</th>
                                <th className="px-8 py-4">Members</th>
                                <th className="px-8 py-4">Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-main">
                            {syndicates.sort((a,b) => b.totalScore - a.totalScore).map((s, idx) => (
                                <tr key={s.id} className="hover:bg-bg-main/5 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs",
                                            idx === 0 ? "bg-brand-gold text-bg-main shadow-lg" : "bg-bg-main border border-border-main text-text-primary"
                                        )}>
                                            #{idx + 1}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <span className="w-10 h-10 bg-bg-main rounded-lg flex items-center justify-center font-black text-sm text-brand-gold border border-border-main">
                                               {s.tag}
                                            </span>
                                            <span className="font-bold text-text-primary">{s.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 font-mono text-xs text-text-secondary">{s.memberIds.length}/20</td>
                                    <td className="px-8 py-6">
                                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg font-black text-xs">
                                            {s.totalScore.toLocaleString()}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Creation Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-main/80 backdrop-blur-xl"
                    >
                        <motion.form 
                            onSubmit={handleCreate}
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-bg-surface border border-brand-gold/30 rounded-[3rem] p-10 max-w-lg w-full space-y-8 relative shadow-2xl shadow-brand-gold/10"
                        >
                            <button onClick={() => setShowCreateModal(false)} className="absolute top-8 right-8 text-text-secondary hover:text-text-primary">
                                <Plus size={24} className="rotate-45" />
                            </button>

                            <div className="space-y-2">
                                <h3 className="text-3xl font-black text-text-primary tracking-tighter">Establish The Fleet</h3>
                                <p className="text-sm text-text-secondary font-medium italic">Define your syndicate's identity and recruit operatives.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest ml-1">Syndicate Name</label>
                                    <input 
                                        required
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="e.g. Phoenix Rising"
                                        className="w-full bg-bg-main border border-border-main rounded-2xl px-6 py-4 outline-none focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/5 transition-all font-bold" 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest ml-1">Fleet Tag (3-4 Chars)</label>
                                        <input 
                                            required
                                            value={tag}
                                            onChange={e => setTag(e.target.value.toUpperCase())}
                                            maxLength={4}
                                            placeholder="PNX"
                                            className="w-full bg-bg-main border border-border-main rounded-2xl px-6 py-4 outline-none focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/5 transition-all font-black text-center" 
                                        />
                                    </div>
                                    <div className="flex flex-col justify-end">
                                        <div className="bg-brand-gold/10 border border-brand-gold/20 rounded-2xl p-4 flex items-center justify-center gap-2">
                                           <Users2 size={16} className="text-brand-gold" />
                                           <span className="text-xs font-black text-brand-gold uppercase">Invite Only</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest ml-1">The Manifest (Description)</label>
                                    <textarea 
                                        required
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="What is your purpose?"
                                        className="w-full bg-bg-main border border-border-main rounded-2xl px-6 py-4 outline-none focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/5 transition-all font-medium text-sm h-24 resize-none" 
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit"
                                disabled={isCreating}
                                className="w-full bg-brand-gold text-bg-main py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-brand-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
                            >
                                {isCreating ? "Transmitting..." : "Sign Charter & Establish"}
                            </button>
                        </motion.form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
