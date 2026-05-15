import React from 'react';
import { motion } from 'motion/react';
import { FileText, X, AlertTriangle, ShieldCheck, CheckCircle, Zap, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';

export const RulesModal = ({ onClose }: { onClose: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[999] bg-slate-950/90 backdrop-blur-md flex justify-center items-center p-6"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#0A0F1A] border border-white/10 rounded-[32px] w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,1)] relative"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#1A2B48]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-gold/10 text-brand-gold rounded-xl flex items-center justify-center border border-brand-gold/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white leading-none mb-1">Platform Protocols</h2>
              <p className="text-[9px] uppercase font-bold text-brand-gold/60 tracking-widest leading-none">Rules & Civil Regulations</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6 scrollbar-hide">
          
          <section>
            <h3 className="flex items-center gap-2 font-black text-xs text-brand-gold mb-3 uppercase tracking-widest">
              <Zap className="w-4 h-4" /> Grading Scale
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { grade: 'A+', range: '95-100', reward: '120%', color: 'text-amber-400' },
                { grade: 'A', range: '90-94', reward: '100%', color: 'text-emerald-400' },
                { grade: 'B+', range: '85-89', reward: '90%', color: 'text-cyan-400' },
                { grade: 'B', range: '80-84', reward: '80%', color: 'text-blue-400' },
              ].map(item => (
                <div key={item.grade} className="flex items-center justify-between p-3 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <div>
                    <p className={cn("font-black text-lg leading-none mb-1", item.color)}>{item.grade}</p>
                    <p className="text-[10px] text-slate-500 font-bold">{item.range}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Yield</p>
                    <p className="font-black text-white text-sm leading-none">{item.reward}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="flex items-center gap-2 font-black text-xs text-rose-500 mb-3 uppercase tracking-widest">
              <AlertTriangle className="w-4 h-4" /> Penalties (Grade F)
            </h3>
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4 text-[11px] text-slate-300 leading-relaxed">
              <ul className="space-y-2">
                <li className="flex gap-2">
                  <span className="text-rose-500 shrink-0">•</span>
                  <span><strong>F (0-59):</strong> No rewards. Immediate rejection of submission.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-rose-500 shrink-0">•</span>
                  <span><strong>Compulsory Retest:</strong> 48h grace period to fix and resubmit.</span>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="flex items-center gap-2 font-black text-xs text-cyan-400 mb-3 uppercase tracking-widest">
              <Sparkles className="w-4 h-4" /> Diamond Economy
            </h3>
            <div className="bg-cyan-400/5 border border-cyan-400/20 rounded-2xl p-4 text-[11px] text-slate-300 leading-relaxed">
              <ul className="space-y-2">
                <li className="flex gap-2">
                  <span className="text-cyan-400 shrink-0">•</span>
                  <span>Collect Diamonds from achievements, drops, and gifts to level up.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-400 shrink-0">•</span>
                  <span><strong>Transfers:</strong> Receivers get Diamonds 1:1 with Coins received.</span>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="flex items-center gap-2 font-black text-xs text-brand-gold mb-3 uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4" /> General Policy
            </h3>
            <div className="bg-brand-gold/5 border border-brand-gold/20 rounded-2xl p-4 text-[11px] text-slate-300 leading-relaxed">
              <ul className="space-y-2">
                <li className="flex gap-2">
                  <span className="text-brand-gold shrink-0">•</span>
                  <span><strong>Tax:</strong> 30% flat tax on P2P transfers.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-gold shrink-0">•</span>
                  <span><strong>Conduct:</strong> Anti-plagiarism strictly enforced.</span>
                </li>
              </ul>
            </div>
          </section>

        </div>
        
        <div className="p-6 border-t border-white/5 bg-[#0D1525] flex flex-col gap-3">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-brand-gold hover:bg-[#C5A02E] text-[#1A2B48] font-black rounded-2xl transition-all shadow-lg active:scale-95 text-sm"
          >
            I Accept Terms
          </button>
          <p className="text-center text-[8px] text-slate-500 font-bold uppercase tracking-[0.2em]">
            Signature Authenticated • Session Secure
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};
