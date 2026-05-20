import { Card, Button, SectionHeader } from '../components/CommonUI';
import { 
  Clock, 
  Sparkles, 
  Shield, 
  Zap, 
  ShoppingBag, 
  Check, 
  Palette 
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSound } from '../hooks/useSound';
import { motion, AnimatePresence } from 'motion/react';
import { userService, walletService } from '../services/dbProvider';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/errorHandling';
import { useConfirm } from '../context/ConfirmContext';

export const SHOP_ITEMS = [
  {
    id: 'late_pass_1',
    name: 'Late Submission Pass',
    description: 'Bypass the penalty fee for one late mission submission. Temporary logic override.',
    price: 75,
    currency: 'coins',
    icon: Clock,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    type: 'consumable',
    category: 'Logistics'
  },
  {
    id: 'resubmission_ticket',
    name: 'Resubmission Ticket',
    description: 'Wipe a graded mission and re-attempt for a higher score. Total neural recalibration.',
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
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
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
    color: 'text-brand-gold',
    bg: 'bg-brand-gold/10',
    type: 'consumable',
    category: 'High-Stakes'
  },
  {
    id: 'ai_extraction_booster',
    name: 'Neural Link Upgrade',
    description: 'Permanent 1.5x XP multiplier for all AI-assessed missions. Direct synaptic injection.',
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
    description: 'Protects your streak automatically for one missed mission. Temporal suspension.',
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
    description: 'High-variance rewards. Could contain Diamonds, Gold status, or Elite Badges. Risk is required.',
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
    description: 'A premium animated badge for your profile. Identification for high-ranking operatives.',
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
    description: 'Exclusive Navy & Gold animated profile theme. The ultimate symbol of dominance.',
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
    description: 'Instantly grants 5000 Syndicate XP and exclusive collective banner for all members.',
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
  const { confirm } = useConfirm();
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
        toast.success("Protocol Delta: Tax Haven synchronized for 24h cycle.", { icon: "🏛️" });
      } else if (itemId === 'double_down_insurance') {
        updates.doubleDownShieldUntil = Date.now() + (7 * 24 * 60 * 60 * 1000);
        toast.success("Defense System: Double Down shield enabled.", { icon: "🛡️" });
      } else if (itemId === 'ai_extraction_booster') {
         updates.xpBoosterUntil = Date.now() + (30 * 24 * 60 * 60 * 1000);
         toast.success("Synapse Upgrade: 1.5x efficiency active.", { icon: "🧠" });
      } else if (itemId === 'badge_scholar') {
         const badges = user.badgeIds || [];
         if (!badges.includes('elite_scholar')) badges.push('elite_scholar');
         updates.badgeIds = badges;
         toast.success("ID Updated: Elite Scholar Sigil verified.", { icon: "📌" });
      } else if (itemId === 'theme_gold_limited') {
         updates.themeId = 'gold_prestige';
         toast.success("System Aesthetic: Prestige Theme applied.", { icon: "✨" });
      } else {
        toast.error("This asset requires a specific mission context.");
        setPurchasing(null);
        return;
      }

      await userService.updateUser(user.id, updates);
      setUser(prev => prev ? { ...prev, ...updates } : null);
      if (typeof playSound === 'function') playSound('success');
    } catch (err) {
      toast.error("Network synchronization failed.");
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
        await userService.updateUser(user.id, updates);
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

    const confirmed = await confirm({
      title: "Confirm Purchase",
      message: `Confirm purchase of ${item.name} for ${item.price} ${currencyName}?`,
      type: "info"
    });
    if (!confirmed) {
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

      await userService.updateUser(user.id, userUpdate);

      const txId = await walletService.createTransaction({
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
      className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-16 space-y-8 md:space-y-16"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-10">
        <div className="space-y-2 md:space-y-4">
           <div className="flex items-center gap-3">
             <span className="h-[1px] w-8 md:w-12 bg-brand-gold/30"></span>
             <span className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em] md:tracking-[0.4em]">Asset Procurement</span>
           </div>
           <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter text-text-primary leading-tight uppercase">
              Strategic <span className="text-brand-gold text-glow-gold">Exchange</span>
           </h1>
           <p className="text-text-secondary font-medium text-sm md:text-lg max-w-2xl border-l-2 border-brand-gold/20 pl-4 py-1.5 italic opacity-80 leading-relaxed">
              Acquire elite tactical assets, neural link upgrades, and prestige symbols. Every acquisition has systemic consequences.
           </p>
        </div>
        
        <Card variant="flat" className="w-full md:w-auto p-6 md:p-10 border-white/5 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] min-w-[320px] md:min-w-[360px] relative overflow-hidden bg-white/[0.01] rounded-[1.5rem] md:rounded-[2rem]">
          <div className="absolute top-0 right-0 p-6 text-brand-gold opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
            <ShoppingBag size={120} />
          </div>
          
          <div className="relative z-10 space-y-6">
            <p className="text-[10px] font-black text-brand-gold/60 uppercase tracking-[0.4em] italic">Operational Liquidity</p>
            <div className="flex items-center gap-12">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] mb-1">Standard Credits</span>
                <span className="text-4xl font-black text-text-primary tracking-tighter tabular-nums">{user?.coins.toLocaleString() || 0}</span>
              </div>
              <div className="w-px h-12 bg-white/5" />
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-cyan-400 uppercase tracking-[0.2em] mb-1">Diamond Allocation</span>
                <span className="text-4xl font-black text-cyan-400 tracking-tighter tabular-nums">{(user?.diamonds || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-10 border-b border-white/[0.03]">
        {['all', 'consumables', 'cosmetics', 'inventory'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={cn(
              "pb-6 text-[11px] font-black uppercase tracking-[0.4em] transition-all relative",
              activeTab === tab 
                ? "text-brand-gold" 
                : "text-text-muted hover:text-text-primary"
            )}
          >
            {tab}
            {activeTab === tab && (
                <motion.div 
                    layoutId="activeTabShop"
                    className="absolute bottom-0 left-0 right-0 h-[3px] bg-brand-gold shadow-[0_0_15px_rgba(251,191,36,0.6)]"
                />
            )}
          </button>
        ))}
      </div>

      {/* Shop Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        key={activeTab}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        <AnimatePresence mode="popLayout">
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
                className={cn(
                  "group transition-all duration-300",
                  !isInventoryView && isOwned && "opacity-40"
                )}
              >
                <Card variant="flat" className="h-full flex flex-col overflow-hidden border-white/[0.03] group-hover:border-white/10 group-hover:bg-white/[0.04]">
                    {/* Visual Header */}
                    <div className="h-44 flex items-center justify-center relative bg-black/20 border-b border-white/[0.03]">
                       <div className={cn("absolute inset-0 opacity-10", item.bg)} />
                       <div className={cn("w-20 h-20 rounded-[2rem] flex items-center justify-center bg-bg-main border border-white/5 shadow-2xl group-hover:scale-110 transition-transform duration-500 relative z-10")}>
                          <item.icon className={cn("w-10 h-10", item.color)} strokeWidth={1} />
                       </div>
                       
                       {!isInventoryView && isOwned && (
                         <div className="absolute top-4 right-4 bg-brand-gold text-bg-main font-black px-3 py-1 rounded-md text-[9px] uppercase tracking-widest z-20 shadow-xl shadow-brand-gold/20">
                           Acquired
                         </div>
                       )}
                       {!isInventoryView && ownedCount > 0 && (
                          <div className="absolute top-4 left-4 bg-white/5 text-text-muted font-black px-3 py-1 rounded-md text-[9px] uppercase tracking-widest z-20 border border-white/5">
                            Stock x{ownedCount}
                          </div>
                       )}
                    </div>

                    {/* Content Area */}
                    <div className="p-6 flex-1 flex flex-col space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black text-brand-gold uppercase tracking-[0.2em] opacity-50 bg-brand-gold/5 px-2 py-1 rounded border border-brand-gold/10">
                          {item.category}
                        </span>
                      </div>
                      <div className="min-w-0">
                         <h3 className="font-black text-lg text-text-primary tracking-tight group-hover:text-brand-gold transition-colors">{item.name}</h3>
                         <p className="text-text-muted text-[11px] leading-relaxed mt-2 font-medium italic opacity-70 group-hover:opacity-100 transition-opacity">{item.description}</p>
                      </div>
                      
                      {/* Action */}
                      <div className="mt-auto pt-4">
                        {isInventoryView ? (
                          <Button 
                            variant="primary" 
                            size="md"
                            fullWidth
                            onClick={() => handleActivateItem(item.id)}
                            disabled={purchasing === item.id}
                            className="font-black text-[10px] uppercase tracking-[0.2em]"
                          >
                            {purchasing === item.id ? "Processing..." : (item.type === 'cosmetic' ? "Equip Asset" : "Activate Logic")}
                          </Button>
                        ) : isOwned ? (
                          <div className="w-full py-3.5 rounded-xl border border-white/[0.03] flex items-center justify-center gap-2 text-[10px] text-text-muted font-black uppercase tracking-[0.2em] opacity-40">
                            <Check size={16} /> Asset Active
                          </div>
                        ) : (
                          <Button 
                            variant={canAfford ? "gold" : "primary"}
                            size="lg"
                            fullWidth
                            disabled={!canAfford || purchasing === item.id}
                            onClick={() => handlePurchase(item)}
                            className={cn(
                              "font-black py-4 transition-all duration-500",
                              !canAfford && "opacity-30 grayscale cursor-not-allowed border-white/5"
                            )}
                          >
                            {purchasing === item.id ? (
                               <span className="animate-pulse">Authorizing...</span>
                            ) : (
                              <div className="flex items-center gap-3">
                                <span className="text-sm opacity-80">{item.currency === 'diamonds' ? '💎' : '🪙'}</span> 
                                <span className="text-xl font-black tracking-tighter tabular-nums">{item.price.toLocaleString()}</span>
                              </div>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                </Card>
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-main/90 backdrop-blur-2xl"
          >
             <motion.div
               initial={{ scale: 0.8, y: 30 }}
               animate={{ scale: 1, y: 0 }}
               exit={{ scale: 0.8, y: 30 }}
               className="bg-bg-surface border border-brand-gold/30 rounded-[4rem] p-12 md:p-16 text-center max-w-md w-full relative shadow-[0_0_100px_rgba(251,191,36,0.15)]"
             >
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-brand-gold/30 rounded-full blur-[80px]" />
                
                <div className="relative mb-12">
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="w-40 h-40 bg-gradient-to-br from-brand-gold to-amber-600 rounded-[3.5rem] flex items-center justify-center mx-auto shadow-2xl relative"
                  >
                    <div className="absolute inset-2 border border-white/20 rounded-[2.8rem]" />
                    <ShoppingBag size={80} className="text-bg-main" strokeWidth={1} />
                  </motion.div>
                </div>

                <div className="space-y-4 mb-10">
                   <h2 className="text-4xl font-black text-text-primary tracking-tighter">Inventory Recovered!</h2>
                   <p className="text-text-muted font-bold italic uppercase tracking-widest text-xs">The crypt box contained the following tactical asset:</p>
                </div>

                <div className="bg-black/40 border border-white/5 rounded-[2.5rem] p-10 mb-10 group overflow-hidden relative shadow-inner">
                   <div className="absolute inset-0 bg-brand-gold/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                   <div className={cn("text-7xl mb-6 drop-shadow-[0_0_30px_rgba(251,191,36,0.3)] animate-bounce", mysteryReward?.color)}>
                      {mysteryReward?.icon}
                   </div>
                   <div className={cn("text-2xl font-black uppercase tracking-tighter", mysteryReward?.color || "text-text-primary")}>
                      {mysteryReward?.label}
                   </div>
                </div>

                <Button 
                  variant="gold"
                  size="xl"
                  fullWidth
                  onClick={() => setShowMysteryBox(false)}
                  className="py-6 font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-brand-gold/20"
                >
                  Claim Strategic Asset
                </Button>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
