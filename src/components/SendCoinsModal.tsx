import React, { useState } from 'react';
import { User } from '../types';
import { X, Coins, ShieldAlert } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbProvider';
import { getUserLevelAndXP } from '../lib/utils';
import { motion } from 'motion/react';

export const SendCoinsModal = ({ recipient, onClose }: { recipient: User, onClose: () => void }) => {
  const [amount, setAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  
  if (!user) return null;
  
  const { currentLevel } = getUserLevelAndXP(user);
  const isEligible = user.role !== 'student' || currentLevel >= 3;

  const handleSend = async () => {
    if (!user) return;
    if (!isEligible) {
      toast.error('You must be level 3 or higher to send coins.');
      return;
    }
    if (amount <= 0) {
      toast.error('Amount must be positive');
      return;
    }
    if (user.coins < amount && user.role !== 'admin' && user.role !== 'superadmin') {
      toast.error('Insufficient coins');
      return;
    }
    if (amount > 500 && user.role === 'student') {
      toast.error('You can only send up to 500 coins at a time.');
      return;
    }

    if (!window.confirm(`Are you sure you want to send ${amount} coins to ${recipient.name}?`)) {
        return;
    }

    setLoading(true);
    try {
      await dbService.transferCoins(user.id, recipient.id, amount);

      const taxAmount = Math.floor(amount * 0.3);
      const receiveAmount = amount - taxAmount;

      toast.success(`Successfully sent ${receiveAmount} coins to ${recipient.name}! (${taxAmount} coins collected as tax)`);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to send coins');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-text-primary/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-bg-surface rounded-[32px] w-full max-w-md p-6 md:p-8 overflow-y-auto max-h-[90vh] shadow-2xl relative"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
             <Coins className="text-yellow-500 w-6 h-6" /> Send Coins
          </h2>
          <button onClick={onClose} className="p-2 text-text-secondary/80 hover:bg-border-main rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-text-secondary mb-6">
          You are sending coins to <strong className="text-text-primary">{recipient.name}</strong>.
          {user?.role === 'student' && ` Your current balance is ${user.coins} coins.`}
        </p>
        
        {!isEligible && (
          <div className="bg-brand-gold/10 text-amber-800 p-4 rounded-xl border border-brand-gold/30 mb-6 flex gap-3 text-sm">
            <ShieldAlert className="w-5 h-5 shrink-0 text-amber-500" />
            <div>
              <p className="font-bold mb-1">Anti-cheat Protection</p>
              <p>You must reach <span className="font-bold">Level 3</span> to send coins to other students. Keep completing assignments to level up!</p>
            </div>
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-bold text-text-secondary mb-2">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            disabled={!isEligible}
            className="w-full px-4 py-3 bg-bg-main border border-border-main rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-lg disabled:opacity-50"
            placeholder="0"
            min="1"
            max={user?.role === 'student' ? Math.min(user.coins, 500) : 100000}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-border-main text-text-secondary rounded-xl font-bold hover:bg-border-main transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={loading || amount <= 0 || !isEligible || (user?.role === 'student' && amount > user.coins)}
            className="flex-1 px-4 py-3 bg-brand-gold-hover text-bg-main rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
             {loading ? 'Sending...' : 'Send Coins'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
