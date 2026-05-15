import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Sparkles, X, Star, Coins, Zap, Clock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbProvider';
import { useSound } from '../hooks/useSound';
import confetti from 'canvas-confetti';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';

type RewardType = 'coins' | 'xp' | 'item' | 'penalty';

interface DailyReward {
  type: RewardType;
  value: number | string;
  label: string;
  icon: React.ReactNode;
  duration?: number; // in days
}

export const DailyRewardModal = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimedReward, setClaimedReward] = useState<DailyReward | null>(null);
  const { playSound } = useSound();

  useEffect(() => {
    if (user?.role !== 'student') return;
    
    const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const year = nowIST.getFullYear();
    const month = String(nowIST.getMonth() + 1).padStart(2, '0');
    const day = String(nowIST.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    
    if (user.lastRewardClaimed !== today) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const generateReward = (): DailyReward => {
    const roll = Math.random();
    
    if (roll < 0.10) { // 10% chance for a temporary item
      const items = [
        { label: 'Gold Frame', id: 'frame_gold', duration: 1 },
        { label: 'Neon Glow Frame', id: 'frame_neon', duration: 3 },
        { label: 'Cyber Aura', id: 'frame_cyber', duration: 1 }
      ];
      const item = items[Math.floor(Math.random() * items.length)];
      return {
        type: 'item',
        value: item.id,
        label: `${item.label} (${item.duration}d)`,
        icon: <Zap className="w-10 h-10 text-amber-400" />,
        duration: item.duration
      };
    } else if (roll < 0.30) { // 20% chance for penalty
      const penaltyVal = Math.floor(Math.random() * 20) + 1; // 1 to 20 coins penalty
      return {
         type: 'penalty',
         value: penaltyVal,
         label: `-${penaltyVal} Coins (Unlucky Drop!)`,
         icon: <Zap className="w-10 h-10 text-red-500" />
      };
    } else if (roll < 0.60) { // 30% chance for XP boost
      const xpVal = Math.floor(Math.random() * 150) + 50; // 50 to 200 XP
      return {
        type: 'xp',
        value: xpVal,
        label: `${xpVal} Mission XP`,
        icon: <Star className="w-10 h-10 text-indigo-400" />
      };
    } else if (roll < 0.85) { // 25% chance for diamonds
      const diamondVal = Math.floor(Math.random() * 3) + 1; // 1 to 3 diamonds
      return {
        type: 'diamonds' as any,
        value: diamondVal,
        label: `${diamondVal} Diamonds`,
        icon: <Star className="w-10 h-10 text-cyan-400" />
      };
    } else { // 15% chance for coins
      const coinVal = Math.floor(Math.random() * 3) + 1; // 1 to 3 coins
      return {
        type: 'coins',
        value: coinVal,
        label: `${coinVal} Coins`,
        icon: <Coins className="w-10 h-10 text-amber-500" />
      };
    }
  };

  const handleClaim = async () => {
    if (!user) return;
    setIsClaiming(true);
    
    try {
      const reward = generateReward();
      await dbService.claimDailyReward(user.id, { type: reward.type, value: reward.value });

      setClaimedReward(reward);
      playSound(reward.type === 'penalty' ? 'notification' : 'success');
      
      if (reward.type !== 'penalty') {
        confetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#a855f7', '#fbbf24', '#ffffff']
        });
      }

      toast(reward.type === 'penalty' ? `Ouch! ${reward.label}` : `Claimed: ${reward.label}`, {
        icon: reward.type === 'penalty' ? '📉' : '🎉'
      });
      
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to claim reward. Please try again.");
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
           key="daily-reward-modal"
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-[#000000]/60 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="bg-bg-surface rounded-[40px] p-10 w-full max-w-sm relative z-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-border-main flex flex-col items-center text-center overflow-y-auto max-h-[90vh] no-scrollbar"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500" />
            
            {!claimedReward ? (
              <motion.div key="unopened" className="flex flex-col items-center">
                <div className="relative w-32 h-32 bg-gradient-to-br from-amber-400 to-orange-500 rounded-[2.5rem] flex items-center justify-center text-bg-main shadow-2xl shadow-amber-500/30 mb-8 rotate-6">
                  <Gift className="w-16 h-16" />
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-2 blur-2xl bg-gradient-to-br from-amber-400 to-orange-500 opacity-40 -z-10"
                  />
                  <div className="absolute -top-3 -right-3 bg-bg-surface text-brand-gold w-10 h-10 rounded-full flex items-center justify-center shadow-lg font-black text-xs border-2 border-indigo-50">
                    NEW
                  </div>
                </div>
                
                <h2 className="text-3xl font-black text-text-primary mb-2 tracking-tight">Daily Drop</h2>
                <p className="text-text-secondary font-medium mb-8 text-sm px-4">A random box of goodies! Could be coins, XP, or rare limited-time perks.</p>
                
                <button
                  onClick={handleClaim}
                  disabled={isClaiming}
                  className="w-full py-5 bg-text-primary hover:bg-brand-gold-hover text-bg-main font-black rounded-3xl transition-all active:scale-95 shadow-xl shadow-black/10 flex items-center justify-center gap-2 group"
                >
                  {isClaiming ? 'Opening Box...' : (
                    <>
                      Unlock Rewards <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
                    </>
                  )}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="mt-5 text-[10px] font-black text-text-secondary/60 hover:text-text-primary uppercase tracking-[0.2em] transition-colors"
                >
                  Maybe Later
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="claimed"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-4"
              >
                <div className="w-24 h-24 bg-bg-main rounded-full flex items-center justify-center mb-6 border-4 border-border-main shadow-inner">
                  {claimedReward.icon}
                </div>
                <h2 className="text-4xl font-black text-text-primary mb-2 tracking-tighter">SUCCESS!</h2>
                <div className="bg-brand-gold-secondary-hover text-indigo-700 px-6 py-2 rounded-full font-black text-lg mb-8 border border-brand-gold/20 uppercase tracking-tight">
                  {claimedReward.label}
                </div>
                
                {claimedReward.type === 'item' && (
                  <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-widest mb-6">
                    <Clock className="w-4 h-4" /> Expires in {claimedReward.duration} days
                  </div>
                )}
                
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full py-4 bg-brand-gold-hover text-bg-main font-black rounded-2xl shadow-lg shadow-indigo-100 active:scale-95"
                >
                  Perfect!
                </button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

