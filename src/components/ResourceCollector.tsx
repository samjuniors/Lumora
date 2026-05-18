import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { walletService, userService } from '../services/dbProvider';
import { Gem, Coins, Pickaxe, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { playNotificationSound } from '../lib/audio';

export const ResourceCollector = () => {
  const { user, updateResources } = useAuth();
  const [loading, setLoading] = useState(false);
  const [collected, setCollected] = useState(false);
  
  // Calculate collection state based on last reward timing
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [canCollect, setCanCollect] = useState(false);

  const isMounted = React.useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const checkStatus = () => {
      if (!isMounted.current) return;
      const now = Date.now();
      const lastClaimed = user.lastCollectionAt ? new Date(user.lastCollectionAt).getTime() : 0;
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
  }, [user?.id, user?.lastCollectionAt]);

  const handleCollect = async () => {
    if (!user || loading || !canCollect) return;

    setLoading(true);
    try {
      const serverResult = await walletService.claimCollectorReward(user.id);
      
      const { coins: coinsAmount, diamonds: diamondsAmount, tier: tierName } = serverResult;

      updateResources({ 
        coins: (user.coins || 0) + coinsAmount,
        diamonds: (user.diamonds || 0) + diamondsAmount 
      });
      playNotificationSound();
      
      const message = tierName === "Common" 
        ? `Collected ${coinsAmount} Coins`
        : `[${tierName}] Found ${coinsAmount} Coins & ${diamondsAmount} Diamonds!`;
      
      toast.success(message, { 
          icon: tierName === "Epic" ? "🔥" : tierName === "Rare" ? "✨" : "⛏️",
          duration: 4000 
      });
      
      if (isMounted.current) {
        setCollected(true);
        setTimeout(() => { if (isMounted.current) setCollected(false); }, 3000);
        setLoading(false);
      }
    } catch (e: any) {
      if (isMounted.current) {
        toast.error(e.message || "Failed to collect resources.");
        setLoading(false);
      }
    }
  };

  const handleFastReset = async () => {
    if (!user || loading || canCollect) return;
    const resetCost = 3;

    if ((user.diamonds || 0) < resetCost) {
      toast.error(`You need ${resetCost} Diamonds for an Instant Reset!`);
      return;
    }

    if (!window.confirm(`Spend ${resetCost} Diamonds to reset the collector immediately?`)) return;

    setLoading(true);
    try {
      await walletService.resetCollector(user.id);
      
      updateResources({ diamonds: (user.diamonds || 0) - resetCost });
      toast.success("Collector Reset! Ready to mine.");
      
      if (isMounted.current) setLoading(false);
    } catch (e: any) {
      if (isMounted.current) {
        toast.error(e.message || "Failed to reset.");
        setLoading(false);
      }
    }
  };

  if (!user) return null;

  return (
    <div className="card-premium p-5 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
      <div className="absolute right-0 top-0 w-32 h-32 bg-brand-gold/5 rounded-full blur-3xl group-hover:bg-brand-gold/10 transition-all duration-700 pointer-events-none" />
      
      <div className="flex items-center gap-4 relative z-10 w-full sm:w-auto">
        <div className="w-12 h-12 bg-navy-800 text-brand-gold rounded-xl flex items-center justify-center shrink-0 border border-brand-gold/20 shadow-soft">
          <Pickaxe size={24} />
        </div>
        <div>
          <h3 className="text-base font-bold text-text-primary tracking-tight">Resource Collector</h3>
          <p className="text-[11px] font-medium text-text-secondary">Next collection: <span className={cn("font-bold", canCollect ? "text-success" : "text-brand-gold")}>{timeLeft}</span></p>
        </div>
      </div>

      <div className="flex items-center gap-2 relative z-10 w-full sm:w-auto">
        <AnimatePresence mode="wait">
          {collected ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-success/10 text-success border border-success/20 rounded-lg font-bold text-xs"
            >
              <Sparkles size={14}/> Extraction Success
            </motion.div>
          ) : (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleCollect}
                disabled={!canCollect || loading}
                className={cn(
                  "flex-1 sm:flex-none px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2",
                  canCollect 
                    ? "bg-brand-gold text-navy-950 hover:translate-y-[-1px] active:translate-y-[0px] shadow-sm" 
                    : "bg-navy-800 text-text-secondary/50 cursor-not-allowed border border-navy-700"
                )}
              >
                {loading ? 'Mining...' : canCollect ? 'Collect Now' : 'Limited'}
              </button>

              {!canCollect && (
                <button
                  onClick={handleFastReset}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-navy-800 text-cyan-400 border border-cyan-500/10 font-bold text-xs hover:bg-navy-700 transition-all flex items-center justify-center gap-2 group/reset"
                >
                  <Gem size={14} className="group-hover/reset:rotate-12 transition-transform" />
                  Reset
                </button>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>

  );
};
