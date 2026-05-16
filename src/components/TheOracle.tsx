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
    <div className="card-premium overflow-hidden relative group">
      <div className="absolute top-0 right-0 w-48 h-48 bg-brand-gold/5 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      
      <div className="p-5 md:p-8 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-navy-800 text-brand-gold rounded-xl flex items-center justify-center border border-brand-gold/20 shadow-sm relative">
              <Brain size={24} />
              {isUnlocked && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500 border border-navy-950"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-display font-bold text-text-primary tracking-tight">The Oracle</h2>
                {isDiamond && (
                  <span className="text-[10px] font-bold bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20 flex items-center gap-1 uppercase tracking-wider">
                    Priority
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-text-secondary">AI Strategic Advisor • Strategic Roadmap</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUnlockInfo(!showUnlockInfo)}
              className="p-2 text-text-secondary hover:text-brand-gold transition-colors"
              title="Oracle Information"
            >
              <Info size={18} />
            </button>
            {!isUnlocked ? (
               <button
                onClick={handleUnlock}
                className="bg-brand-gold text-navy-950 px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all hover:translate-y-[-1px] active:translate-y-[0px] shadow-sm flex items-center gap-2"
               >
                 <Lock size={14} /> Unlock Access
               </button>
            ) : (
              <button
                onClick={fetchRoadmap}
                disabled={analyzing}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all",
                  analyzing 
                    ? "bg-navy-800 text-brand-gold/50 cursor-not-allowed border border-navy-700" 
                    : "bg-navy-800 border border-brand-gold/30 text-brand-gold hover:bg-navy-700 shadow-sm"
                )}
              >
                {analyzing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Channeling
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    {roadmap ? "Update Intelligence" : "Consult Oracle"}
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
              <div className="bg-navy-800/50 border border-navy-700 rounded-xl p-5 text-xs text-text-secondary space-y-3">
                <p className="font-bold text-text-primary uppercase tracking-widest text-[10px]">Strategic Analysis Capabilities</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 text-brand-gold"><Compass size={12} /></div>
                    <span><strong className="text-text-primary">Performance Audit</strong>: Deep scan of historical grades to identify persistent weak points.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 text-brand-gold"><Shield size={12} /></div>
                    <span><strong className="text-text-primary">Loss Mitigation</strong>: Strategic advice intended to minimize missed assignments and tax.</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {!isUnlocked ? (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="text-center py-10 px-6 bg-navy-800/30 border border-dashed border-navy-700 rounded-2xl"
            >
               <div className="w-12 h-12 bg-navy-950 mx-auto rounded-full flex items-center justify-center mb-4 text-brand-gold/30 border border-navy-700">
                  <Lock size={20} />
               </div>
               <h3 className="text-lg font-bold text-text-primary mb-2 tracking-tight">Intelligence Access Restricted</h3>
               <p className="text-xs text-text-secondary max-w-sm mx-auto mb-6 font-medium leading-relaxed">
                 Accessing high-tier strategic analysis requires a neural link commitment. Reach <span className="text-brand-gold font-bold">Level 10</span> or unlock via Diamond status.
               </p>
            </motion.div>
          ) : roadmap ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <div className="bg-navy-800/40 border border-navy-700 rounded-2xl p-6 md:p-8 relative">
                <div className="flex items-center gap-2 mb-6 text-brand-gold">
                  <Compass size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Personal Action Plan</span>
                </div>
                <div className="markdown-body prose prose-invert prose-sm max-w-none text-text-secondary leading-relaxed">
                  <ReactMarkdown>{roadmap}</ReactMarkdown>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-4 p-4 bg-navy-900 border border-navy-700 rounded-xl">
                   <div className="p-2 bg-brand-gold/10 text-brand-gold rounded-lg">
                      <Target size={18} />
                   </div>
                   <div>
                      <h4 className="text-[11px] font-bold text-text-primary uppercase tracking-wider mb-0.5">High-Yield Priorities</h4>
                      <p className="text-[10px] text-text-secondary leading-relaxed italic">The Oracle identifies study topics that maximize coin security.</p>
                   </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-navy-900 border border-navy-700 rounded-xl">
                   <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
                      <Sparkles size={18} />
                   </div>
                   <div>
                      <h4 className="text-[11px] font-bold text-text-primary uppercase tracking-wider mb-0.5">Performance Forecast</h4>
                      <p className="text-[10px] text-text-secondary leading-relaxed italic">Probabilistic outcomes for upcoming assessments.</p>
                   </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="text-center py-10 px-6 bg-navy-800/30 border border-dashed border-navy-700 rounded-2xl"
            >
               <div className="w-12 h-12 bg-navy-950 mx-auto rounded-full flex items-center justify-center mb-4 text-brand-gold/20">
                  <BookMarked size={24} />
               </div>
               <h3 className="text-lg font-bold text-text-primary mb-2">Awaiting Intelligence Consultation</h3>
               <p className="text-xs text-text-secondary max-w-md mx-auto mb-6">
                 No active roadmap found. Consult the Oracle to analyze your academic history and generate a strategic performance plan.
               </p>
               <div className="flex justify-center items-center gap-4 text-[9px] font-bold uppercase tracking-wider text-text-secondary/50">
                  <span>Analyze Hub</span>
                  <ChevronRight size={10} />
                  <span>Topic Audit</span>
                  <ChevronRight size={10} />
                  <span>Final Directives</span>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>

  );
};
