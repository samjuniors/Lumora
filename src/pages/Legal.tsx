import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronLeft, ShieldCheck, Scale, FileText, Sparkles, AlertTriangle, Eye, Landmark } from 'lucide-react';
import { Logo } from '../components/Logo';

export const Legal = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'privacy' ? 'privacy' : 'terms';

  const handleTabChange = (tab: 'terms' | 'privacy') => {
    setSearchParams({ tab });
  };

  return (
    <div className="min-h-screen bg-bg-main relative py-12 md:py-20 px-4 md:px-6 overflow-x-hidden">
      {/* Background Decorative Accents */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-gold/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10 space-y-8">
        
        {/* Back Navigation & Brand Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pb-6 border-b border-white/[0.08]">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-brand-gold transition-colors group cursor-pointer self-start"
          >
            <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-1" />
            <span>Operational Terminus</span>
          </button>
          
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase font-black tracking-[0.2em] px-2.5 py-1 bg-brand-gold/10 border border-brand-gold/20 text-brand-gold rounded">
              Lumina Enforcer Corp
            </span>
          </div>
        </div>

        {/* Title Block */}
        <div className="text-left space-y-4">
          <div className="flex justify-start">
            <Logo className="w-36 h-auto text-[#D4AF37]" />
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-text-primary">
            Regulatory <span className="text-brand-gold">Charter</span>
          </h1>
          <p className="text-sm md:text-base text-text-secondary max-w-2xl font-medium leading-relaxed">
            By enrolling in Lumina Academy, you execute a binding covenant. Our operations enforce strict academic loss-aversion psychology to drive peerless excellence.
          </p>
        </div>

        {/* Tab Selection Switch */}
        <div className="flex border-b border-white/[0.08] p-1 bg-white/[0.01] rounded-2xl w-full sm:max-w-md">
          <button
            onClick={() => handleTabChange('terms')}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'terms'
                ? 'bg-brand-gold/10 text-brand-gold border border-brand-gold/20 shadow-[0_0_15px_rgba(212,175,55,0.05)]'
                : 'text-text-muted hover:text-white bg-transparent border border-transparent'
            }`}
          >
            <Scale size={14} />
            <span>Terms of Engagement</span>
          </button>
          <button
            onClick={() => handleTabChange('privacy')}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-brand-gold/10 text-brand-gold border border-brand-gold/20 shadow-[0_0_15px_rgba(212,175,55,0.05)]'
                : 'text-text-muted hover:text-white bg-transparent border border-transparent'
            }`}
          >
            <ShieldCheck size={14} />
            <span>Data & Privacy Protocol</span>
          </button>
        </div>

        {/* Core Content Area */}
        <div className="bg-bg-surface/60 backdrop-blur-md border border-white/[0.05] rounded-[2rem] p-6 md:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/5 rounded-full blur-2xl pointer-events-none" />
          
          {activeTab === 'terms' ? (
            <div className="space-y-8 text-text-secondary leading-relaxed text-sm font-medium">
              
              {/* Warnings and Key Metrics Panel */}
              <div className="p-6 bg-red-500/[0.02] border border-red-500/10 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-red-400 font-extrabold text-xs uppercase tracking-widest">
                  <AlertTriangle size={16} />
                  <span>Tactical Level Warning: Psychological Loss-Aversion Active</span>
                </div>
                <p className="text-xs text-text-muted/90 leading-relaxed font-semibold">
                  Lumina Academy uses active asset-backed penalty protocols. Your performance has direct economic consequences on this platform. Failure to complete tasks will trigger systemic currency liquidations. Enrollment represents absolute compliance.
                </p>
              </div>

              {/* Section 1 */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2 tracking-tight">
                  <span className="text-brand-gold font-mono">01.</span> The 30% Platform Sustainability Tax
                </h3>
                <p>
                  To secure general ledger equilibrium, maintain top-tier oracle feedback engines, and guarantee developer administrative margins, <strong className="text-brand-gold">a flat 30% Platform Tax</strong> is systematically imposed on all reward distributions. This tax is automatically deducted at receipt. Under no circumstances can this levy be audited, reversed, or refunded.
                </p>
              </div>

              {/* Section 2 */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2 tracking-tight">
                  <span className="text-brand-gold font-mono">02.</span> Double-Down Staking & Extreme Penalties
                </h3>
                <p>
                  Lumina permits students to double their stake in a specific mission to earn <strong className="text-brand-gold">2.5x rewards</strong>. However, executing this double-down activates the reciprocal clause: should you fail to upload proof of task fulfillment before the designated millisecond deadline, <strong className="text-red-400">a double-down penalty of 2x the base stake</strong> will be instantly sweeper-deducted from your active neural coin balance.
                </p>
              </div>

              {/* Section 3 */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2 tracking-tight">
                  <span className="text-brand-gold font-mono">03.</span> Automated Penalty Sweeper Protocol
                </h3>
                <p>
                  Our system maintains active cron sweep routines (`firebaseService.ts` & `rechargeService`). Upon task deadline expiration, any pending mission without a valid academic audit is automatically flagged as "Missed." The penalty sweeper executes daily, stripping appropriate coin quotas directly from user balances. You waive all rights of appeal regarding automated sweeper liquidations.
                </p>
              </div>

              {/* Section 4 */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2 tracking-tight">
                  <span className="text-brand-gold font-mono">04.</span> Syndicate Liability and Score Shielding
                </h3>
                <p>
                  Members of a Syndicate (group dynamic) share a collective destiny. Syndicates enjoy collective score shielding and dividend payouts, which can temporarily buffer single-user failures. In exchange, the syndicate remains jointly and severally liable for collective XP performance. Any attempt to abuse syndicate shielding or exploit game mechanics will result in immediate syndicate decommissioning.
                </p>
              </div>

              {/* Section 5 */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2 tracking-tight">
                  <span className="text-brand-gold font-mono">05.</span> System Currency Valuation Limits
                </h3>
                <p>
                  Lumina Coins and Diamonds are proprietary units of utility designed purely to incentivize performance on this cloud sandbox environment. They possess no legal-tender equivalence, have no guaranteed external marketplace conversion value, and are highly subject to administrative inflation, deflation, or full resetting at the Academy's absolute discretion.
                </p>
              </div>

            </div>
          ) : (
            <div className="space-y-8 text-text-secondary leading-relaxed text-sm font-medium">
              
              {/* Privacy Metric Panel */}
              <div className="p-6 bg-brand-gold/[0.02] border border-brand-gold/10 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-brand-gold font-extrabold text-xs uppercase tracking-widest font-mono">
                  <Eye size={16} />
                  <span>Neural Ingress Encryption Standard</span>
                </div>
                <p className="text-xs text-text-muted/90 leading-relaxed font-semibold">
                  Lumina Academy uses secure industry-standard cryptographic keys via Clerk Identity Provider and Google Cloud KMS. All sensitive profile telemetry and wallet history rows are locked behind strict Firestore and Postgres security policies.
                </p>
              </div>

              {/* Section 1 */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2 tracking-tight">
                  <span className="text-brand-gold font-mono">01.</span> Personal Telemetry Capture
                </h3>
                <p>
                  We compile personal credentials necessary to secure operations, including your name, verified educational email, IP addresses used during login, neural interaction durations, and transaction history receipts. Firebase authentication cookies maintain active persistent state with safe standard security policies.
                </p>
              </div>

              {/* Section 2 */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2 tracking-tight">
                  <span className="text-brand-gold font-mono">02.</span> AI Oracle & Assessment Grading Telemetry
                </h3>
                <p>
                  Every assignment, essay, and text submission you upload is transmitted to our server-side LLM Gemini API gateway to generate performance scores, grades, and personalized feedback. This content is processed in strict isolation. We do not sell your academic submissions; however, metadata may be used to retrain local evaluators.
                </p>
              </div>

              {/* Section 3 */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2 tracking-tight">
                  <span className="text-brand-gold font-mono">03.</span> Ledger Audits and Fiscal Telemetry
                </h3>
                <p>
                  To secure absolute transparency block-by-block, transactional history logs (transfers, conversions, shop purchases, and sweep liquidations) are permanently preserved in our Postgres Ledger. This financial database is non-custodial and designed purely to maintain peer competitiveness. These logs are accessible by the System Admins for regulatory compliance.
                </p>
              </div>

              {/* Section 4 */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2 tracking-tight">
                  <span className="text-brand-gold font-mono">04.</span> Data Retention Rules
                </h3>
                <p>
                  We retain user profile data for as long as your account is active or operational. Should you choose to exit Project Lumina, you can request full account deletion via your profile terminal, which will cleanly wipe your presence indicators and Clerk authenticators, keeping only historical mathematical coefficients in our transaction tables.
                </p>
              </div>

            </div>
          )}

          {/* Verification Stamps */}
          <div className="mt-12 pt-8 border-t border-white/[0.08] flex flex-wrap justify-between items-center gap-4 text-[10px] font-bold text-text-muted/60 uppercase tracking-widest font-mono">
            <span>Security Hash: SHA-256/LUMINA_SECURE</span>
            <span>Version: v2.6.5-PROD</span>
          </div>
        </div>

        {/* Legal Disclaimer Footer */}
        <div className="text-center space-y-4 text-xs font-semibold text-text-muted/70 pt-6">
          <p>© {new Date().getFullYear()} Lumina High-Stakes Academy. All operations protected under local state educational frameworks.</p>
          <div className="flex justify-center gap-4">
            <button onClick={() => handleTabChange('terms')} className="hover:text-brand-gold transition-colors">Terms</button>
            <span>•</span>
            <button onClick={() => handleTabChange('privacy')} className="hover:text-brand-gold transition-colors">Privacy Policy</button>
          </div>
        </div>

      </div>
    </div>
  );
};
