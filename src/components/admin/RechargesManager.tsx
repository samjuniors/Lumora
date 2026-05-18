import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Wallet, Clock, ArrowUpRight, Coins, Eye, Image as ImageIcon, ThumbsUp, ThumbsDown } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { walletService } from '../../services/dbProvider';
import { RechargeRequest } from '../../types';
import { cn } from '../../lib/utils';
import { RewardLegend } from './RewardLegend';

export const RechargesManager = () => {
    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div>
                <h2 className="text-3xl font-black text-text-primary tracking-tight">Economy Central</h2>
                <p className="text-sm font-medium text-text-secondary/80 mt-1">Manage global economy rules, grade distributions, and student financial requests.</p>
            </div>
            <RewardLegend />
            <RechargesList />
        </div>
    );
};

const RechargesList = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState<RechargeRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<RechargeRequest | null>(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const reqs = await walletService.getAllRechargeRequests();
            setRequests(reqs);
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to load recharge requests");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (req: RechargeRequest) => {
        setProcessing(true);
        try {
            await walletService.approveRechargeRequest(req.id, user?.id || 'admin');
            toast.success("Recharge approved!");
            setSelectedRequest(null);
            fetchRequests();
        } catch(err) {
            console.error(err);
            toast.error("Process failed");
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async (req: RechargeRequest) => {
        if (!confirm("Reject this request?")) return;
        setProcessing(true);
        try {
            await walletService.rejectRechargeRequest(req.id, user?.id || 'admin');
            toast.success("Request rejected");
            setSelectedRequest(null);
            fetchRequests();
        } catch(err) {
            toast.error("Rejection failed");
        } finally {
            setProcessing(false);
        }
    };

    const pendingRequests = requests.filter(r => r.status === 'pending');
    const totalProcessedVolume = requests.filter(r => r.status === 'approved').reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-bg-surface p-6 rounded-3xl border border-border-main flex items-start gap-4 shadow-sm hover:-translate-y-1 transition-transform">
                    <div className="bg-brand-gold/10 p-3 rounded-2xl text-brand-gold shrink-0">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-text-secondary/70 uppercase tracking-widest mt-1">Pending Actions</p>
                        <h4 className="text-3xl font-black text-text-primary">{pendingRequests.length}</h4>
                    </div>
                </div>
                <div className="bg-bg-surface p-6 rounded-3xl border border-border-main flex items-start gap-4 shadow-sm hover:-translate-y-1 transition-transform">
                    <div className="bg-emerald-500/10 p-3 rounded-2xl text-emerald-600 shrink-0">
                        <Wallet size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-text-secondary/70 uppercase tracking-widest mt-1">Total Funded Volume</p>
                        <h4 className="text-3xl font-black text-text-primary">${totalProcessedVolume.toLocaleString()}</h4>
                    </div>
                </div>
                <div className="bg-bg-surface p-6 rounded-3xl border border-border-main flex items-start gap-4 shadow-sm hover:-translate-y-1 transition-transform">
                    <div className="bg-brand-gold/10 p-3 rounded-2xl text-brand-gold shrink-0">
                        <Coins size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-text-secondary/70 uppercase tracking-widest mt-1">Generated Coins</p>
                        <h4 className="text-3xl font-black text-text-primary">{(totalProcessedVolume * 10).toLocaleString()}</h4>
                    </div>
                </div>
            </div>

            <div className="bg-bg-surface rounded-3xl border border-border-main shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border-main flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black text-text-primary tracking-tight">Financial Clearing</h3>
                        <p className="text-[11px] font-bold text-text-secondary uppercase tracking-widest mt-1">Review & Verify Recharges</p>
                    </div>
                    {pendingRequests.length > 0 && (
                        <div className="flex gap-2">
                            <span className="flex items-center gap-1.5 bg-brand-gold/10 text-brand-gold px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm">
                                <Clock size={14}/> {pendingRequests.length} Pending
                            </span>
                        </div>
                    )}
                </div>
                
                {/* Desktop view */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-border-main">
                        <thead className="bg-bg-main/50">
                            <tr>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Student / Ref</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Amount & Reward</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Status</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Timestamp</th>
                                <th className="px-8 py-5 text-right text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-main">
                            {requests.map(req => (
                                <tr key={req.id} className="hover:bg-bg-main transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="font-black text-text-primary">{req.studentName}</div>
                                        <div className="text-[10px] text-text-secondary/60 font-mono tracking-wider">#{req.id.slice(0, 8).toUpperCase()}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="font-black text-emerald-600 text-lg tracking-tight">${req.amount}</div>
                                        <div className="text-[10px] font-black text-brand-gold flex items-center gap-1">
                                            <Coins size={10} className="fill-current" />
                                            +{req.coins} COINS
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={cn(
                                            "capitalize px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm",
                                            req.status === 'approved' ? "bg-emerald-500/10 text-emerald-600" :
                                            req.status === 'rejected' ? "bg-rose-500/10 text-rose-600" :
                                            "bg-brand-gold/10 text-brand-gold border border-brand-gold/20"
                                        )}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-xs text-text-secondary font-bold">
                                        {format(req.createdAt, 'MMM dd, yyyy')}
                                        <div className="text-[10px] text-text-secondary/60">{format(req.createdAt, 'h:mm a')}</div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button 
                                            onClick={() => setSelectedRequest(req)}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-text-primary text-bg-main rounded-xl font-bold text-xs hover:scale-105 transition-transform"
                                        >
                                            <Eye size={14} /> View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {requests.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <Wallet className="w-12 h-12 text-text-secondary/20 mx-auto mb-4" />
                                        <p className="text-text-secondary font-bold text-lg">No recharge requests</p>
                                        <p className="text-text-secondary/60 text-sm">When students request coins, they'll appear here.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile view */}
                <div className="lg:hidden divide-y divide-border-main">
                    {requests.map(req => (
                        <div key={req.id} onClick={() => setSelectedRequest(req)} className="p-5 active:bg-bg-main/50 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-black text-sm text-text-primary truncate">{req.studentName}</div>
                                    <div className="text-[10px] text-text-secondary/60 font-mono tracking-wider">#{req.id.slice(0, 8).toUpperCase()}</div>
                                </div>
                                <span className={cn(
                                    "capitalize px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest",
                                    req.status === 'approved' ? "bg-emerald-500/10 text-emerald-600" :
                                    req.status === 'rejected' ? "bg-rose-500/10 text-rose-600" :
                                    "bg-brand-gold border border-brand-gold-hover text-bg-main"
                                )}>
                                    {req.status}
                                </span>
                            </div>
                            <div className="flex items-center justify-between bg-bg-main p-3 rounded-xl border border-border-main">
                                <div>
                                    <span className="text-[10px] font-black text-text-secondary/60 uppercase block">Amount</span>
                                    <span className="text-emerald-600 font-black tracking-tight">${req.amount}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black text-text-secondary/60 uppercase block">Reward</span>
                                    <span className="text-brand-gold font-black flex items-center gap-1"><Coins size={12}/> {req.coins}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                                <div className="text-[10px] text-text-secondary/80 font-bold">{format(req.createdAt, 'MMM dd, p')}</div>
                                <div className="text-[10px] font-black text-brand-gold flex items-center gap-1 uppercase tracking-widest">
                                    Details <ArrowUpRight size={12} />
                                </div>
                            </div>
                        </div>
                    ))}
                    {requests.length === 0 && (
                        <div className="py-16 text-center">
                            <Wallet className="w-10 h-10 text-text-secondary/20 mx-auto mb-3" />
                            <p className="text-text-secondary font-bold">No recharge requests</p>
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {selectedRequest && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-text-primary/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-8"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-bg-surface w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-white/10"
                        >
                            <div className="p-6 md:p-8 border-b border-border-main flex justify-between items-center bg-gradient-to-r from-bg-main to-bg-surface">
                                <div>
                                    <h3 className="font-black text-xl md:text-2xl tracking-tight text-text-primary">Clearing Entry</h3>
                                    <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mt-1">Ref: #{selectedRequest.id}</p>
                                </div>
                                <button onClick={() => setSelectedRequest(null)} className="p-3 bg-bg-surface hover:bg-border-main rounded-full transition-colors text-text-secondary shadow-sm">
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <div className="px-6 md:px-8 py-8 space-y-8 overflow-y-auto">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-bg-main p-5 rounded-2xl border border-border-main col-span-2 md:col-span-1">
                                        <p className="text-[10px] font-black text-text-secondary/60 uppercase tracking-widest mb-1">Student</p>
                                        <p className="font-black text-text-primary text-lg truncate">{selectedRequest.studentName}</p>
                                    </div>
                                    <div className="bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20">
                                        <p className="text-[10px] font-black text-emerald-600/80 uppercase tracking-widest mb-1">Fiat Amount</p>
                                        <p className="font-black text-emerald-600 text-xl tracking-tight">${selectedRequest.amount}</p>
                                    </div>
                                    <div className="bg-brand-gold/10 p-5 rounded-2xl border border-brand-gold/20">
                                        <p className="text-[10px] font-black text-brand-gold/80 uppercase tracking-widest mb-1">Coin Yield</p>
                                        <p className="font-black text-brand-gold text-xl tracking-tight flex items-center gap-1.5"><Coins size={18}/> {selectedRequest.coins}</p>
                                    </div>
                                    <div className="bg-bg-main p-5 rounded-2xl border border-border-main">
                                        <p className="text-[10px] font-black text-text-secondary/60 uppercase tracking-widest mb-1">Status</p>
                                        <p className="font-black text-text-primary text-lg capitalize">{selectedRequest.status}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-text-primary p-2 flex items-center justify-center rounded-xl text-bg-main">
                                            <ImageIcon size={18} />
                                        </div>
                                        <p className="text-sm font-black text-text-primary tracking-tight">Payment Verification Record</p>
                                    </div>
                                    <div className="aspect-[4/3] bg-bg-main rounded-[24px] border border-border-main overflow-hidden flex flex-col items-center justify-center shadow-inner relative group p-4">
                                        {selectedRequest.paymentScreenshot ? (
                                            <>
                                                <img src={selectedRequest.paymentScreenshot} alt="Receipt" className="w-full h-full object-contain drop-shadow-md rounded-xl" />
                                                <a 
                                                    href={selectedRequest.paymentScreenshot} 
                                                    target="_blank" 
                                                    rel="noreferrer" 
                                                    className="absolute inset-0 bg-text-primary/0 group-hover:bg-text-primary/10 transition-colors flex items-center justify-center"
                                                >
                                                    <span className="opacity-0 group-hover:opacity-100 bg-bg-surface px-6 py-3 rounded-full font-black text-sm uppercase tracking-widest border border-border-main shadow-2xl transition-all scale-95 group-hover:scale-100 flex items-center gap-2">
                                                        Open Original <ArrowUpRight size={16}/>
                                                    </span>
                                                </a>
                                            </>
                                        ) : (
                                            <div className="text-text-secondary/40 text-center flex flex-col items-center">
                                                <X className="mb-4 opacity-50 text-rose-500/50" size={48}/>
                                                <p className="font-black tracking-tight text-lg">No Documentation</p>
                                                <p className="text-xs font-bold uppercase tracking-widest mt-2 opacity-50">Proceed with extreme caution</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {selectedRequest.status === 'pending' && (
                                <div className="p-6 md:p-8 bg-bg-main border-t border-border-main shrink-0 grid grid-cols-2 gap-4">
                                    <button 
                                        onClick={() => handleReject(selectedRequest)}
                                        disabled={processing}
                                        className="flex items-center justify-center gap-3 py-5 rounded-2xl border-2 border-rose-500/20 text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30 font-black text-sm uppercase tracking-widest transition-all focus:ring-4 focus:ring-rose-500/10 outline-none"
                                    >
                                        <ThumbsDown size={20} /> Reject Entry
                                    </button>
                                    <button 
                                        onClick={() => handleApprove(selectedRequest)}
                                        disabled={processing}
                                        className="flex items-center justify-center gap-3 py-5 rounded-2xl bg-text-primary text-bg-main hover:bg-brand-gold hover:text-bg-main font-black text-sm uppercase tracking-widest transition-all shadow-xl hover:shadow-brand-gold/20 focus:ring-4 focus:ring-text-primary/10 outline-none"
                                    >
                                        <ThumbsUp size={20} /> Clear Funds
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
