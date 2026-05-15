import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbProvider';
import { ShoppingBag, Zap, Shield, Sparkles, Clock, Check, Palette, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { useSound } from '../hooks/useSound';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/errorHandling';

export const SHOP_ITEMS = [
  {
    id: 'late_pass_1',
    name: 'Late Submission Pass',
    description: 'Bypass the penalty fee for one late mission submission.',
    price: 75,
    currency: 'coins',
    icon: Clock,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    type: 'consumable',
    category: 'Logistics'
  },
  {
    id: 'resubmission_ticket',
    name: 'Resubmission Ticket',
    description: 'Wipe a graded mission and re-attempt for a higher score.',
    price: 200,
    currency: 'coins',
    icon: Sparkles,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    type: 'consumable',
    category: 'Recovery'
  },
  {
    id: 'tax_haven_24h',
    name: 'Tax Haven (24h)',
    description: 'Illegal logic patch! Reduce platform tax by 10% for 24 hours. Vital for high-volatility sessions.',
    price: 45,
    currency: 'diamonds',
    icon: Shield,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    type: 'consumable',
    category: 'High-Stakes'
  },
  {
    id: 'double_down_insurance',
    name: 'Double Down Shield',
    description: 'Guaranteed 75% stake refund if you fail a Double Down mission. Non-negotiable safety net.',
    price: 60,
    currency: 'diamonds',
    icon: Shield,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    type: 'consumable',
    category: 'High-Stakes'
  },
  {
    id: 'ai_extraction_booster',
    name: 'Neural Link Upgrade',
    description: 'Permanent 1.5x XP multiplier for all AI-assessed missions.',
    price: 1500,
    currency: 'coins',
    icon: Zap,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    type: 'cosmetic',
    category: 'Upgrades'
  },
  {
    id: 'streak_freeze',
    name: 'Zero-Day Freeze',
    description: 'Protects your streak automatically for one missed mission.',
    price: 80,
    currency: 'coins',
    icon: Zap,
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    type: 'consumable',
    category: 'Logistics'
  },
  {
    id: 'mystery_gift_box',
    name: 'Lumora Mystery Crate',
    description: 'High-variance rewards. Could contain Diamonds, Gold status, or Elite Badges.',
    price: 250,
    currency: 'coins',
    icon: ShoppingBag,
    color: 'text-fuchsia-500',
    bg: 'bg-fuchsia-500/10',
    type: 'consumable',
    category: 'Hazards'
  },
  {
    id: 'badge_scholar',
    name: 'Elite Scholar Sigil',
    description: 'A premium animated badge for your profile (Non-tradable).',
    price: 450,
    currency: 'coins',
    icon: Check,
    color: 'text-brand-gold',
    bg: 'bg-brand-gold/10',
    type: 'cosmetic',
    category: 'Prestige'
  },
  {
    id: 'theme_gold_limited',
    name: 'Midas Touch Profile',
    description: 'Exclusive Navy & Gold animated profile theme. The ultimate symbol of academic dominance.',
    price: 250,
    currency: 'diamonds',
    icon: Palette,
    color: 'text-brand-gold',
    bg: 'bg-brand-gold/10',
    type: 'cosmetic',
    category: 'Prestige'
  },
  {
    id: 'syndicate_legacy',
    name: 'Syndicate War Chest',
    description: 'Instantly grants 5000 Syndicate XP and a exclusive collective banner for all members.',
    price: 15000,
    currency: 'coins',
    icon: ShoppingBag,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    type: 'consumable',
    category: 'Group'
  }
];

export const Shop = () => {
  const { user, setUser } = useAuth();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const { playSound } = useSound();
  const [activeTab, setActiveTab] = useState<'all' | 'consumables' | 'cosmetics' | 'inventory'>('all');
  const [showMysteryBox, setShowMysteryBox] = useState(false);
  const [mysteryReward, setMysteryReward] = useState<any>(null);

  const handleActivateItem = async (itemId: string) => {
    if (!user) return;
    
    setPurchasing(itemId); // Use this for loading state
    try {
      const inventory = user.inventory || [];
      const itemIdx = inventory.indexOf(itemId);
      if (itemIdx === -1) return;

      const newInventory = [...inventory];
      newInventory.splice(itemIdx, 1);

      const updates: any = {
        inventory: newInventory,
        updatedAt: Date.now()
      };

      if (itemId === 'tax_haven_24h') {
        updates.taxHavenUntil = Date.now() + (24 * 60 * 60 * 1000);
        toast.success("Tax Haven activated for 24 hours!");
      } else if (itemId === 'double_down_insurance') {
        updates.doubleDownShieldUntil = Date.now() + (7 * 24 * 60 * 60 * 1000);
        toast.success("Double Down Shield activated for 7 days!");
      } else if (itemId === 'ai_extraction_booster') {
         updates.xpBoosterUntil = Date.now() + (30 * 24 * 60 * 60 * 1000);
         toast.success("Neural Link Upgrade: 1.5x XP active for 30 days!");
      } else if (itemId === 'badge_scholar') {
         const badges = user.badgeIds || [];
         if (!badges.includes('elite_scholar')) badges.push('elite_scholar');
         updates.badgeIds = badges;
         toast.success("Elite Scholar Sigil added to your profile!");
      } else if (itemId === 'theme_gold_limited') {
         updates.themeId = 'gold_prestige';
         toast.success("Midas Touch Profile theme equipped!");
      } else {
        toast.error("This item must be used during a mission.");
        setPurchasing(null);
        return;
      }

      await dbService.updateUser(user.id, updates);
      setUser(prev => prev ? { ...prev, ...updates } : null);
      playSound('success');
    } catch (err) {
      toast.error("Failed to activate item");
    } finally {
      setPurchasing(null);
    }
  };

  const handleOpenMysteryBox = async () => {
    const roll = Math.random();
    let reward: any = { type: 'coins', amount: 0, label: '', icon: '🪙' };

    if (roll > 0.98) { // 2% Legendary
      reward = { type: 'diamonds', amount: 200, label: '200 Diamonds (KINGSHIP)', icon: '👑', color: 'text-brand-gold' };
    } else if (roll > 0.90) { // 8% Epic
      reward = { type: 'diamonds', amount: 50, label: '50 Diamonds (EPIC)', icon: '💎', color: 'text-cyan-400' };
    } else if (roll > 0.60) { // 30% Rare
      const isDia = Math.random() > 0.7;
      reward = isDia 
        ? { type: 'diamonds', amount: 15, label: '15 Diamonds (RARE)', icon: '💎', color: 'text-cyan-400' }
        : { type: 'coins', amount: 1000, label: '1000 Coins (RARE)', icon: '🪙', color: 'text-emerald-400' };
    } else { // 60% Common
      const amt = Math.floor(Math.random() * 201) + 100; // 100-300
      reward = { type: 'coins', amount: amt, label: `${amt} Coins (Utility)`, icon: '🪙' };
    }

    setMysteryReward(reward);
    setShowMysteryBox(true);

    if (user) {
      const updates: any = { updatedAt: Date.now() };
      if (reward.type === 'coins') updates.coins = (user.coins || 0) + reward.amount;
      if (reward.type === 'diamonds') updates.diamonds = (user.diamonds || 0) + reward.amount;
      
      try {
        await dbService.updateUser(user.id, updates);
        setUser(prev => prev ? { ...prev, ...updates } : null);
      } catch (err) {
        toast.error("Failed to sync mystery reward");
      }
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
        <div className="flex items-center gap-4 bg-[#1A2B48] border border-brand-gold/30 rounded-2xl p-4 shadow-xl shadow-brand-gold/5 min-w-[280px]">
          <div className="w-12 h-12 rounded-xl bg-brand-gold/10 flex items-center justify-center border border-brand-gold/20">
            <span className="text-2xl drop-shadow-sm">🪙</span>
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] mb-1">Asset Portfolio</p>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-white">{user?.coins.toLocaleString() || 0}</span>
                <span className="text-[9px] font-bold text-white/40 uppercase">Coins</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-cyan-400">{(user?.diamonds || 0).toLocaleString()}</span>
                <span className="text-[9px] font-bold text-cyan-400/40 uppercase">DIA</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-1.5 opacity-60">
               <Info className="w-3 h-3 text-brand-gold" />
               <p className="text-[8px] font-bold text-white uppercase tracking-tighter">Automatic 30% Platform Tax applied to all rewards</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-border-main">
        {['all', 'consumables', 'cosmetics', 'inventory'].map((tab) => (
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
          {(activeTab === 'inventory' 
            ? (user?.inventory || []).map((id, index) => {
                const item = SHOP_ITEMS.find(i => i.id === id);
                if (!item) return null;
                return { ...item, instanceId: `${id}-${index}` };
              }).filter(Boolean)
            : filteredItems
          ).map((item: any) => {
            const isOwned = item.type === 'cosmetic' && user?.inventory?.includes(item.id);
            const ownedCount = item.type === 'consumable' ? (user?.inventory?.filter(id => id === item.id).length || 0) : 0;
            const balance = item.currency === 'diamonds' ? (user?.diamonds || 0) : (user?.coins || 0);
            const canAfford = balance >= item.price;
            const isInventoryView = activeTab === 'inventory';
            
            return (
              <motion.div 
                variants={itemVariants}
                key={isInventoryView ? item.instanceId : item.id}
                layout
                className={cn(
                  "bg-bg-surface rounded-3xl border transition-all duration-300 flex flex-col overflow-hidden group",
                  !isInventoryView && isOwned ? "border-border-main opacity-80" : "border-border-main hover:border-brand-gold/40 shadow-sm hover:shadow-2xl hover:shadow-brand-gold/5"
                )}
              >
                {/* Image / Icon Header */}
                <div className="p-8 flex items-center justify-center relative border-b border-border-main/50 overflow-hidden">
                  <div className={cn("absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity", item.bg)}></div>
                  <div className={cn("w-20 h-20 rounded-[2rem] flex items-center justify-center relative z-10 bg-bg-main border border-border-main shadow-inner group-hover:scale-110 transition-transform duration-500")}>
                     <item.icon className={cn("w-10 h-10", item.color)} strokeWidth={1.5} />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-surface/50 to-transparent pointer-events-none" />
                  
                  {!isInventoryView && ownedCount > 0 && (
                    <div className="absolute top-4 right-4 bg-bg-surface/80 backdrop-blur-md border border-border-main text-text-primary font-bold px-2 py-1 rounded-lg text-[10px] shadow-sm z-20 flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3 text-brand-gold" /> {ownedCount}
                    </div>
                  )}
                  {!isInventoryView && isOwned && (
                    <div className="absolute top-4 right-4 bg-brand-gold text-bg-main font-black px-3 py-1 rounded-full text-[9px] uppercase tracking-widest z-20 flex items-center gap-1 shadow-lg shadow-brand-gold/20">
                      <Check className="w-3 h-3" strokeWidth={3} /> Owned
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[9px] font-black tracking-[0.2em] text-brand-gold/70 bg-brand-gold/5 px-2 py-0.5 rounded uppercase">
                      {item.category}
                    </span>
                    {item.price > 100 && item.currency === 'diamonds' && (
                       <span className="text-[9px] font-black bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded uppercase tracking-widest">Limited</span>
                    )}
                  </div>
                  <h3 className="font-black text-xl text-text-primary mb-2 line-clamp-1 group-hover:text-brand-gold transition-colors">{item.name}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed mb-6 flex-1 font-medium">{item.description}</p>
                  
                  {/* Action Button */}
                  {isInventoryView ? (
                    <button 
                      onClick={() => handleActivateItem(item.id)}
                      disabled={purchasing === item.id}
                      className="w-full bg-brand-gold text-bg-main font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      {purchasing === item.id ? "Processing..." : (item.type === 'cosmetic' ? "Equip Item" : "Activate Effect")}
                    </button>
                  ) : isOwned ? (
                    <button disabled className="w-full bg-bg-main border border-border-main text-text-secondary font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest cursor-not-allowed">
                      <Check className="w-4 h-4" /> Item Active
                    </button>
                  ) : (
                    <button 
                      disabled={!canAfford || purchasing === item.id}
                      onClick={() => handlePurchase(item)}
                      className={cn(
                        "w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 text-xs uppercase tracking-[0.15em] transition-all duration-300 shadow-lg",
                        canAfford 
                          ? "bg-brand-gold text-bg-main hover:scale-[1.02] active:scale-[0.98] shadow-brand-gold/20" 
                          : "bg-bg-main text-text-secondary border border-border-main cursor-not-allowed opacity-50"
                      )}
                    >
                      {purchasing === item.id ? (
                         <span className="animate-pulse">Authorizing...</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={cn("text-xl", item.currency === 'diamonds' ? "text-cyan-500" : "text-bg-main")}>
                             {item.currency === 'diamonds' ? '💎' : '🪙'}
                          </span> 
                          <span className="text-lg font-black">{item.price.toLocaleString()}</span>
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
