import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbProvider';
import { Gem, Coins, Pickaxe, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { playNotificationSound } from '../lib/audio';

export const ResourceCollector = () => {
  const { user, updateUserBalance } = useAuth();
  const [loading, setLoading] = useState(false);
  const [collected, setCollected] = useState(false);
  
  // Calculate collection state based on last reward timing
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [canCollect, setCanCollect] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const checkStatus = () => {
      const now = Date.now();
      const lastClaimed = user.lastCollectionTime || 0;
      const hoursSinceLastClaim = (now - lastClaimed) / (1000 * 60 * 60);
      
      if (hoursSinceLastClaim >= 12) {
        setCanCollect(true);
        setTimeLeft('Ready to Collect!');
      } else {
        setCanCollect(false);
        const msLeft = (12 * 60 * 60 * 1000) - (now - lastClaimed);
        const h = Math.floor(msLeft / (1000 * 60 * 60));
        const m = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${h}h ${m}m until next drop`);
      }
    };

    checkStatus();
    const timer = setInterval(checkStatus, 60000); // Check every minute
    return () => clearInterval(timer);
  }, [user]);

  const handleCollect = async () => {
    if (!user || loading || !canCollect) return;

    setLoading(true);
    try {
      // Randomly generate rewards
      const coinsAmount = Math.floor(Math.random() * 50) + 10;
      const diamondsAmount = Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0; // 30% chance for diamonds

      await dbService.claimCollectorReward(user.id, coinsAmount, diamondsAmount);

      updateUserBalance((user.coins || 0) + coinsAmount);
      playNotificationSound();
      toast.success(`Collected ${coinsAmount} Coins${diamondsAmount > 0 ? ` & ${diamondsAmount} Diamonds!` : '!'}`);
      
      setCollected(true);
      setTimeout(() => setCollected(false), 3000);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to collect resources. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="relative overflow-hidden bg-[#1A2B48] border border-border-main rounded-3xl p-6 shadow-md transition-all shrink-0 w-full group">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.03] pointer-events-none" />
        <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all duration-700 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start gap-4">
               <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border border-white/20">
                    <Pickaxe className="w-7 h-7 text-white" />
               </div>
               <div>
                   <h3 className="text-xl font-bold text-white mb-1">Resource Collector</h3>
                   <p className="text-sm font-medium text-white/70">Mine coins and diamonds every 12 hours.</p>
                   <p className="text-xs font-bold text-amber-400 mt-2 bg-amber-400/10 inline-block px-2 py-1 rounded-md">{timeLeft}</p>
               </div>
            </div>

            <div className="flex items-center justify-center shrink-0">
               <AnimatePresence mode="wait">
                 {collected ? (
                     <motion.div
                       initial={{ scale: 0, opacity: 0 }}
                       animate={{ scale: 1, opacity: 1 }}
                       exit={{ scale: 0, opacity: 0 }}
                       className="flex items-center gap-2 bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 px-6 py-3 rounded-2xl font-bold"
                     >
                         <Sparkles className="w-5 h-5"/> Collected!
                     </motion.div>
                 ) : (
                     <button
                         onClick={handleCollect}
                         disabled={!canCollect || loading}
                         className={cn(
                             "relative w-full md:w-auto px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden",
                             canCollect 
                               ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg hover:shadow-orange-500/50 hover:-translate-y-1" 
                               : "bg-white/10 text-white/40 cursor-not-allowed border border-white/10"
                         )}
                     >
                        {loading ? 'Mining...' : canCollect ? 'Collect Now' : 'Not Ready'}
                        {canCollect && (
                            <motion.div 
                              className="absolute inset-0 bg-white/20"
                              initial={{ x: "-100%" }}
                              animate={{ x: "200%" }}
                              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                            />
                        )}
                     </button>
                 )}
               </AnimatePresence>
            </div>
        </div>
    </div>
  );
};
