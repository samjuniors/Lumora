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
        className="bg-bg-surface border border-white/10 rounded-[2.5rem] w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,1)] relative"
      >
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-gold/10 text-brand-gold rounded-2xl flex items-center justify-center border border-brand-gold/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-text-primary leading-none mb-1.5 tracking-tight">Platform Protocols</h2>
              <p className="text-[10px] uppercase font-black text-brand-gold tracking-[0.3em] leading-none opacity-60 italic">Rules & Civil Regulations</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 text-text-muted hover:text-text-primary bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-8 space-y-8 no-scrollbar">
          
          <section>
            <h3 className="flex items-center gap-3 font-black text-[10px] text-brand-gold mb-4 uppercase tracking-[0.3em] opacity-80">
              <Zap className="w-4 h-4" /> Grading Scale
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { grade: 'A+', range: '95-100', reward: '120%', color: 'text-brand-gold' },
                { grade: 'A', range: '90-94', reward: '100%', color: 'text-emerald-400' },
                { grade: 'B+', range: '85-89', reward: '90%', color: 'text-cyan-400' },
                { grade: 'B', range: '80-84', reward: '80%', color: 'text-indigo-400' },
              ].map(item => (
                <div key={item.grade} className="flex items-center justify-between p-4 rounded-3xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all group">
                  <div>
                    <p className={cn("font-black text-2xl leading-none mb-1 group-hover:scale-110 transition-transform origin-left", item.color)}>{item.grade}</p>
                    <p className="text-[10px] text-text-muted font-black uppercase opacity-40">{item.range}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] text-text-muted font-black uppercase tracking-widest opacity-40">Yield</p>
                    <p className="font-black text-text-primary text-sm tracking-tighter">{item.reward}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="flex items-center gap-3 font-black text-[10px] text-rose-500 mb-4 uppercase tracking-[0.3em] opacity-80">
              <AlertTriangle className="w-4 h-4" /> Penalties (Grade F)
            </h3>
            <div className="bg-rose-500/5 border border-rose-500/10 rounded-3xl p-5 space-y-3">
                <div className="flex gap-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                  <p className="text-[11px] text-text-muted font-medium leading-relaxed italic opacity-80"><strong>F (0-59):</strong> No rewards. Immediate rejection of submission. Neural-link failure detected.</p>
                </div>
                <div className="flex gap-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                  <p className="text-[11px] text-text-muted font-medium leading-relaxed italic opacity-80"><strong>Compulsory Retest:</strong> 48h grace period to fix and resubmit before permanent deduction.</p>
                </div>
            </div>
          </section>

          <section>
            <h3 className="flex items-center gap-3 font-black text-[10px] text-cyan-400 mb-4 uppercase tracking-[0.3em] opacity-80">
              <Sparkles className="w-4 h-4" /> Diamond Economy
            </h3>
            <div className="bg-cyan-400/5 border border-cyan-400/10 rounded-3xl p-5 space-y-3">
                <div className="flex gap-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  <p className="text-[11px] text-text-muted font-medium leading-relaxed italic opacity-80">Collect Diamonds from achievements, drops, and gifts to level up your Neural-Link status.</p>
                </div>
                <div className="flex gap-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  <p className="text-[11px] text-text-muted font-medium leading-relaxed italic opacity-80"><strong>Transfers:</strong> Receivers get Diamonds 1:1 with Credits received for social reputation.</p>
                </div>
            </div>
          </section>

          <section>
            <h3 className="flex items-center gap-3 font-black text-[10px] text-brand-gold mb-4 uppercase tracking-[0.3em] opacity-80">
              <ShieldCheck className="w-4 h-4" /> Protocol Policies
            </h3>
            <div className="bg-brand-gold/5 border border-brand-gold/10 rounded-3xl p-5 space-y-3">
                <div className="flex gap-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-gold mt-1.5 shrink-0" />
                  <p className="text-[11px] text-text-muted font-medium leading-relaxed italic opacity-80"><strong>Audit Tax:</strong> 30% flat tax on all P2P transmissions for ecosystem maintenance.</p>
                </div>
                <div className="flex gap-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-gold mt-1.5 shrink-0" />
                  <p className="text-[11px] text-text-muted font-medium leading-relaxed italic opacity-80"><strong>Conduct Code:</strong> Plagiarism will result in immediate termination of operational access.</p>
                </div>
            </div>
          </section>

        </div>
        
        <div className="p-8 border-t border-white/5 bg-white/[0.01] flex flex-col gap-4">
          <button 
            onClick={onClose}
            className="w-full py-5 bg-brand-gold hover:bg-brand-gold/90 text-bg-main font-black rounded-[1.5rem] transition-all shadow-xl active:scale-95 text-xs uppercase tracking-[0.2em]"
          >
            Acknowledge Protocols
          </button>
          <p className="text-center text-[9px] text-text-muted font-black uppercase tracking-[0.3em] opacity-40 italic">
            Neural-link Authenticated • Session Secure
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};
