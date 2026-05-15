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
import { dbService } from '../services/dbProvider';
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
            const all = await dbService.getAllSyndicates();
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

            const sid = await dbService.createSyndicate(syndicateData);
            await dbService.updateUser(user.id, { 
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
            await dbService.updateSyndicate(syndicate.id, { 
                memberIds: updatedMembers,
                updatedAt: Date.now()
            });
            await dbService.updateUser(user.id, { 
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
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-gold/10 text-brand-gold rounded-full text-[10px] font-black uppercase tracking-widest border border-brand-gold/20">
                    <Shield size={12} />
                    Lumina Global Network
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-text-primary tracking-tighter">The Syndicates</h1>
                <p className="text-text-secondary font-medium max-w-xl mx-auto italic text-sm">
                  Collaborate to dominate. Syndicates pool academic performance to conquer global leaderboards and unlock exclusive dividends.
                </p>
            </div>

            {mySyndicate ? (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#1A2B48] border border-brand-gold/30 rounded-[3rem] p-8 md:p-12 text-white relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                    
                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-12">
                        <div className="lg:col-span-2 space-y-8">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 bg-brand-gold text-bg-main rounded-3xl flex items-center justify-center text-4xl font-black shadow-2xl shadow-brand-gold/20">
                                   {mySyndicate.tag}
                                </div>
                                <div>
                                   <div className="flex items-center gap-3 mb-1">
                                      <h2 className="text-3xl font-black tracking-tight">{mySyndicate.name}</h2>
                                      <span className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-brand-gold border border-white/10">Level {mySyndicate.level}</span>
                                   </div>
                                   <p className="text-white/60 font-medium italic">{mySyndicate.description}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                   <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Members</p>
                                   <div className="flex items-center gap-2">
                                      <Users className="text-brand-gold w-4 h-4" />
                                      <span className="text-lg font-black">{mySyndicate.memberIds.length} / 20</span>
                                   </div>
                                </div>
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                   <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Global Score</p>
                                   <div className="flex items-center gap-2">
                                      <TrendingUp className="text-emerald-400 w-4 h-4" />
                                      <span className="text-lg font-black">{mySyndicate.totalScore.toLocaleString()}</span>
                                   </div>
                                </div>
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                   <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Staked Fund</p>
                                   <div className="flex items-center gap-2">
                                      <Zap className="text-cyan-400 w-4 h-4" />
                                      <span className="text-lg font-black">🪙 {mySyndicate.coinsStaked}</span>
                                   </div>
                                </div>
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                   <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Your Status</p>
                                   <div className="flex items-center gap-2 text-brand-gold">
                                      <Trophy className="w-4 h-4" />
                                      <span className="text-sm font-black uppercase tracking-widest">{mySyndicate.leaderId === user.id ? 'Overlord' : 'Operative'}</span>
                                   </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-[2rem] p-6 border border-white/10 space-y-6">
                           <h3 className="text-lg font-black flex items-center gap-2">
                              <Target className="text-brand-gold w-5 h-5" />
                              Syndicate Missions
                           </h3>
                           <div className="space-y-3">
                              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group">
                                 <div>
                                    <p className="text-xs font-black uppercase tracking-tight text-white/80">Group Quiz Night</p>
                                    <p className="text-[10px] text-white/40">Collective A+ = 200 Coins Dividend</p>
                                 </div>
                                 <Plus className="text-white/20 group-hover:text-brand-gold transition-colors" />
                              </div>
                              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 opacity-50 flex items-center justify-between cursor-not-allowed">
                                 <div>
                                    <p className="text-xs font-black uppercase tracking-tight text-white/80">Tournament entry</p>
                                    <p className="text-[10px] text-white/40">Unlocks at Syndicate Level 5</p>
                                 </div>
                                 <Lock size={14} />
                              </div>
                           </div>
                           <button className="w-full bg-white/10 hover:bg-white/20 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">
                              Clan Chat (Encrypted)
                           </button>
                        </div>
                    </div>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                   <div className="bg-bg-surface border border-border-main rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center space-y-6">
                      <div className="w-20 h-20 bg-brand-gold text-bg-main rounded-[2rem] flex items-center justify-center shadow-xl shadow-brand-gold/10">
                         <Plus size={40} />
                      </div>
                      <div>
                         <h3 className="text-2xl font-black text-text-primary tracking-tight">Establish a Syndicate</h3>
                         <p className="text-text-secondary text-sm font-medium mt-2">Become a Leader. Drive your team to global dominance.</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest">
                         <span className="text-brand-gold">🪙 500 Coins</span>
                         <span className="text-text-secondary/20">|</span>
                         <span className="text-cyan-500">💎 10 Diamonds</span>
                      </div>
                      <button 
                        onClick={() => setShowCreateModal(true)}
                        className="bg-brand-gold text-bg-main px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-brand-gold/20"
                      >
                         Secure The Charter
                      </button>
                   </div>

                   <div className="space-y-4">
                      <h3 className="text-sm font-black uppercase tracking-widest text-text-secondary flex items-center gap-2 ml-2">
                         <Search size={14} />
                         Join an Operation
                      </h3>
                      <div className="space-y-3">
                         {syndicates.length === 0 ? (
                            <div className="text-center py-12 bg-white/5 border border-dashed rounded-3xl">
                               <p className="text-sm text-text-secondary italic">No active Syndicates found on the network.</p>
                            </div>
                         ) : (
                            syndicates.map(s => (
                                <motion.div 
                                    key={s.id}
                                    whileHover={{ x: 4 }}
                                    className="bg-bg-surface border border-border-main p-6 rounded-3xl flex items-center justify-between group transition-all hover:border-brand-gold/30 hover:shadow-xl"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-bg-main border border-border-main rounded-xl flex items-center justify-center text-xl font-black text-brand-gold group-hover:bg-brand-gold group-hover:text-bg-main transition-all">
                                           {s.tag}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-text-primary group-hover:text-brand-gold transition-colors">{s.name}</h4>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">{s.memberIds.length} Members • Level {s.level}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleJoin(s)}
                                        className="p-3 bg-bg-main border border-border-main rounded-xl hover:bg-brand-gold hover:text-bg-main transition-all"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
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
