import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbProvider';
import { ShoppingBag, Zap, Shield, Sparkles, Clock, Check, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { useSound } from '../hooks/useSound';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/errorHandling';

export const SHOP_ITEMS = [
  {
    id: 'late_pass_1',
    name: 'Late Submission Pass',
    description: 'Bypass the penalty fee for one late submission.',
    price: 50,
    currency: 'coins',
    icon: Clock,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    type: 'consumable',
    category: 'Boosts'
  },
  {
    id: 'resubmission_ticket',
    name: 'Resubmission Ticket',
    description: 'Clear an already graded assignment and try again to get a better score.',
    price: 100,
    currency: 'coins',
    icon: Sparkles,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    type: 'consumable',
    category: 'Boosts'
  },
  {
    id: 'reevaluation_pass',
    name: 'Re-evaluation Pass',
    description: 'Ask the AI to look at your submission again. Good if you think it graded too harshly.',
    price: 40,
    currency: 'coins',
    icon: Zap,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    type: 'consumable',
    category: 'Boosts'
  },
  {
    id: 'vip_bronze',
    name: 'VIP Bronze Status',
    description: 'Lifetime 1.2x XP Boost & Exclusive Bronze Badge. Unlocks early transfer access.',
    price: 250,
    currency: 'diamonds',
    icon: Shield,
    color: 'text-amber-700',
    bg: 'bg-amber-700/10',
    type: 'cosmetic',
    category: 'Premium'
  },
  {
    id: 'ai_extraction_booster',
    name: 'AI Extraction Booster',
    description: 'Permanent 2x XP from AI-assessed assignments.',
    price: 1500,
    currency: 'coins',
    icon: Zap,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    type: 'cosmetic',
    category: 'Premium'
  },
  {
    id: 'streak_freeze',
    name: 'Streak Freeze',
    description: 'Missed a day? Automatically keeps your streak alive for a single missed day.',
    price: 60,
    currency: 'coins',
    icon: Zap,
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    type: 'consumable',
    category: 'Passes'
  },
  {
    id: 'streak_repair',
    name: 'Streak Repair',
    description: 'Lost your streak? Restore your highest streak from the past 7 days.',
    price: 200,
    currency: 'coins',
    icon: Shield,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    type: 'consumable',
    category: 'Passes'
  },
  {
    id: 'streak_shield_7d',
    name: '7-Day Streak Shield',
    description: 'Protect your streak for the next 7 days automatically. Passive protection.',
    price: 15,
    currency: 'diamonds',
    icon: Shield,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    type: 'consumable',
    category: 'Premium'
  },
  {
    id: 'mystery_gift_box',
    name: 'Mystery Gift Box',
    description: 'Open a mystery box! Could contain rare profile items, massive coins, or an XP boost.',
    price: 150,
    currency: 'coins',
    icon: ShoppingBag,
    color: 'text-fuchsia-500',
    bg: 'bg-fuchsia-500/10',
    type: 'consumable',
    category: 'Specials'
  },
  {
    id: 'badge_scholar',
    name: 'Scholar Badge',
    description: 'Display a shiny scholar badge on your profile.',
    price: 150,
    currency: 'coins',
    icon: Check,
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
    type: 'cosmetic',
    category: 'Badges'
  }
];

export const Shop = () => {
  const { user, setUser } = useAuth();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const { playSound } = useSound();
  const [activeTab, setActiveTab] = useState<'all' | 'consumables' | 'cosmetics'>('all');
  const [showMysteryBox, setShowMysteryBox] = useState(false);
  const [mysteryReward, setMysteryReward] = useState<any>(null);

  const handleOpenMysteryBox = async () => {
    const roll = Math.random();
    let reward: any = { type: 'coins', amount: 0, label: '', icon: '🪙' };

    if (roll > 0.95) { // 5% Legendary
      reward = { type: 'diamonds', amount: 50, label: '50 Diamonds (LEGENDARY)', icon: '💎', color: 'text-cyan-400' };
    } else if (roll > 0.90) { // 5% Epic
      reward = { type: 'coins', amount: 500, label: '500 Coins (EPIC)', icon: '🪙', color: 'text-brand-gold' };
    } else if (roll > 0.70) { // 20% Rare
      const isDia = Math.random() > 0.5;
      reward = isDia 
        ? { type: 'diamonds', amount: 10, label: '10 Diamonds (RARE)', icon: '💎', color: 'text-cyan-400' }
        : { type: 'coins', amount: 200, label: '200 Coins (RARE)', icon: '🪙', color: 'text-emerald-400' };
    } else { // 70% Common
      const amt = Math.floor(Math.random() * 31) + 20; // 20-50
      reward = { type: 'coins', amount: amt, label: `${amt} Coins (Common)`, icon: '🪙' };
    }

    setMysteryReward(reward);
    setShowMysteryBox(true);

    if (user) {
      const updates: any = { updatedAt: Date.now() };
      if (reward.type === 'coins') updates.coins = (user.coins || 0) + reward.amount;
      if (reward.type === 'diamonds') updates.diamonds = (user.diamonds || 0) + reward.amount;
      
      await dbService.updateUser(user.id, updates);
      setUser(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handlePurchase = async (item: typeof SHOP_ITEMS[0]) => {
    if (!user) return;
    
    const balance = item.currency === 'diamonds' ? (user.diamonds || 0) : user.coins;
    const currencyName = item.currency === 'diamonds' ? 'diamonds' : 'coins';

    if (balance < item.price) {
      toast.error(`Not enough ${currencyName}!`);
      return;
    }

    if (item.type === 'cosmetic' && user.inventory?.includes(item.id)) {
      toast.error('You already own this item!');
      return;
    }

    if (!window.confirm(`Are you sure you want to purchase ${item.name} for ${item.price} ${currencyName}?`)) {
      return;
    }

    setPurchasing(item.id);
    try {
      // update inventory
      const newInventory = user.inventory ? [...user.inventory] : [];
      if (item.type === 'cosmetic' && newInventory.includes(item.id)) {
        // Double check
      } else {
        newInventory.push(item.id);
      }

      const userUpdate: any = {
        inventory: newInventory,
        updatedAt: Date.now()
      };

      if (item.currency === 'diamonds') {
        userUpdate.diamonds = (user.diamonds || 0) - item.price;
      } else {
        userUpdate.coins = user.coins - item.price;
      }

      await dbService.updateUser(user.id, userUpdate);

      const txId = await dbService.createTransaction({
        senderId: user.id,
        receiverId: 'SYSTEM',
        amount: item.price,
        type: 'shop_purchase',
        status: 'completed',
        message: `Purchased ${item.name}`,
        itemId: item.id,
        currency: item.currency as any,
        timestamp: Date.now()
      });

      setUser((prev: any) => prev ? { 
        ...prev, 
        coins: item.currency === 'diamonds' ? prev.coins : prev.coins - item.price,
        diamonds: item.currency === 'diamonds' ? (prev.diamonds || 0) - item.price : (prev.diamonds || 0),
        inventory: newInventory 
      } : null);
      
      playSound('coin');
      
      if (item.id === 'mystery_gift_box') {
        await handleOpenMysteryBox();
      } else {
        toast.success(`Successfully purchased ${item.name}!`);
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'shop_purchase');
    } finally {
      setPurchasing(null);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  const filteredItems = SHOP_ITEMS.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'consumables') return item.type === 'consumable';
    if (activeTab === 'cosmetics') return item.type === 'cosmetic';
    return true;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-6xl mx-auto px-4 py-8 space-y-10"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-text-primary tracking-tight">E-Shop</h1>
          <p className="text-text-secondary mt-2 max-w-2xl text-lg">
            Exchange your hard-earned coins for powerful boosts, exclusive cosmetics, and theme unlocks.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-bg-surface border border-border-main rounded-2xl p-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-brand-gold/10 flex items-center justify-center">
            <span className="text-2xl drop-shadow-sm">🪙</span>
          </div>
          <div>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Your Balance</p>
                    <p className="text-2xl font-black text-text-primary">
                      {user?.coins || 0} <span className="text-xs text-text-secondary opacity-60 ml-1">Coins</span>
                      <span className="mx-2 opacity-10">|</span>
                      {user?.diamonds || 0} <span className="text-xs text-text-secondary opacity-60 ml-1 font-mono">DIA</span>
                    </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-border-main">
        {['all', 'consumables', 'cosmetics'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={cn(
              "px-5 py-2.5 rounded-t-xl font-semibold text-sm transition-all duration-200 capitalize whitespace-nowrap",
              activeTab === tab 
                ? "bg-bg-surface text-brand-gold border-t border-l border-r border-border-main shadow-[0_4px_0_0_var(--bg-main)] -mb-[1px]" 
                : "text-text-secondary hover:text-text-primary hover:bg-bg-surface/50 border-t border-l border-r border-transparent"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Shop Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        key={activeTab} // re-trigger animation on tab change
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <AnimatePresence>
          {filteredItems.map((item) => {
            const isOwned = item.type === 'cosmetic' && user?.inventory?.includes(item.id);
            const ownedCount = item.type === 'consumable' ? (user?.inventory?.filter(id => id === item.id).length || 0) : 0;
            const balance = item.currency === 'diamonds' ? (user?.diamonds || 0) : (user?.coins || 0);
            const canAfford = balance >= item.price;
            
            return (
              <motion.div 
                variants={itemVariants}
                key={item.id}
                layout
                className={cn(
                  "bg-bg-surface rounded-3xl border transition-all duration-300 flex flex-col overflow-hidden",
                  isOwned ? "border-border-main opacity-80" : "border-border-main hover:border-brand-gold/20 shadow-sm hover:shadow-xl"
                )}
              >
                {/* Image / Icon Header */}
                <div className="p-6 flex items-center justify-center relative border-b border-border-main/50 overflow-hidden">
                  <div className={cn("absolute inset-0 opacity-20", item.bg)}></div>
                  <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center relative z-10 bg-bg-main border border-border-main shadow-inner")}>
                     <item.icon className={cn("w-10 h-10", item.color)} strokeWidth={1.5} />
                  </div>
                  {ownedCount > 0 && (
                    <div className="absolute top-4 right-4 bg-bg-surface border border-border-main text-text-primary font-bold px-2 py-1 rounded-lg text-xs shadow-sm z-20 flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3 text-brand-gold" /> {ownedCount}
                    </div>
                  )}
                  {isOwned && (
                    <div className="absolute top-4 right-4 bg-brand-gold/10 border border-brand-gold/30 text-brand-gold font-bold px-2 py-1 rounded-lg text-xs z-20 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Owned
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold tracking-widest text-text-secondary uppercase">
                      {item.category}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-text-primary mb-2 line-clamp-1">{item.name}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed mb-6 flex-1">{item.description}</p>
                  
                  {/* Action Button */}
                  {isOwned ? (
                    <button disabled className="w-full bg-bg-main border border-border-main text-text-secondary font-semibold py-3 rounded-xl flex items-center justify-center gap-2 text-sm cursor-not-allowed">
                      <Check className="w-4 h-4" /> Already Owned
                    </button>
                  ) : (
                    <button 
                      disabled={!canAfford || purchasing === item.id}
                      onClick={() => handlePurchase(item)}
                      className={cn(
                        "w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all duration-200",
                        canAfford 
                          ? "bg-text-primary text-bg-main hover:bg-text-secondary active:scale-[0.98]" 
                          : "bg-bg-main text-text-secondary border border-border-main cursor-not-allowed"
                      )}
                    >
                      {purchasing === item.id ? (
                         <span className="animate-pulse">Processing...</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className={cn("text-lg", item.currency === 'diamonds' ? "text-cyan-500" : "text-brand-gold")}>
                             {item.currency === 'diamonds' ? '💎' : '🪙'}
                          </span> 
                          <span className="text-lg">{item.price}</span>
                        </div>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Mystery Box Reveal Modal */}
      <AnimatePresence>
        {showMysteryBox && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-main/90 backdrop-blur-xl"
          >
             <motion.div
               initial={{ scale: 0.8, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               exit={{ scale: 0.8, y: 20 }}
               className="bg-[#1A2B48] border border-brand-gold/30 rounded-[3rem] p-12 text-center max-w-sm w-full relative shadow-2xl shadow-brand-gold/10"
             >
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-32 h-32 bg-brand-gold/20 rounded-full blur-[60px]" />
                
                <div className="relative mb-8">
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-32 h-32 bg-gradient-to-br from-brand-gold to-amber-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl"
                  >
                    <ShoppingBag size={64} className="text-bg-main" strokeWidth={1} />
                  </motion.div>
                </div>

                <h2 className="text-3xl font-black text-white mb-2">Mystery Reward!</h2>
                <p className="text-white/60 font-medium mb-8">The box contained...</p>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 mb-10 group overflow-hidden relative">
                   <div className="absolute inset-0 bg-brand-gold/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                   <div className={cn("text-6xl mb-4 animate-bounce", mysteryReward?.color)}>
                      {mysteryReward?.icon}
                   </div>
                   <div className={cn("text-xl font-black uppercase tracking-tighter", mysteryReward?.color || "text-white")}>
                      {mysteryReward?.label}
                   </div>
                </div>

                <button 
                  onClick={() => setShowMysteryBox(false)}
                  className="w-full bg-brand-gold text-bg-main py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-brand-gold/20"
                >
                  Claim & Continue
                </button>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
