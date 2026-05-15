import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Brain, Target, Compass, Gem, ChevronRight, Loader2, BookMarked, Info, Lock, Shield, Cpu, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbProvider';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';

export const TheOracle = ({ submissions }: { submissions: any[] }) => {
  const { user, updateResources } = useAuth();
  const [analyzing, setAnalyzing] = useState(false);
  const [roadmap, setRoadmap] = useState<string | null>(user?.academicRoadmap || null);
  const [showUnlockInfo, setShowUnlockInfo] = useState(false);

  const isDiamond = (user?.diamonds || 0) >= 100;
  const isUnlocked = user?.isOracleUnlocked || isDiamond;

  const handleUnlock = async () => {
    if (!user) return;
    const UNLOCK_FEE = 5000;
    
    if (user.coins < UNLOCK_FEE) {
      toast.error(`Insufficient Coins! You need ${UNLOCK_FEE} Coins to unlock The Oracle.`);
      return;
    }

    if (!window.confirm(`Spend ${UNLOCK_FEE} Coins for permanent Oracle access? (Diamond members get this for free)`)) return;

    try {
      const newCoins = user.coins - UNLOCK_FEE;
      await dbService.updateUser(user.id, { 
        isOracleUnlocked: true,
        coins: newCoins,
        updatedAt: Date.now()
      });
      updateResources({ coins: newCoins });
      toast.success("The Oracle has accepted your tribute. Sealed wisdom is now yours.");
    } catch (err) {
      toast.error("Failed to unlock Oracle");
    }
  };

  const fetchRoadmap = async () => {
    if (!user) return;
    
    if (!isUnlocked) {
      toast.error("The Oracle is sealed. Unlock it first!");
      return;
    }

    if ((user.diamonds || 0) < 1 && !roadmap) {
      toast.error("Initial analysis requires 1 Diamond stake!");
      return;
    }

    if (!window.confirm(roadmap ? "Consult The Oracle for 1 Diamond?" : "Unlock your Personal Academic Roadmap for 1 Diamond?")) return;

    setAnalyzing(true);
    try {
      // Deduct Diamond
      const newDiamondCount = (user.diamonds || 0) - 1;
      
      const response = await fetch('/api/ai/academic-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id,
          submissions: submissions.map(s => ({
            subject: s.subject,
            score: s.aiScore,
            feedback: s.aiFeedback,
            status: s.status
          }))
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      await dbService.updateUser(user.id, { 
        academicRoadmap: data.text,
        diamonds: newDiamondCount
      });

      updateResources({ diamonds: newDiamondCount });
      setRoadmap(data.text);
      toast.success("The Oracle has spoken! Your roadmap is ready.");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to contact The Oracle");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="bg-bg-surface border border-brand-gold/20 rounded-[2.5rem] overflow-hidden relative group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
      
      <div className="p-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-brand-gold text-bg-main rounded-2xl flex items-center justify-center shadow-xl shadow-brand-gold/20 relative">
              <Brain size={30} />
              {isUnlocked && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500 border-2 border-bg-main"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-text-primary tracking-tight">The Oracle</h2>
                {isDiamond && (
                  <span className="text-[9px] font-black uppercase bg-cyan-500 text-white px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Gem size={8} /> Diamond Status
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-text-secondary">AI-Powered High-Stakes Learning Roadmap</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUnlockInfo(!showUnlockInfo)}
              className="p-2 text-text-secondary hover:text-brand-gold transition-colors"
              title="Oracle Information"
            >
              <Info size={20} />
            </button>
            {!isUnlocked ? (
               <button
                onClick={handleUnlock}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
               >
                 <Lock size={16} /> Unlock Oracle (5,000)
               </button>
            ) : (
              <button
                onClick={fetchRoadmap}
                disabled={analyzing}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                  analyzing 
                    ? "bg-brand-gold/20 text-brand-gold cursor-not-allowed" 
                    : "bg-brand-gold text-bg-main hover:scale-105 shadow-lg shadow-brand-gold/20"
                )}
              >
                {analyzing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Channeling...
                  </>
                ) : (
                  <>
                    <Gem size={16} />
                    {roadmap ? "Refresh Roadmap (1)" : "Consult Oracle (1)"}
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showUnlockInfo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="bg-bg-main border border-border-main rounded-3xl p-6 text-sm text-text-secondary space-y-3">
                <p className="font-bold text-text-primary uppercase tracking-widest text-[10px]">Why consult The Oracle?</p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-brand-gold">◈</span>
                    <span><strong>High-Stakes Analysis</strong>: Gemini 2.0 scans your total grade history (only graded missions).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-gold">◈</span>
                    <span><strong>Risk Mitigation</strong>: Identifies exact topics that might cost you coins in future penalties.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-gold">◈</span>
                    <span><strong>Probabilistic Predictions</strong>: Get a calculated grade trajectory for the next 48 hours.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-gold">◈</span>
                    <span><strong>Diamond Benefits</strong>: Users with 100+ Diamonds get priority access and badge status.</span>
                  </li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {!isUnlocked ? (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="text-center py-12 px-6 bg-[#1A2B48]/10 border border-dashed border-[#D4AF37]/30 rounded-3xl"
            >
               <div className="w-16 h-16 bg-bg-main mx-auto rounded-full flex items-center justify-center mb-4 text-[#D4AF37]/40 border border-[#D4AF37]/20 shadow-inner">
                  <Lock size={32} />
               </div>
               <h3 className="text-xl font-black text-text-primary mb-2 uppercase tracking-tight">The Oracle is Sealed</h3>
               <p className="text-sm text-text-secondary max-w-sm mx-auto mb-6 font-medium leading-relaxed">
                 Accessing high-tier AI strategy requires a high-stakes commitment. 
                 The Oracle analyzes your fails to prevent future coin deductions. 
                 Reach <span className="text-cyan-500 font-bold">Diamond Status</span> (100+ 💎) or pay a one-time tribute to access the roadmap.
               </p>
               <div className="flex justify-center flex-wrap gap-4 text-[9px] font-black uppercase tracking-widest text-text-secondary/50">
                  <div className="flex items-center gap-1.5"><Shield size={12} className="text-brand-gold" /> Identity Verification</div>
                  <div className="flex items-center gap-1.5"><Cpu size={12} className="text-indigo-400" /> Neural Linkage</div>
                  <div className="flex items-center gap-1.5"><Zap size={12} className="text-cyan-400" /> Real-time Sync</div>
               </div>
            </motion.div>
          ) : roadmap ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-[#1A2B48]/40 border border-white/5 rounded-3xl p-6 md:p-8">
                <div className="flex items-center gap-2 mb-6">
                  <Compass className="text-brand-gold w-5 h-5" />
                  <span className="text-[10px] font-black uppercase text-brand-gold tracking-widest">Your Strategy for academic dominance</span>
                </div>
                <div className="markdown-body prose prose-invert prose-sm max-w-none text-text-secondary leading-relaxed">
                  <ReactMarkdown>{roadmap}</ReactMarkdown>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-4 p-5 bg-white/5 rounded-2xl border border-white/5">
                   <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                      <Target size={20} />
                   </div>
                   <div>
                      <h4 className="text-xs font-black text-white uppercase mb-1">Focus Areas</h4>
                      <p className="text-[10px] text-white/50 leading-relaxed italic">The Oracle identifies your highest ROI study topics based on past fails.</p>
                   </div>
                </div>
                <div className="flex items-start gap-4 p-5 bg-white/5 rounded-2xl border border-white/5">
                   <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                      <Sparkles size={20} />
                   </div>
                   <div>
                      <h4 className="text-xs font-black text-white uppercase mb-1">Grade Prediction</h4>
                      <p className="text-[10px] text-white/50 leading-relaxed italic">Probabilistic outcomes for upcoming assessments provided by Gemini.</p>
                   </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="text-center py-12 px-6 bg-white/5 border border-dashed border-white/10 rounded-3xl"
            >
               <div className="w-16 h-16 bg-white/5 mx-auto rounded-full flex items-center justify-center mb-4 text-white/20">
                  <BookMarked size={32} />
               </div>
               <h3 className="text-lg font-bold text-white mb-2">Sealed Wisdom</h3>
               <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">
                 Your academic performance data is ready for analysis. 
                 The Oracle will generate a custom roadmap to eliminate your weak points and maximize your ROI.
               </p>
               <div className="flex justify-center items-center gap-3 text-[10px] font-black uppercase tracking-widest text-brand-gold/60">
                  <span>Analyze History</span>
                  <ChevronRight size={12} />
                  <span>Topic Priority</span>
                  <ChevronRight size={12} />
                  <span>Grade Target</span>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
