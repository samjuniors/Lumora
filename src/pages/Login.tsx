import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { LogIn, Key, AlertCircle, Sparkles, User as UserIcon, Mail, Lock } from 'lucide-react';
import { dbService } from '../services/dbProvider';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from '../components/Logo';
import { handleAsyncError } from '../lib/errorHandling';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, appleProvider, googleProvider } from '../services/firebase';

export const Login = () => {
  const { user, firebaseUser, setUser, logOut } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Auto-check for pre-registration if authenticated but no profile
  React.useEffect(() => {
    const checkPreRegistration = async () => {
        if (firebaseUser && !user) {
            try {
                setLoading(true);
                const claimedUser = await dbService.checkAndClaimPreRegistration(
                    firebaseUser.email!, 
                    firebaseUser.uid, 
                    firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Unnamed user'
                );
                
                if (claimedUser) {
                    setUser(claimedUser);
                    toast.success("Welcome! Your account was pre-authorized.");
                }
            } catch (err) {
                handleAsyncError(err, "Pre-registration check failed");
            } finally {
                setLoading(false);
            }
        }
    };
    checkPreRegistration();
  }, [firebaseUser, user]);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleVerifyInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !firebaseUser) return;
    
    setLoading(true);
    setErrorMsg('');
    
    try {
        const newUser = await dbService.redeemInviteCode(
            inviteCode.trim(),
            firebaseUser.uid,
            firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Unnamed user',
            firebaseUser.email || ''
        );

        setUser(newUser);
        toast.success("Welcome aboard!");
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process invite code');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setErrorMsg('Authentication provider not enabled. Please enable "Email/Password" and "Google" in your Firebase Console Settings.');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMsg('This email is already in use. Please log in instead.');
      } else {
        setErrorMsg(err.message || 'Authentication failed');
      }
      handleAsyncError(err, 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleProviderSignIn = async (provider: any) => {
    setErrorMsg('');
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error?.code === 'auth/operation-not-allowed') {
        setErrorMsg('This provider is not enabled in Firebase. Please enable it in the Firebase Console (Authentication > Sign-in method).');
      } else if (error?.code !== 'auth/popup-closed-by-user' && error?.code !== 'auth/cancelled-popup-request' && error?.code !== 'auth/user-cancelled') {
        setErrorMsg(error.message || 'Authentication failed');
        handleAsyncError(error, 'Provider sign in failed');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-bg-main antialiased font-sans">
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />

      {/* Decorative gradient orbs */}
      <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-brand-gold/10 blur-[100px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[30vw] h-[30vw] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none animate-pulse-slow-delayed" />

      <div className="w-full max-w-sm px-6 relative z-10">
        
        <div className="flex justify-center mb-8">
          <Logo className="w-32 h-auto text-brand-gold drop-shadow-sm" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="bg-bg-surface/80 backdrop-blur-xl p-8 rounded-3xl border border-border-main shadow-2xl"
        >
          {firebaseUser && !user ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 text-center py-8"
            >
              <div className="w-16 h-16 bg-brand-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand-gold/20">
                <div className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h2 className="text-2xl font-bold text-text-primary tracking-tight">Setting up your profile...</h2>
              <p className="text-text-secondary text-sm mt-2 font-medium">Please wait while we initialize your account.</p>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-text-primary tracking-tight">{isLogin ? 'Welcome back' : 'Create an account'}</h2>
                <p className="text-text-secondary text-sm mt-1">Enter your details to continue</p>
              </div>

              <AnimatePresence>
                {errorMsg && (
                  <motion.div 
                    key="error-msg-login"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-sm text-red-500 flex items-center gap-2 font-medium bg-red-500/10 p-3 rounded-xl border border-red-500/20"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0"/> {errorMsg}
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-text-secondary/50" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-3 bg-bg-main border border-border-main rounded-xl focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold outline-none transition-all text-sm font-medium text-text-primary placeholder:text-text-secondary/50"
                      required
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-text-secondary/50" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full pl-10 pr-4 py-3 bg-bg-main border border-border-main rounded-xl focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold outline-none transition-all text-sm font-medium text-text-primary placeholder:text-text-secondary/50"
                      required
                    />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full flex items-center justify-center bg-text-primary text-bg-main px-4 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 shadow-md"
                >
                  {loading ? 'Continuing...' : (isLogin ? 'Log in' : 'Create account')}
                </motion.button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border-main"></span>
                </div>
                <div className="relative flex justify-center text-xs font-medium text-text-secondary uppercase tracking-widest">
                  <span className="bg-bg-surface px-3">or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleProviderSignIn(googleProvider)}
                  className="flex items-center justify-center gap-2 bg-bg-main border border-border-main text-text-primary px-4 py-2.5 rounded-xl font-semibold text-sm transition-all hover:bg-bg-surface-hover shadow-sm"
                >
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                  Google
                </motion.button>
                <div
                  className="flex items-center justify-center gap-2 bg-bg-main border border-border-main text-text-secondary px-4 py-2.5 rounded-xl font-semibold text-sm cursor-not-allowed opacity-60"
                >
                  <svg className="w-5 h-5 fill-current opacity-80" viewBox="0 0 24 24"><path d="M16.92 14.88c-.03-2.61 2.24-3.9 2.34-3.96-1.2-1.74-3.1-1.99-3.79-2.03-1.63-.16-3.18 1.04-4.02 1.04-.84 0-2.14-.99-3.48-.96-1.74.03-3.34 1.02-4.24 2.56-1.84 3.16-.48 7.82 1.3 10.37.87 1.25 1.9 2.65 3.25 2.61 1.32-.04 1.83-.84 3.42-.84 1.58 0 2.05.84 3.44.81 1.43-.02 2.32-1.28 3.18-2.52 1.01-1.46 1.43-2.88 1.46-2.95-.03-.01-2.85-1.07-2.86-4.13zm-2.52-6.52c.67-.84 1.13-2 1.01-3.16-1.01.04-2.22.68-2.91 1.51-.55.65-1.09 1.83-.94 2.97 1.13.08 2.2-.55 2.84-1.32z"/></svg>
                  Coming Soon
                </div>
              </div>

              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setErrorMsg('');
                  }}
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors font-medium"
                >
                  {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
                </button>
              </div>

            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

