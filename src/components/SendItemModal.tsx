import React, { useState } from 'react';
import { User } from '../types';
import { X, Package, Search, Gift, ShieldAlert } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbProvider';
import { SHOP_ITEMS } from '../pages/Shop';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface SendItemModalProps {
  itemId: string;
  onClose: () => void;
}

export const SendItemModal: React.FC<SendItemModalProps> = ({ itemId, onClose }) => {
  const { user, setUser } = useAuth();
  const [recipientId, setRecipientId] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [recipientUser, setRecipientUser] = useState<User | null>(null);
  
  const shopItem = SHOP_ITEMS.find(i => i.id === itemId);

  const handleSearch = async () => {
    if (!recipientId.trim()) return;
    if (recipientId === user?.id) {
      toast.error("You can't send items to yourself!");
      return;
    }

    setSearching(true);
    try {
      const foundUser = await dbService.getUser(recipientId);
      
      if (foundUser) {
        setRecipientUser(foundUser);
        toast.success('User found!');
      } else {
        setRecipientUser(null);
        toast.error('User not found. Check the ID and try again.');
      }
    } catch (err) {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleSend = async () => {
    if (!user || !recipientUser || !shopItem) return;

    if (!window.confirm(`Are you sure you want to send "${shopItem.name}" to ${recipientUser.name}?`)) {
      return;
    }

    setLoading(true);
    try {
      await dbService.giftItem(user.id, recipientUser.id, itemId);

      // Update local state
      const newInventory = [...(user.inventory || [])];
      const index = newInventory.indexOf(itemId);
      if (index > -1) newInventory.splice(index, 1);
      setUser({ ...user, inventory: newInventory });

      toast.success(`Successfully sent ${shopItem.name} to ${recipientUser.name}!`, { icon: '🎁' });
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error('Gift failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user || !shopItem) return null;

  return (
    <motion.div 
      key="send-item-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-text-primary/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-bg-surface rounded-[2.5rem] w-full max-w-md p-8 overflow-hidden shadow-2xl relative border border-border-main"
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-text-primary flex items-center gap-3">
             <Gift className="text-rose-500 w-7 h-7" /> Gift Item
          </h2>
          <button onClick={onClose} className="p-2 text-text-secondary/80 hover:bg-border-main rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item Preview */}
        <div className="bg-bg-main rounded-3xl p-4 mb-8 flex items-center gap-4 border border-border-main">
           <div className={cn(
             "w-16 h-16 rounded-2xl flex items-center justify-center text-bg-main shrink-0 shadow-lg",
             shopItem.color.includes('from') ? `bg-gradient-to-br ${shopItem.color}` : 'bg-brand-gold'
           )}>
             <shopItem.icon className="w-8 h-8" />
           </div>
           <div>
             <p className="text-xs font-black text-text-secondary/80 uppercase tracking-widest mb-1">Gifting Item</p>
             <p className="font-black text-text-primary text-lg leading-tight">{shopItem.name}</p>
           </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-black text-text-secondary/80 uppercase tracking-widest mb-3">Recipient User ID</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={recipientId}
                onChange={e => setRecipientId(e.target.value)}
                className="flex-1 px-5 py-4 bg-bg-main border border-border-main rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-text-primary"
                placeholder="Paste ID here..."
              />
              <button 
                onClick={handleSearch}
                disabled={searching || !recipientId.trim()}
                className="bg-bg-surface border border-border-main text-brand-gold w-14 rounded-2xl flex items-center justify-center hover:bg-brand-gold-secondary-hover transition-colors disabled:opacity-50 shadow-sm"
              >
                <Search className={cn("w-5 h-5", searching && "animate-spin")} />
              </button>
            </div>
            <p className="mt-2 text-[10px] font-bold text-text-secondary/80 uppercase tracking-wider">Ask your friend for their profile ID</p>
          </div>

          <AnimatePresence>
            {recipientUser && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-5 bg-brand-gold-secondary-hover border border-brand-gold/20 rounded-3xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-bg-surface border-2 border-brand-gold/30 flex items-center justify-center text-2xl shadow-sm">
                    {recipientUser.avatar || recipientUser.name[0]}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Found Recipient</p>
                    <p className="font-black text-text-primary">{recipientUser.name}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-4 pt-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-4 bg-border-main text-text-secondary rounded-2xl font-black text-sm hover:bg-border-main transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={loading || !recipientUser}
              className="flex-1 px-6 py-4 bg-text-primary text-bg-main rounded-2xl font-black text-sm hover:bg-text-secondary/80 hover:text-bg-main transition-all shadow-xl shadow-black/10 disabled:opacity-30 disabled:shadow-none flex items-center justify-center gap-2"
            >
               {loading ? 'Sending Gift...' : 'Confirm Gift'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
