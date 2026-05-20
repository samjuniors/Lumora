import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Logo } from '../components/Logo';
import { SignIn } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';

export const Login = () => {
  const { user, authUser, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#101b2e] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If already authenticated and fully synced, redirect to dashboard
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-[#0a1027] antialiased font-sans">
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />

      {/* Decorative gradient orbs for elite Academy style */}
      <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-brand-gold/10 blur-[100px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[30vw] h-[30vw] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none animate-pulse-slow-delayed" />

      <div className="w-full max-w-md px-4 py-8 relative z-10 flex flex-col items-center animate-in fade-in duration-500">
        
        <div className="flex justify-center mb-6">
          <Logo className="w-28 h-auto text-brand-gold drop-shadow-sm" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full bg-[#101b2e]/80 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-white/[0.08] shadow-2xl"
        >
          {authUser && !user ? (
            <div className="space-y-6 text-center py-6">
              <div className="w-16 h-16 bg-brand-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand-gold/20">
                <div className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h2 className="text-xl font-bold text-text-primary tracking-tight">Initializing Academy Profile...</h2>
              <p className="text-text-secondary text-xs font-medium">Please wait while we establish your ledger credentials.</p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              <SignIn 
                routing="hash" 
                fallbackRedirectUrl="/dashboard" 
                forceRedirectUrl="/dashboard" 
                appearance={{
                  baseTheme: dark,
                  variables: {
                    colorPrimary: '#fbbf24', // Gold high contrast accent
                    colorBackground: 'transparent', // Inherit premium container bg
                    colorText: '#f8fafc',
                    colorTextSecondary: '#94a3b8',
                    colorInputBackground: '#0a1027',
                    colorInputText: '#f8fafc',
                    colorBorder: 'rgba(255,255,255,0.08)',
                    colorTextOnPrimaryBackground: '#0a1027', // Crisp readable custom navy on primary yellow button
                  },
                  elements: {
                    card: 'bg-transparent border-0 shadow-none p-0 w-full',
                    socialButtonsBlockButton: 'bg-[#0a1027] hover:bg-[#111827] text-[#f8fafc] border border-white/[0.08] rounded-xl transition-all font-semibold h-11',
                    socialButtonsBlockButtonText: 'text-[#f8fafc] font-semibold text-sm',
                    formButtonPrimary: 'bg-[#fbbf24] text-[#0a1027] hover:bg-[#fbbf24]/90 font-bold rounded-xl transition-all h-11 text-sm shadow-md shadow-brand-gold/15',
                    formFieldLabel: 'text-[#94a3b8] font-medium text-xs mb-1.5',
                    formFieldInput: 'bg-[#0a1027] border border-white/[0.08] rounded-xl text-[#f8fafc] focus:ring-1 focus:ring-[#fbbf24] focus:border-[#fbbf24] outline-none transition-all py-2.5 px-3 text-sm',
                    footerActionLink: 'text-[#fbbf24] hover:text-[#fbbf24]/80 font-semibold',
                    footerActionText: 'text-[#94a3b8]',
                    identityPreviewText: 'text-[#f8fafc]',
                    identityPreviewEditButtonIcon: 'text-[#fbbf24]',
                    dividerLine: 'bg-white/[0.08]',
                    dividerText: 'text-[#94a3b8] text-xs uppercase tracking-wider font-semibold bg-[#101b2e]',
                    formFieldInputShowPasswordButton: 'text-[#94a3b8] hover:text-[#fbbf24] h-10 pr-3',
                    header: 'w-full mb-6 font-sans text-center',
                    headerTitle: 'text-xl font-bold text-[#f8fafc] tracking-tight',
                    headerSubtitle: 'text-xs text-[#94a3b8] mt-1',
                    footer: 'w-full flex justify-center mt-6 text-xs text-[#94a3b8]',
                    formResendCodeLink: 'text-[#fbbf24] hover:text-[#fbbf24]/80 font-semibold',
                  }
                }}
              />
            </div>
          )}
        </motion.div>

        {/* Premium Covenant Footer */}
        <div className="text-center mt-6 space-x-3 text-[10px] font-black text-text-muted/40 uppercase tracking-[0.12em] relative z-20">
          <Link to="/legal?tab=terms" className="hover:text-brand-gold transition-colors">Terms of Engagement</Link>
          <span>•</span>
          <Link to="/legal?tab=privacy" className="hover:text-brand-gold transition-colors">Privacy Protocol</Link>
        </div>
      </div>
    </div>
  );
};
