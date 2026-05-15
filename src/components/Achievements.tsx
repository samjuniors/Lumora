import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbProvider';
import { toast } from 'react-hot-toast';
import { Award, CheckCircle, Flame, Star, Sparkles, TrendingUp, ArrowUpCircle, ShoppingCart, Zap, CalendarDays } from 'lucide-react';
import { motion } from 'motion/react';
import { getUserLevelAndXP } from '../lib/utils';

type InfiniteAchievementDef = {
  id: string;
  title: string;
  icon: React.ReactNode;
  getDescription: (tier: number, goal: number) => string;
  getGoal: (tier: number) => number;
  getReward: (tier: number) => { coins: number, xp: number };
};

const REWARD_FN = (tier: number) => {
  const coins = Math.min(20, Math.floor(10 * Math.pow(1.1, tier - 1)));
  const xp = Math.min(20, Math.floor(10 * Math.pow(1.1, tier - 1)));
  return { coins, xp };
};

export const INFINITE_ACHIEVEMENTS: InfiniteAchievementDef[] = [
  {
    id: 'wealth',
    title: 'Wealth Tycoon',
    icon: <Sparkles className="w-10 h-10 text-yellow-500 drop-shadow-sm" />,
    getDescription: (tier, goal) => `Hold ${goal} coins in your wallet at once (Tier ${tier})`,
    getGoal: (tier) => tier * 500,
    getReward: REWARD_FN,
  },
  {
    id: 'scholar',
    title: 'Determined Scholar',
    icon: <Star className="w-10 h-10 text-brand-gold drop-shadow-sm" />,
    getDescription: (tier, goal) => `Complete and get graded on ${goal} assignments (Tier ${tier})`,
    getGoal: (tier) => tier * 10,
    getReward: REWARD_FN,
  },
  {
    id: 'perfectionist',
    title: 'Flawless Execution',
    icon: <Flame className="w-10 h-10 text-orange-500 drop-shadow-sm" />,
    getDescription: (tier, goal) => `Score a perfect 100/100 on ${goal} assignments (Tier ${tier})`,
    getGoal: (tier) => tier * 5,
    getReward: REWARD_FN,
  },
  {
    id: 'socialite',
    title: 'Generous Spirit',
    icon: <TrendingUp className="w-10 h-10 text-emerald-500 drop-shadow-sm" />,
    getDescription: (tier, goal) => `Send coins to your peers ${goal} times (Tier ${tier})`,
    getGoal: (tier) => tier * 10,
    getReward: REWARD_FN,
  },
  {
    id: 'shopaholic',
    title: 'Collector',
    icon: <ShoppingCart className="w-10 h-10 text-pink-500 drop-shadow-sm" />,
    getDescription: (tier, goal) => `Obtain ${goal} items from the Shop (Tier ${tier})`,
    getGoal: (tier) => tier * 5,
    getReward: REWARD_FN,
  },
  {
    id: 'streaker',
    title: 'Unstoppable Momentum',
    icon: <Zap className="w-10 h-10 text-cyan-500 drop-shadow-sm" />,
    getDescription: (tier, goal) => `Build a ${goal}-day login streak (Tier ${tier})`,
    getGoal: (tier) => tier * 10,
    getReward: REWARD_FN,
  },
  {
    id: 'veteran',
    title: 'Platform Veteran',
    icon: <CalendarDays className="w-10 h-10 text-indigo-500 drop-shadow-sm" />,
    getDescription: (tier, goal) => `Reach Level ${goal} on the platform (Tier ${tier})`,
    getGoal: (tier) => tier * 10,
    getReward: REWARD_FN,
  }
];

