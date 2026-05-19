import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Coins, ShieldAlert, Gift, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { walletService, userService } from '../../services/dbProvider';
import { toast } from 'react-hot-toast';
import { User, TransactionType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

const AdminActionModal = ({ 
    type, 
    u, 
    onClose, 
    onComplete 
}: { 
    type: 'coins' | 'penalty' | 'diamonds' | 'gift', 
    u: User, 
    onClose: () => void, 
    onComplete: () => void 
}) => {
    const { user: currentAdmin } = useAuth();
    const [amount, setAmount] = useState<string>('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseInt(amount);
        if (isNaN(amt) || amt <= 0) return toast.error("Invalid amount");
        if (!reason && type === 'penalty') return toast.error("Reason required for penalties");

        setLoading(true);
        try {
            if (type === 'coins' || type === 'penalty') {
                const finalAmt = type === 'penalty' ? -amt : amt;
                await walletService.createTransaction({
                    senderId: type === 'penalty' ? u.id : 'SYSTEM',
                    receiverId: type === 'penalty' ? 'SYSTEM' : u.id,
                    amount: amt,
                    type: type === 'penalty' ? 'assignment_penalty' : 'mission_reward',
                    status: 'completed',
                    message: reason || (type === 'penalty' ? "Penalty enforced" : "Manual adjustment"),
                    timestamp: Date.now()
                });
                await userService.updateUser(u.id, { coins: (u.coins || 0) + finalAmt });
            } else if (type === 'diamonds') {
                await userService.updateUser(u.id, { diamonds: (u.diamonds || 0) + amt });
            }

            toast.success("Action logged & processed");
            onComplete();
            onClose();
        } catch (err) {
            toast.error("Operation failed");
        } finally {
            setLoading(false);
        }
    };

    const config = {
        coins: { title: 'Grant Coins', icon: <Coins size={32} />, color: 'text-brand-gold', bg: 'bg-brand-gold/10' },
        penalty: { title: 'Enforce Penalty', icon: <ShieldAlert size={32} />, color: 'text-rose-500', bg: 'bg-rose-500/10' },
        diamonds: { title: 'Gift Diamonds', icon: <Gift size={32} />, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
        gift: { title: 'Special Grant', icon: <Gift size={32} />, color: 'text-brand-gold', bg: 'bg-brand-gold/10' },
    }[type];

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted) return null;

    const modalContent = (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-text-primary/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        >
            <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-bg-surface w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden border border-border-main"
            >
                <div className="p-8 pb-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg", config.bg, config.color)}>
                            {config.icon}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-text-primary tracking-tight">{config.title}</h2>
                            <p className="text-xs text-text-secondary/80 font-bold uppercase tracking-widest leading-none mt-1">To: {u.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-bg-main rounded-full transition-all text-text-secondary/80">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 pt-4 space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-text-secondary/50 uppercase tracking-[0.2em] mb-3 ml-1">Asset Quantity</label>
                        <div className="relative">
                            <input 
                                required
                                type="number"
                                placeholder="0"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full bg-bg-main border-2 border-transparent focus:border-brand-gold/30 rounded-3xl px-6 py-5 text-2xl font-black text-text-primary outline-none transition-all placeholder:text-text-secondary/20"
                            />
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-text-secondary/40 font-black uppercase text-xs tracking-widest">{type}</div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-text-secondary/50 uppercase tracking-[0.2em] mb-3 ml-1">Transaction Note</label>
                        <textarea 
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder={type === 'penalty' ? "Why is this penalty being enforced?" : "Add a reasoning for this grant..."}
                            className="w-full bg-bg-main border-2 border-transparent focus:border-brand-gold/30 rounded-3xl px-6 py-4 text-sm font-bold text-text-primary outline-none transition-all h-24 placeholder:text-text-secondary/20 resize-none"
                        />
                    </div>

                    <div className="pt-2">
                        <button 
                            disabled={loading}
                            type="submit"
                            className={cn(
                                "w-full py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50",
                                type === 'penalty' ? "bg-rose-600 text-white shadow-rose-500/20" : "bg-brand-gold-hover text-bg-main shadow-indigo-100"
                            )}
                        >
                            {loading ? "Processing Block..." : (
                                <>
                                    Log Transaction <Send size={18} />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );

    return createPortal(modalContent, document.body);
};

export default AdminActionModal;
