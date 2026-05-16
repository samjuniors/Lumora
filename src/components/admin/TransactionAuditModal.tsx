import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Wallet, Clock, ArrowUpRight, Gift, Coins, Edit2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/dbProvider';
import { User, Transaction } from '../../types';
import { cn } from '../../lib/utils';

export const TransactionAuditModal = ({ u, onClose }: { u: User, onClose: () => void }) => {
    const { user: currentAdmin } = useAuth();
    const [history, setHistory] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingTx, setEditingTx] = useState<Transaction | null>(null);
    const [editAmount, setEditAmount] = useState<string>('');

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const txs = await dbService.getUserTransactions(u.id);
                setHistory(txs);
            } catch (err: any) {
                console.error(err);
                toast.error("Failed to load audit trail");
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [u.id]);

    const handleRevoke = async (tx: Transaction) => {
        if (!window.confirm("Are you sure you want to revoke this transaction? This will reverse the coin balances and mark the transaction as revoked. (Audit trail is preserved)")) return;
        
        try {
            await dbService.revokeTransaction(tx.id, currentAdmin?.id || 'admin');
            setHistory(prev => prev.map(t => t.id === tx.id ? { ...t, status: 'revoked' } : t));
            toast.success("Transaction revoked and balances reversed.");
        } catch (err) {
            console.error(err);
            toast.error("Failed to revoke transaction.");
        }
    };

    return (
        <div className="fixed inset-0 bg-text-primary/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-bg-surface rounded-[40px] shadow-2xl p-0 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-border-main"
            >
                <div className="p-6 md:p-8 border-b border-border-main flex justify-between items-center bg-bg-main/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-gold text-bg-main flex items-center justify-center font-black text-xl shadow-lg shadow-brand-gold/10">
                            {u.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-black text-text-primary tracking-tight">Economy Audit</h2>
                            <p className="text-[10px] md:text-xs text-text-secondary/80 font-bold uppercase tracking-widest mt-0.5">History for {u.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-bg-surface rounded-2xl transition-all text-text-secondary/80 hover:text-text-primary border border-transparent hover:border-border-main shadow-sm group">
                        <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 no-scrollbar bg-bg-main/30">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center gap-4">
                            <Loader2 className="w-10 h-10 text-brand-gold animate-spin" />
                            <span className="text-sm font-bold text-text-secondary/80 uppercase tracking-widest">Indexing Transactions...</span>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="py-20 text-center">
                            <Wallet className="w-12 h-12 text-border-main mx-auto mb-4" />
                            <p className="text-text-secondary/80 font-bold">No transactions found for this user.</p>
                        </div>
                    ) : (
                        history.map((tx) => {
                            const isLoss = tx.senderId === u.id;
                            const isRevoked = tx.status === 'revoked';
                            
                            return (
                                <div 
                                    key={tx.id} 
                                    className={cn(
                                        "group p-4 md:p-5 rounded-3xl border transition-all flex flex-col gap-3",
                                        isRevoked ? "bg-border-main/20 border-border-main opacity-60" : "bg-bg-surface border-border-main hover:border-brand-gold/20 hover:shadow-md"
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                                                isRevoked ? "bg-border-main text-text-secondary/80" : (isLoss ? "bg-rose-500/10 text-rose-500" : "bg-success-green/10 text-emerald-500")
                                            )}>
                                                {isRevoked ? <Clock className="w-5 h-5" /> : (isLoss ? <ArrowUpRight className="w-5 h-5" /> : <Gift className="w-5 h-5" />)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-sm font-black text-text-primary capitalize tracking-tight">
                                                        {tx.type.replace(/_/g, ' ')}
                                                    </div>
                                                    {isRevoked && (
                                                        <span className="px-2 py-0.5 bg-rose-500/20 text-rose-600 text-[8px] font-black uppercase rounded-full">Revoked</span>
                                                    )}
                                                </div>
                                                {tx.message && (
                                                    <div className="text-[11px] font-medium text-text-secondary mt-0.5 line-clamp-1 italic">
                                                        "{tx.message}"
                                                    </div>
                                                )}
                                                <div className="text-[10px] text-text-secondary/80 font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                                                    {format(tx.timestamp, 'MMM dd, p')}
                                                    <span className="w-0.5 h-0.5 bg-border-main rounded-full"></span>
                                                    ID: {tx.id.substring(0, 8)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "text-lg font-black tracking-tighter flex items-center gap-1",
                                            isRevoked ? "text-text-secondary/80" : (isLoss ? "text-rose-500" : "text-emerald-500")
                                        )}>
                                            {!isRevoked && (isLoss ? '-' : '+')}
                                            <Coins className="w-4 h-4 fill-current" />
                                            {tx.amount}
                                        </div>
                                    </div>

                                    {(tx.message || tx.utr) && (
                                        <div className="px-1 py-1 flex flex-col gap-1">
                                            {tx.message && <div className="text-xs text-text-secondary font-medium italic underline decoration-brand-gold/10 underline-offset-4">"{tx.message}"</div>}
                                            {tx.utr && <div className="text-[9px] text-brand-gold/60 font-black uppercase tracking-widest">Ref: {tx.utr}</div>}
                                        </div>
                                    )}

                                    {currentAdmin?.role === 'superadmin' && !isRevoked && (
                                        <div className="mt-2 pt-3 border-t border-border-main flex flex-col gap-2">
                                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                                <button 
                                                    onClick={() => handleRevoke(tx)}
                                                    className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 font-black text-[10px] rounded-xl transition-all uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm"
                                                >
                                                    <X className="w-3.5 h-3.5" /> Revoke
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        if (editingTx?.id === tx.id) {
                                                            setEditingTx(null);
                                                            setEditAmount('');
                                                        } else {
                                                            setEditingTx(tx);
                                                            setEditAmount(tx.amount.toString());
                                                        }
                                                    }}
                                                    className={cn("flex-1 py-2.5 font-black text-[10px] rounded-xl transition-all uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm", editingTx?.id === tx.id ? "bg-brand-gold text-bg-main" : "bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold")}
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" /> {editingTx?.id === tx.id ? 'Cancel' : 'Adjust'}
                                                </button>
                                            </div>
                                            
                                            <AnimatePresence>
                                                {editingTx?.id === tx.id && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="bg-bg-main p-3 rounded-2xl border border-border-main mt-2 flex items-center gap-2">
                                                            <div className="relative flex-1">
                                                                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gold" />
                                                                <input 
                                                                    type="number" 
                                                                    value={editAmount}
                                                                    onChange={(e) => setEditAmount(e.target.value)}
                                                                    className="w-full pl-9 pr-3 py-2 bg-bg-surface border border-border-main rounded-xl outline-none focus:border-brand-gold font-bold text-sm"
                                                                    placeholder="New Amount"
                                                                />
                                                            </div>
                                                            <button 
                                                                onClick={async () => {
                                                                    const newAmount = parseInt(editAmount);
                                                                    if (isNaN(newAmount) || newAmount < 0) {
                                                                        toast.error("Invalid amount");
                                                                        return;
                                                                    }
                                                                    try {
                                                                        await dbService.adjustTransactionAmount(tx.id, newAmount, currentAdmin?.id || 'admin');
                                                                        setHistory(prev => prev.map(t => t.id === tx.id ? { ...t, amount: newAmount } : t));
                                                                        setEditingTx(null);
                                                                        setEditAmount('');
                                                                        toast.success("Transaction adjusted and balance synced.");
                                                                    } catch (err) {
                                                                        console.error(err);
                                                                        toast.error("Failed to update transaction.");
                                                                    }
                                                                }}
                                                                className="bg-brand-gold hover:bg-brand-gold-hover text-bg-main px-4 py-2 rounded-xl font-bold text-xs"
                                                            >
                                                                Save
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-6 bg-bg-main border-t border-border-main text-center">
                    <p className="text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">
                        End of transaction trail • Total records: {history.length}
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default TransactionAuditModal;