export const Achievements = () => {
  const { user, setUser } = useAuth();
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'student') return;

    const fetchProgress = async () => {
      try {
        const p = await dbService.getAchievementProgress(user.id);
        setProgress(p);
      } catch (err) {
        console.error("Failed to fetch achievements progress:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [user]);

  const claimAchievement = async (achievementId: string, exactClaimId: string, reward: { coins: number, xp: number }) => {
    if (!user) return;
    setClaiming(exactClaimId);
    
    try {
      await dbService.claimAchievement(user.id, exactClaimId, reward);
      
      const newAchievements = [...(user.achievements || []), exactClaimId];
      setUser({ ...user, achievements: newAchievements, coins: user.coins + Math.round(reward.coins), xp: (user.xp || 0) + reward.xp });
      toast.success(`Leveled up badge! Earned ${Math.round(reward.coins)} coins & ${reward.xp} XP! 🎉`);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to claim achievement. Please try again.");
    } finally {
      setClaiming(null);
    }
  };

  if (!user || user.role !== 'student') return null;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.03 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.98 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: "easeOut" as const } }
  };

  return (
    <div className="space-y-6">
      <div className="p-8 md:p-10 bg-text-primary rounded-[2rem] mb-8 flex items-center justify-between shadow-md relative overflow-hidden border border-border-main">
         <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
           <Award className="w-48 h-48 text-bg-main rotate-12 transform" />
         </div>
         <div className="relative z-10 w-full">
            <h3 className="text-3xl md:text-4xl font-black text-bg-main mb-3 tracking-tight">Infinite Mastery</h3>
            <p className="text-text-secondary/80 font-medium text-lg max-w-xl leading-relaxed">Achievements are endless. Push your limits and level up your badges indefinitely to gain massive experience.</p>
         </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6"
      >
        {INFINITE_ACHIEVEMENTS.map((def) => {
          // Find the current tier by checking user's achievements array.
          // Tiers are 1-indexed.
          const claimedTiers = (user.achievements || [])
             .filter(a => a.startsWith(def.id + '_tier_'))
             .map(a => parseInt(a.replace(def.id + '_tier_', '')))
             .filter(n => !isNaN(n));
             
          const currentTierRaw = claimedTiers.length > 0 ? Math.max(...claimedTiers) + 1 : 1;
          const isMaxedOut = currentTierRaw > 100;
          const currentTier = Math.min(100, currentTierRaw);
          const currentProgress = progress[def.id] || 0;
          
          const goal = def.getGoal(currentTier);
          const reward = def.getReward(currentTier);
          const isComplete = currentProgress >= goal && !isMaxedOut;
          const exactClaimId = `${def.id}_tier_${currentTier}`;

          return (
            <motion.div 
              variants={itemVariants}
              key={def.id} 
              className={`bg-bg-surface p-6 rounded-[2rem] border border-border-main flex flex-col items-start gap-4 transition-all hover:shadow-xl hover:-translate-y-1 relative overflow-hidden ${isMaxedOut ? 'opacity-80 grayscale-[0.2]' : ''}`}
            >
              <div className="absolute top-0 right-0 bg-brand-gold-secondary-hover text-indigo-700 font-black px-4 py-2 rounded-bl-3xl rounded-tr-[2rem] border-b border-l border-brand-gold/20 shadow-sm">
                {isMaxedOut ? 'MAX LEVEL' : `LEVEL ${currentTier}`}
              </div>
              
              <div className="flex gap-4 items-start w-full">
                <div className="w-20 h-20 shrink-0 bg-bg-main rounded-2xl flex items-center justify-center border border-border-main shadow-inner">
                   {def.icon}
                </div>
                <div className="flex-1 pt-1 pr-16">
                  <h4 className="font-black text-xl text-text-primary leading-tight mb-1">{def.title}</h4>
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span className="font-bold text-yellow-600 bg-yellow-50 px-3 py-1 rounded-xl text-sm shadow-sm border border-yellow-100/50">
                      +{reward.coins} 🪙
                    </span>
                    <span className="font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl text-sm shadow-sm border border-indigo-100/50">
                      +{reward.xp} ⚡
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary font-medium leading-relaxed">{def.getDescription(currentTier, goal)}</p>
                </div>
              </div>
              
              <div className="w-full mt-2">
                {isMaxedOut ? (
                  <div className="w-full text-center bg-success-green/20 text-success-green font-black px-6 py-4 rounded-2xl shadow-inner border border-success-green/30 text-lg flex items-center justify-center gap-2">
                    MAX LEVEL REACHED <CheckCircle className="w-6 h-6" />
                  </div>
                ) : isComplete ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => claimAchievement(def.id, exactClaimId, reward)}
                    disabled={claiming === exactClaimId}
                    className="w-full text-center bg-brand-gold-hover hover:bg-indigo-700 text-bg-main font-bold px-6 py-4 rounded-2xl shadow-lg transition-colors disabled:opacity-50 text-lg flex items-center justify-center gap-2"
                  >
                    {claiming === exactClaimId ? 'Claiming...' : 'Level Up & Claim!'} <ArrowUpCircle className="w-5 h-5" />
                  </motion.button>
                ) : (
                  <div className="w-full bg-bg-main p-4 border border-border-main rounded-2xl">
                    <div className="flex justify-between text-xs font-black text-text-secondary uppercase tracking-widest mb-2">
                       <span>Progress</span>
                       <span>{currentProgress >= 1000 ? (currentProgress/1000).toFixed(1) + 'k' : currentProgress} / {goal >= 1000 ? (goal/1000).toFixed(1) + 'k' : goal}</span>
                    </div>
                    <div className="w-full bg-border-main/60 rounded-full h-3 overflow-hidden shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, Math.round((currentProgress / goal) * 100))}%` }}
                        className="bg-brand-gold h-full rounded-full" 
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

