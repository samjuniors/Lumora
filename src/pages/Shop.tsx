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
    icon: Zap,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    type: 'consumable',
    category: 'Boosts'
  },
  {
    id: 'streak_freeze',
    name: 'Streak Freeze',
    description: 'Missed a day? Automatically keeps your streak alive for a single missed day.',
    price: 60,
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
    icon: Shield,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    type: 'consumable',
    category: 'Passes'
  },
  {
    id: 'mystery_gift_box',
    name: 'Mystery Gift Box',
    description: 'Open a mystery box! Could contain rare profile items, massive coins, or an XP boost.',
    price: 150,
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

  const handlePurchase = async (item: typeof SHOP_ITEMS[0]) => {
    if (!user) return;
    if (user.coins < item.price) {
      toast.error('Not enough coins!');
      return;
    }

    if (item.type === 'cosmetic' && user.inventory?.includes(item.id)) {
      toast.error('You already own this item!');
      return;
    }

    if (!window.confirm(`Are you sure you want to purchase ${item.name} for ${item.price} coins?`)) {
      return;
    }

    setPurchasing(item.id);
    try {
      // deduplicate coins and update inventory
      const newInventory = user.inventory ? [...user.inventory] : [];
      if (item.type === 'cosmetic' && newInventory.includes(item.id)) {
        // Double check
      } else {
        newInventory.push(item.id);
      }

      await dbService.updateUser(user.id, {
        coins: user.coins - item.price,
        inventory: newInventory,
        updatedAt: Date.now()
      });

      const txId = await dbService.createTransaction({
        senderId: user.id,
        receiverId: 'SYSTEM',
        amount: item.price,
        type: 'shop_purchase',
        status: 'completed',
        message: `Purchased ${item.name}`,
        itemId: item.id,
        timestamp: Date.now()
      });

      setUser((prev: any) => prev ? { ...prev, coins: prev.coins - item.price, inventory: newInventory } : null);
      
      playSound('coin');
      toast.success(`Successfully purchased ${item.name}!`);
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
            <p className="text-2xl font-black text-text-primary">{user?.coins || 0}</p>
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
            const canAfford = (user?.coins || 0) >= item.price;
            
            return (
              <motion.div 
                variants={itemVariants}
                key={item.id}
                layout
                className={cn(
                  "bg-bg-surface rounded-2xl border transition-all duration-300 flex flex-col overflow-hidden",
                  isOwned ? "border-border-main opacity-80" : "border-border-main hover:border-brand-gold/50 shadow-sm hover:shadow-md"
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
                        <>
                          <span className="text-brand-gold">🪙</span> {item.price}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};
