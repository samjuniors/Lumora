import React from 'react';
import { motion } from 'motion/react';
import { FileText, X, AlertTriangle, ShieldCheck, CheckCircle, Zap, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const RulesModal = ({ onClose }: { onClose: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[999] bg-text-primary/60 backdrop-blur-md flex justify-center items-center p-4"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-bg-surface rounded-[32px] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative"
      >
        <div className="p-6 border-b border-border-main flex items-center justify-between bg-bg-main/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-gold-secondary-hover text-brand-gold rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-text-primary leading-none mb-1">Platform Rules & Regulations</h2>
              <p className="text-[10px] uppercase font-bold text-text-secondary/80 tracking-widest">Grading & Economy Policies</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-text-secondary/80 hover:text-text-primary bg-bg-surface hover:bg-border-main rounded-lg transition-all border border-transparent hover:border-border-main">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-8">
          
          <section>
            <h3 className="flex items-center gap-2 font-black text-lg text-text-primary mb-4 tracking-tight">
              <Zap className="w-5 h-5 text-amber-500" /> Reward & Grading System
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 rounded-2xl border border-brand-gold/20 bg-brand-gold-secondary-hover/50">
                <div className="w-10 h-10 rounded-xl bg-brand-gold-secondary-hover text-brand-gold font-black text-lg flex shrink-0 items-center justify-center">A+</div>
                <div>
                  <p className="font-bold text-text-primary text-sm">95 - 100</p>
                  <p className="text-[11px] text-text-secondary leading-tight">Exceptional. Earn <strong className="text-indigo-700">120%</strong> reward.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-2xl border border-success-green/20 bg-success-green/10/50">
                <div className="w-10 h-10 rounded-xl bg-success-green/20 text-emerald-600 font-black text-lg flex shrink-0 items-center justify-center">A</div>
                <div>
                  <p className="font-bold text-text-primary text-sm">90 - 94</p>
                  <p className="text-[11px] text-text-secondary leading-tight">Excellent. Earn <strong className="text-success-green">100%</strong> reward.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-2xl border border-cyan-100 bg-cyan-50/50">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-600 font-black text-lg flex shrink-0 items-center justify-center">B+</div>
                <div>
                  <p className="font-bold text-text-primary text-sm">85 - 89</p>
                  <p className="text-[11px] text-text-secondary leading-tight">Great work. Earn <strong className="text-cyan-700">90%</strong> reward.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-2xl border border-blue-100 bg-blue-50/50">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 font-black text-lg flex shrink-0 items-center justify-center">B</div>
                <div>
                  <p className="font-bold text-text-primary text-sm">80 - 84</p>
                  <p className="text-[11px] text-text-secondary leading-tight">Good work. Earn <strong className="text-blue-700">80%</strong> reward.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-2xl border border-amber-100 bg-brand-gold/10/50">
                <div className="w-10 h-10 rounded-xl bg-brand-gold/20 text-brand-gold font-black text-lg flex shrink-0 items-center justify-center">C</div>
                <div>
                  <p className="font-bold text-text-primary text-sm">70 - 79</p>
                  <p className="text-[11px] text-text-secondary leading-tight">Average. Earn <strong className="text-brand-gold">50%</strong> reward.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-2xl border border-orange-100 bg-orange-50/50 opacity-80">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 font-black text-lg flex shrink-0 items-center justify-center">D</div>
                <div>
                  <p className="font-bold text-text-primary text-sm">60 - 69</p>
                  <p className="text-[11px] text-text-secondary leading-tight">Pass. <strong className="text-orange-700">0%</strong> coin reward.</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="flex items-center gap-2 font-black text-lg text-rose-600 mb-4 tracking-tight">
              <AlertTriangle className="w-5 h-5" /> Failures & Retests (Grade F)
            </h3>
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5 text-sm text-rose-900 space-y-4">
              <p>
                <strong>Score: 0 - 59 (Grade F)</strong>
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>If you receive an F grade, you get <strong>0%</strong> of the reward.</li>
                <li>Your submission will be immediately <strong>REJECTED</strong>.</li>
                <li>You are <strong>COMPULSORILY REQUIRED</strong> to re-take the mission.</li>
                <li>You will be granted a <strong>48-hour Grace Period</strong> to upload the fixed test or presentation.</li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="flex items-center gap-2 font-black text-lg text-emerald-600 mb-4 tracking-tight">
              <Sparkles className="w-5 h-5" /> XP & VIP System
            </h3>
            <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-2xl p-5 text-sm text-emerald-900 space-y-4">
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Gaining XP:</strong> Your XP (Experience Points) only increases by completing missions/campaigns, receiving admin gifts, achievements, daily drops, and sending coins to other users. XP does not drop.</li>
                <li><strong>VIP Experience:</strong> Your VIP Level progress strictly increases only by recharging coins or receiving coin additions manually by the admin. Spending coins or normal rewards do NOT advance your VIP Level.</li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="flex items-center gap-2 font-black text-lg text-brand-gold mb-4 tracking-tight">
              <ShieldCheck className="w-5 h-5" /> Entry Fees & Penalties
            </h3>
            <div className="bg-brand-gold-secondary-hover border border-brand-gold/20 rounded-2xl p-5 text-sm text-indigo-900 space-y-4">
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Entry Fee:</strong> Deducted from your wallet instantly upon enrolling in a mission.</li>
                <li><strong>Manual Penalties:</strong> Admin reserves the right to issue manual coin deductions for rule violations, plagiarism, or misconduct.</li>
                <li><strong>Revoke Policy:</strong> Admins can revoke accepted submissions and apply penalties if violations are found post-approval.</li>
                <li><strong>Transfers & Tax:</strong> Whenever you send coins to another peer, a <strong>30% tax</strong> is levied on the transaction margin (forwarded to the Super Admin tax wallet). The receiver gets the remaining 70%, but NO experience points. The <strong>sender</strong> gains XP equivalent to 100% of the coins sent!</li>
                <li>All transactions and penalties are recorded and can be viewed in your <strong>Wallet</strong> history.</li>
              </ul>
            </div>
          </section>

        </div>
        
        <div className="p-6 border-t border-border-main bg-bg-main flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-3 bg-text-primary text-bg-main font-bold rounded-xl hover:bg-text-secondary/80 hover:text-bg-main transition-all shadow-md focus:ring-4 focus:ring-border-main"
          >
            I Understand
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
