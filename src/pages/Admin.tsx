import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbProvider';
import { InviteCode, User, Role, Transaction, PlatformSettings, Assignment, Submission, AssignmentTemplate, RechargeRequest, Enrollment, Notification } from '../types';
import { ShieldAlert, Trash2, Edit2, Check, Plus, X, Shield, Users, KeyRound, Wallet, Settings, Clock, CheckCircle, BarChart3, TrendingUp, Search, Filter, ArrowUpRight, GraduationCap, Coins, Target, Copy, Award, Gift, Eye, ThumbsUp, ThumbsDown, Zap, Image as ImageIcon, Bell, Sparkles, BrainCircuit, Menu, Mail, Loader2, ShieldCheck, AlertCircle, Send, RotateCcw, User as UserIcon, UserPlus } from 'lucide-react';
import { AdminAnalytics } from './AdminAnalytics';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { cn, getVIPLevel } from '../lib/utils';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { CreateAssignmentModal, EditAssignmentModal } from './Assignments';
import { motion, AnimatePresence } from 'motion/react';
import { notifyStudentOfDeadline } from '../services/notificationService';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';

const GRADE_REWARDS = {
    'A+': { min: 95, label: 'Exceptional', multiplier: 1.2, color: 'text-brand-gold', bg: 'bg-brand-gold/10 border-brand-gold/20' },
    'A': { min: 90, label: 'Excellent', multiplier: 1.0, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    'B+': { min: 85, label: 'Great', multiplier: 0.9, color: 'text-cyan-500', bg: 'bg-cyan-500/10 border-cyan-500/20' },
    'B': { min: 80, label: 'Good', multiplier: 0.8, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
    'C': { min: 70, label: 'Average', multiplier: 0.5, color: 'text-brand-gold', bg: 'bg-brand-gold/10 border-brand-gold/20' },
    'D': { min: 60, label: 'Marginal', multiplier: 0, color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' },
    'F': { min: 0, label: 'Fail', multiplier: 0, color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20' }
};

type LetterGrade = keyof typeof GRADE_REWARDS;

const RewardLegend = () => (
    <div className="bg-bg-surface rounded-[32px] p-8 border border-border-main shadow-sm">
        <div className="flex items-center gap-3 mb-6">
            <div className="bg-brand-gold/20 p-2 rounded-xl">
                <Sparkles className="w-5 h-5 text-brand-gold transition-pulse" />
            </div>
            <div>
                <h3 className="text-xl font-black text-text-primary tracking-tight">Grade Reward Structure</h3>
                <p className="text-xs text-text-secondary font-bold uppercase tracking-widest mt-0.5">Automated Assignment Payouts</p>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {Object.entries(GRADE_REWARDS).sort((a,b)=>b[1].min-a[1].min).map(([grade, info]) => (
                <div key={grade} className={cn("p-5 rounded-3xl border shadow-sm flex flex-col gap-2 transition-all hover:-translate-y-1", info.bg)}>
                    <div className="flex justify-between items-center">
                        <span className={cn("text-3xl font-black", info.color)}>{grade}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary/60">Score: {info.min}+</span>
                    </div>
                    <div className="text-sm font-bold text-text-primary">{info.label}</div>
                    <div className={cn("text-xs font-black uppercase tracking-tight flex items-center gap-1", info.color)}>
                        <Coins className="w-3 h-3 fill-current" />
                        {info.multiplier > 0 ? `${Math.round(info.multiplier * 100)}% of Reward` : 'No Coin Reward'}
                    </div>
                </div>
            ))}
        </div>
        <div className="mt-6 p-4 bg-bg-main rounded-2xl border border-border-main flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" />
            <p className="text-xs font-medium text-text-secondary leading-relaxed italic">
                Note: Rewards are calculated based on the MISSION BONUS defined in each assignment. Late submissions may have penalties applied regardless of grade.
            </p>
        </div>
    </div>
);

const TransactionAuditModal = ({ u, onClose }: { u: User, onClose: () => void }) => {
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
                className="bg-bg-surface rounded-[40px] shadow-2xl p-0 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
                <div className="p-6 md:p-8 border-b border-border-main flex justify-between items-center bg-bg-main/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-gold-hover text-bg-main flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-100">
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
                            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm font-bold text-text-secondary/80 uppercase tracking-widest">Indexing Transactions...</span>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="py-20 text-center">
                            <Wallet className="w-12 h-12 text-gray-200 mx-auto mb-4" />
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
                                        isRevoked ? "bg-border-main border-border-main opacity-60" : "bg-bg-surface border-border-main hover:border-brand-gold/20 hover:shadow-md"
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
                                            {tx.message && <div className="text-xs text-text-secondary font-medium italic underline decoration-indigo-100 underline-offset-4">"{tx.message}"</div>}
                                            {tx.utr && <div className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">Ref: {tx.utr}</div>}
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
                                                    className={cn("flex-1 py-2.5 font-black text-[10px] rounded-xl transition-all uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm", editingTx?.id === tx.id ? "bg-brand-gold-hover text-bg-main" : "bg-brand-gold-secondary-hover hover:bg-brand-gold-secondary-hover text-brand-gold")}
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
                                                                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                                                                <input 
                                                                    type="number" 
                                                                    value={editAmount}
                                                                    onChange={(e) => setEditAmount(e.target.value)}
                                                                    className="w-full pl-9 pr-3 py-2 bg-bg-surface border border-border-main rounded-xl outline-none focus:border-indigo-500 font-bold text-sm"
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
                                                                className="bg-brand-gold-hover hover:bg-indigo-700 text-bg-main px-4 py-2 rounded-xl font-bold text-xs"
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

export const AdminPanel = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as any) || 'users';
  const [tab, setTabState] = useState<'overview'|'analytics'|'assignments'|'reviews'|'invites'|'users'|'recharges'|'settings'|'templates'|'leaderboard'>(initialTab);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const setTab = (newTab: string) => {
    setTabState(newTab as any);
    setSearchParams({ tab: newTab });
  };

  useEffect(() => {
    const queryTab = searchParams.get('tab');
    if (queryTab && queryTab !== tab) {
      setTabState(queryTab as any);
    } else if (!queryTab && tab !== 'users') {
      setTabState('users');
    }
  }, [searchParams, tab]);

  if (!user || !['admin', 'superadmin'].includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  const MAIN_TABS = [
    { id: 'overview', label: 'Overview', icon: BarChart3, color: 'text-brand-gold', bg: 'bg-brand-gold', shadow: 'shadow-brand-gold/20' },
    { id: 'analytics', label: 'Analytics', icon: Award, color: 'text-brand-gold', bg: 'bg-brand-gold', shadow: 'shadow-brand-gold/20' },
    { id: 'assignments', label: 'Missions', icon: Target, color: 'text-brand-gold', bg: 'bg-brand-gold', shadow: 'shadow-brand-gold/20' },
    { id: 'reviews', label: 'Reviews', icon: Zap, color: 'text-rose-500', bg: 'bg-rose-500', shadow: 'shadow-rose-500/20' },
    { id: 'users', label: 'Users', icon: UserIcon, color: 'text-brand-gold', bg: 'bg-brand-gold', shadow: 'shadow-brand-gold/20' },
    { id: 'recharges', label: 'Economy', icon: Wallet, color: 'text-brand-gold', bg: 'bg-brand-gold', shadow: 'shadow-brand-gold/20' },
  ] as const;

  const ALL_TABS = [
    ...MAIN_TABS,
    { id: 'settings', label: 'System', icon: Settings, color: 'text-brand-gold', bg: 'bg-brand-gold', shadow: 'shadow-brand-gold/20' },
    { id: 'invites', label: 'Invites', icon: UserPlus, color: 'text-brand-gold', bg: 'bg-brand-gold', shadow: 'shadow-brand-gold/20' },
  ] as const;

  const visibleTabs = [...MAIN_TABS];

  const currentTabInfo = ALL_TABS.find(t => t.id === tab) || ALL_TABS[0];
  const CurrentIcon = currentTabInfo.icon;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 pt-4 px-2 md:px-6 mt-4">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-text-primary tracking-tight md:text-5xl">
            Platform Operations
          </h1>
          <p className="text-text-secondary mt-2 font-medium">
            Signed in as <span className="text-text-primary font-bold capitalize bg-bg-surface px-2 py-1 rounded-md border border-border-main ml-1">{user.role}</span>
          </p>
        </div>
      </div>

      <div className="relative z-[50]">
                <motion.div 
                    key={tab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ 
                        duration: 0.25, 
                        ease: "easeInOut"
                    }}
                    className="mt-8 md:mt-0 w-full"
                >
                    {tab === 'overview' && <AnalyticsOverview />}
                    {tab === 'analytics' && <AdminAnalytics />}
                    {tab === 'assignments' && (
                        <div className="space-y-16">
                            <AssignmentsManager />
                            <TemplatesManager />
                        </div>
                    )}
                    {tab === 'reviews' && <ReviewsManager />}
                    {tab === 'users' && <UsersManager />}
                    {tab === 'recharges' && <RechargesManager />}
                    {tab === 'invites' && <InviteCodesManager />}
                    {tab === 'settings' && user.role === 'superadmin' && (
                        <div className="space-y-16">
                            <SettingsManager />
                        </div>
                    )}
                </motion.div>
      </div>
    </div>
  );
};

const RechargesManager = () => {
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
            const reqs = await dbService.getAllRechargeRequests();
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
            await dbService.approveRechargeRequest(req.id, user?.id || 'admin');
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
            await dbService.rejectRechargeRequest(req.id, user?.id || 'admin');
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
                    <div className="bg-indigo-500/10 p-3 rounded-2xl text-indigo-600 shrink-0">
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
                                    <h2 className="font-black text-xl md:text-2xl tracking-tight text-text-primary">Clearing Entry</h2>
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

const AssignmentsManager = () => {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [students, setStudents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
    const [isSweeping, setIsSweeping] = useState(false);
    const [showRetestAssignmentId, setShowRetestAssignmentId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const runGlobalPenaltySweep = async () => {
        if (!confirm("CRITICAL: This will sweep all students for missed assignments and apply penalty fees. Are you sure?")) return;
        
        setIsSweeping(true);
        try {
            const { penalizedCount } = await dbService.runPenaltySweep();
            toast.success(`Sweep complete! Applied penalties to entries.`);
            await fetchData();
        } catch (err) {
            console.error("Penalty sweep failed:", err);
            toast.error("Penalty sweep failed");
        } finally {
            setIsSweeping(false);
        }
    }

    const fetchData = async () => {
        setLoading(true);
        try {
            const [al, sl, el, ul] = await Promise.all([
                dbService.getAllAssignments(),
                dbService.getAllSubmissions(),
                dbService.getAllEnrollments(),
                dbService.getAllUsers()
            ]);
            setAssignments(al.sort((a,b) => b.dueDate - a.dueDate));
            setSubmissions(sl);
            setEnrollments(el);
            setStudents(ul.filter(u => u.role === 'student'));
        } catch (err: any) {
            console.error(err);
            toast.error("Intelligence failure: Check uplink.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? This will delete the mission for ALL students.")) return;
        try {
            await dbService.deleteAssignment(id);
            toast.success("Mission deleted");
            await fetchData();
        } catch(err) {
            toast.error("Failed to delete mission");
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end pr-4 gap-3">
                <button 
                  onClick={runGlobalPenaltySweep} 
                  disabled={isSweeping || loading}
                  className="flex items-center justify-center gap-2 bg-rose-500/10 text-rose-600 border border-rose-500/20 px-6 py-3 rounded-[16px] font-bold hover:bg-rose-500/20 disabled:opacity-50 transition transform duration-200"
                >
                  <ShieldAlert className="w-5 h-5" />
                  {isSweeping ? 'Sweeping...' : 'Penalty Sweep'}
                </button>
                <button 
                  onClick={() => setShowModal(true)} 
                  className="flex items-center justify-center gap-2 bg-brand-gold-hover text-bg-main px-6 py-3 rounded-[16px] font-bold hover:bg-indigo-700 hover:-translate-y-1 transition transform duration-200 shadow-xl shadow-indigo-200"
                >
                  <Plus className="w-5 h-5" />
                  Deploy Mission
                </button>
            </div>
            <div className="bg-bg-surface rounded-[32px] border border-border-main shadow-sm overflow-hidden">
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-border-main">
                    <thead className="bg-bg-main/50">
                        <tr>
                            <th className="px-8 py-4 text-left text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Mission Title</th>
                            <th className="px-8 py-4 text-left text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Submissions</th>
                            <th className="px-8 py-4 text-left text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Deadline</th>
                            <th className="px-8 py-4 text-left text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Fee / Bonus</th>
                            <th className="px-8 py-4 text-right text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-bg-surface divide-y divide-border-main">
                        {assignments.map(a => {
                            const subCount = submissions.filter(s => s.assignmentId === a.id).length;
                            const missedCount = enrollments.filter(e => e.assignmentId === a.id && e.status === 'missed').length;
                            const retestCount = enrollments.filter(e => e.assignmentId === a.id && e.status === 'active' && e.graceDeadline && e.graceDeadline > Date.now()).length;
                            
                            return (
                                <tr key={a.id} className="hover:bg-bg-main/50 transition-colors">
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <div className="text-sm font-bold text-text-primary tracking-tight">{a.title}</div>
                                        <div className="text-[11px] text-text-secondary/80 font-medium truncate max-w-xs">{a.description}</div>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-12 h-1.5 bg-border-main rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, subCount * 10)}%` }}></div>
                                                </div>
                                                <span className="text-[10px] font-bold text-text-secondary">{subCount} Done</span>
                                            </div>
                                            {missedCount > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-12 h-1.5 bg-rose-500/10 rounded-full overflow-hidden">
                                                        <div className="h-full bg-rose-500" style={{ width: `${Math.min(100, missedCount * 10)}%` }}></div>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-rose-600">{missedCount} Missed</span>
                                                </div>
                                            )}
                                            {retestCount > 0 && (
                                                <button 
                                                    onClick={() => setShowRetestAssignmentId(a.id)}
                                                    className="flex items-center gap-2 hover:bg-brand-gold/10 p-1 rounded transition-colors group/retest"
                                                >
                                                        <div className="w-12 h-1.5 bg-brand-gold/10 rounded-full overflow-hidden">
                                                            <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, retestCount * 10)}%` }}></div>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-brand-gold group-hover/retest:underline">{retestCount} Retest</span>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap text-xs text-text-secondary font-medium">
                                        {format(a.dueDate, 'MMM dd, p')}
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <div className="text-[11px] font-bold text-rose-500">-{a.entryFee}</div>
                                        <div className="text-[11px] font-bold text-emerald-500">+{a.bonusReward}</div>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap text-right space-x-2">
                                        <button 
                                          onClick={async () => {
                                            if (!confirm("Apply penalties to ALL students who missed this specific mission?")) return;
                                            setLoading(true);
                                            try {
                                                const { penalizedCount } = await dbService.runPenaltySweep(a.id);
                                                toast.success(`Applied penalties to ${penalizedCount} students`);
                                                await fetchData();
                                            } catch (err) {
                                                console.error(err);
                                                toast.error("Process failed");
                                            } finally {
                                                setLoading(false);
                                            }
                                          }}
                                          className="p-2 text-text-secondary/60 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl transition-all"
                                          title="Penalize All Missed"
                                        >
                                          <Target className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={async () => {
                                            const allSubmissions = await dbService.getAllSubmissions();
                                            const submittedUserIds = allSubmissions.filter(s => s.assignmentId === a.id).map(s => s.studentId);
                                            
                                            const allUsers = await dbService.getAllUsers();
                                            const missingStudents = allUsers
                                              .filter(s => s.role === 'student')
                                              .filter(s => !submittedUserIds.includes(s.id))
                                              .filter(s => a.isGlobal || a.allowedStudents?.includes(s.id));

                                            if (missingStudents.length === 0) {
                                              toast.success("Everyone has already submitted!");
                                              return;
                                            }

                                            if (!confirm(`Send deadline reminder emails to ${missingStudents.length} students?`)) return;

                                            try {
                                              const emailPromises = missingStudents.map(s => {
                                                if (!s.email) return Promise.resolve();
                                                return notifyStudentOfDeadline(s.email, s.name, a.title, a.dueDate);
                                              });
                                              await Promise.all(emailPromises);
                                              toast.success("Reminders queued successfully!");
                                            } catch (e) {
                                              toast.error("Failed to queue reminders");
                                            }
                                          }}
                                          className="p-2 text-text-secondary/60 hover:text-amber-500 hover:bg-brand-gold/10 rounded-xl transition-all"
                                          title="Send Email Reminder"
                                        >
                                          <Bell className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={() => setEditingAssignment(a)}
                                          className="p-2 text-text-secondary/60 hover:text-brand-gold hover:bg-brand-gold-secondary-hover rounded-xl transition-all"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={() => handleDelete(a.id)}
                                          className="p-2 text-text-secondary/60 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                    </table>
                </div>

                {/* Mobile view */}
                <div className="md:hidden divide-y divide-border-main/30">
                    {assignments.map(a => {
                        const subCount = submissions.filter(s => s.assignmentId === a.id).length;
                        return (
                            <div key={a.id} className="p-4 bg-bg-surface active:bg-bg-main transition-colors">
                                <div className="flex justify-between items-start gap-4 mb-3">
                                    <div className="overflow-hidden">
                                        <h4 className="font-black text-text-primary truncate">{a.title}</h4>
                                        <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">{format(a.dueDate, 'MMM dd, p')}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => setEditingAssignment(a)} className="p-2 text-brand-gold bg-brand-gold-secondary-hover rounded-xl"><Edit2 size={16}/></button>
                                        <button onClick={() => handleDelete(a.id)} className="p-2 text-rose-500 bg-rose-500/10 rounded-xl"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-text-secondary/80 uppercase mb-0.5">Progress</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-12 h-1.5 bg-border-main rounded-full overflow-hidden">
                                                    <div className="h-full bg-brand-gold" style={{ width: `${Math.min(100, subCount * 10)}%` }}></div>
                                                </div>
                                                <span className="text-[10px] font-black text-text-secondary">{subCount}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-rose-400 uppercase">Fee</p>
                                            <p className="text-xs font-black text-rose-500 italic">-{a.entryFee}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-emerald-400 uppercase">Bonus</p>
                                            <p className="text-xs font-black text-emerald-500">+{a.bonusReward}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {assignments.length === 0 && !loading && (
                    <div className="p-12 text-center text-text-secondary/80 font-bold italic">No missions deployed.</div>
                )}
            </div>

            {showModal && <CreateAssignmentModal onClose={() => setShowModal(false)} onCreated={fetchData} />}
            {editingAssignment && (
                <EditAssignmentModal 
                  assignment={editingAssignment} 
                  onClose={() => setEditingAssignment(null)} 
                  onUpdated={fetchData} 
                />
            )}

            <>
                {showRetestAssignmentId && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 bg-text-primary/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-bg-surface rounded-[2.5rem] shadow-2xl p-8 w-full max-w-lg relative"
                        >
                            <button 
                                onClick={() => setShowRetestAssignmentId(null)} 
                                className="absolute top-6 right-6 p-2 text-text-secondary/80 hover:text-text-secondary bg-bg-main hover:bg-border-main rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="mb-6">
                                <div className="w-12 h-12 bg-brand-gold/20 text-brand-gold rounded-2xl flex items-center justify-center mb-4">
                                    <Zap className="w-6 h-6" />
                                </div>
                                <h2 className="text-2xl font-black text-text-primary tracking-tight">Retest Period Students</h2>
                                <p className="text-text-secondary font-medium text-sm mt-1">Students allowed to resubmit missions.</p>
                            </div>

                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                {enrollments
                                    .filter(e => e.assignmentId === showRetestAssignmentId && e.status === 'active' && e.graceDeadline && e.graceDeadline > Date.now())
                                    .map(e => {
                                        const student = students.find(s => s.id === e.studentId);
                                        return (
                                            <div key={e.id} className="flex items-center justify-between p-4 bg-bg-main/50 rounded-2xl border border-border-main/50 group hover:bg-bg-surface hover:border-brand-gold/30 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-brand-gold-secondary-hover rounded-xl flex items-center justify-center text-lg shadow-sm">
                                                        {student?.avatar?.startsWith('http') || student?.avatar?.startsWith('data:') ? (
                                                            <img src={student.avatar} alt="" className="w-full h-full object-cover rounded-xl" />
                                                        ) : (student?.avatar || '👤')}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-text-primary group-hover:text-brand-gold transition-colors uppercase tracking-tight text-sm">{student?.name || 'Unknown Student'}</p>
                                                        <p className="text-[10px] text-text-secondary uppercase tracking-widest font-black">ID: {student?.id.substring(0, 8)}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-tighter mb-0.5">Expires</p>
                                                    <div className="text-xs font-black text-text-secondary bg-bg-surface px-2 py-1 rounded-lg border border-border-main italic">
                                                        {format(e.graceDeadline!, 'MMM dd, p')}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                {enrollments.filter(e => e.assignmentId === showRetestAssignmentId && e.status === 'active' && e.graceDeadline && e.graceDeadline > Date.now()).length === 0 && (
                                    <div className="text-center py-12 bg-bg-main rounded-3xl border border-dashed border-border-main">
                                        <Users className="w-10 h-10 text-text-secondary/60 mx-auto mb-3" />
                                        <p className="text-text-secondary/80 font-bold italic text-sm">No students in grace period.</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-8">
                                <button 
                                    onClick={() => setShowRetestAssignmentId(null)}
                                    className="w-full bg-text-primary text-bg-main font-black py-4 rounded-[20px] shadow-xl shadow-black/5 hover:bg-text-secondary/80 hover:text-bg-main transition-all active:scale-95"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </>
        </div>
    );
}

const AnalyticsOverview = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalUsers: 0,
        studentCount: 0,
        activeMissions: 0,
        totalSubmissions: 0,
        totalCoins: 0,
        avgScore: 0,
    });
    const [loading, setLoading] = useState(true);
    const [submissionData, setSubmissionData] = useState<any[]>([]);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const [users, assignments, submissions] = await Promise.all([
                dbService.getAllUsers(),
                dbService.getAllAssignments(),
                dbService.getAllSubmissions()
            ]);

            const totalCoins = users.reduce((acc, u) => acc + (u.coins || 0), 0);
            const assessedSubmissions = submissions.filter(s => s.status === 'assessed');
            const avgScore = assessedSubmissions.length > 0 
                ? assessedSubmissions.reduce((acc, s) => acc + s.aiScore, 0) / assessedSubmissions.length 
                : 0;

            setStats({
                totalUsers: users.length,
                studentCount: users.filter(u => u.role === 'student').length,
                activeMissions: assignments.length,
                totalSubmissions: submissions.length,
                totalCoins,
                avgScore: Math.round(avgScore),
            });

            // Prepare chart data for last 7 days
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const date = subDays(new Date(), i);
                return {
                    name: format(date, 'MMM dd'),
                    count: 0,
                    timestamp: startOfDay(date).getTime(),
                };
            }).reverse();

            submissions.forEach(s => {
                const subDate = startOfDay(new Date(s.submittedAt)).getTime();
                const dayMatch = last7Days.find(d => d.timestamp === subDate);
                if (dayMatch) dayMatch.count++;
            });

            setSubmissionData(last7Days);

        } catch (err) {
            console.error("Failed to fetch admin stats", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-border-main rounded-[32px]"></div>)}
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Total Students" 
                    value={stats.studentCount} 
                    icon={<GraduationCap className="text-blue-500" />} 
                    color="blue"
                    subtitle="Active learners"
                />
                <StatCard 
                    title="Economic Flow" 
                    value={stats.totalCoins} 
                    unit="Coins"
                    icon={<Coins className="text-brand-gold" />} 
                    color="amber"
                    subtitle="Total in wallets"
                />
                <StatCard 
                    title="Mission Submissions" 
                    value={stats.totalSubmissions} 
                    icon={<TrendingUp className="text-brand-gold" />} 
                    color="indigo"
                    subtitle="All-time attempts"
                />
                <StatCard 
                    title="Academic Perf." 
                    value={stats.avgScore} 
                    unit="%"
                    icon={<ArrowUpRight className="text-emerald-500" />} 
                    color="emerald"
                    subtitle="Average Class Score"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-bg-surface rounded-[32px] p-8 border border-border-main shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-text-primary mt-0 pt-0 pl-[3px]">Submission Velocity</h3>
                            <p className="text-sm text-text-secondary font-medium">Activity over the last 7 days</p>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={submissionData}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        borderRadius: '16px', 
                                        backgroundColor: 'var(--bg-surface)',
                                        borderColor: 'var(--border-main)',
                                        color: 'var(--text-primary)',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        fontWeight: 'bold'
                                    }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="count" 
                                    stroke="#6366f1" 
                                    strokeWidth={4}
                                    fillOpacity={1} 
                                    fill="url(#colorCount)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-bg-surface rounded-[32px] p-8 border border-border-main shadow-sm flex flex-col">
                    <h3 className="text-xl font-bold text-text-primary mb-2">System Health</h3>
                    <p className="text-sm text-text-secondary font-medium mb-8">Role distribution</p>
                    <div className="flex-grow flex items-center justify-center">
                        <PieChart width={200} height={200}>
                            <Pie
                                data={[
                                    { name: 'Students', value: stats.studentCount },
                                    { name: 'Staff', value: stats.totalUsers - stats.studentCount }
                                ]}
                                cx={100}
                                cy={100}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                <Cell fill="#6366f1" />
                                <Cell fill="#cbd5e1" />
                            </Pie>
                        </PieChart>
                    </div>
                    <div className="space-y-4 mt-4">
                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-brand-gold"></div>
                                <span className="text-text-secondary font-medium tracking-tight">Active Students</span>
                            </div>
                            <span className="font-bold text-text-primary">{stats.studentCount}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                                <span className="text-text-secondary font-medium tracking-tight">Privileged Staff</span>
                            </div>
                            <span className="font-bold text-text-primary">{stats.totalUsers - stats.studentCount}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-brand-gold-hover rounded-[32px] p-8 text-bg-main shadow-xl shadow-indigo-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-48 h-48 bg-bg-surface/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-2xl font-black mb-2 flex items-center justify-center md:justify-start gap-3">
                            <Bell size={24} /> Global Broadcast
                        </h3>
                        <p className="text-indigo-100 text-sm font-medium mb-2 leading-relaxed">Instantly reach every student on the platform with a high-priority alert.</p>
                    </div>
                    
                    <div className="w-full md:w-[400px] flex flex-col xs:flex-row gap-3">
                        <input 
                            className="flex-1 w-full xs:w-auto bg-bg-surface/10 border border-white/20 rounded-2xl px-5 py-4 text-sm text-bg-main placeholder:text-bg-main/40 outline-none focus:bg-bg-surface/20 transition-all font-medium"
                            placeholder="Announcement content..."
                            id="broadcast-input"
                        />
                        <button 
                            onClick={async () => {
                                const input = document.getElementById('broadcast-input') as HTMLInputElement;
                                const msg = input?.value;
                                if (!msg || !user) return;
                                try {
                                    await dbService.sendBroadcastNotification(msg, user.id);
                                    toast.success("Broadcast successful!");
                                    input.value = '';
                                } catch (e) {
                                    toast.error("Broadcast failed");
                                }
                            }}
                            className="w-full xs:w-auto bg-bg-surface text-brand-gold px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-bg-main active:scale-95 transition-all shadow-lg shrink-0"
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon, color, unit = '', subtitle }: { title: string, value: number, icon: React.ReactNode, color: string, unit?: string, subtitle?: string }) => {
    const colors: any = {
        blue: "bg-blue-50 text-blue-600",
        amber: "bg-brand-gold/10 text-brand-gold",
        indigo: "bg-brand-gold-secondary-hover text-brand-gold",
        emerald: "bg-success-green/10 text-emerald-600",
    };

    return (
        <div className="bg-bg-surface rounded-[32px] p-6 border border-border-main shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex justify-between items-start mb-4">
                <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110 duration-300", colors[color])}>
                    {React.cloneElement(icon as React.ReactElement<any>, { className: "w-6 h-6" })}
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Live</span>
                </div>
            </div>
            <div>
                <h4 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-1">{title}</h4>
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-text-primary tracking-tight">{value}</span>
                    {unit && <span className="text-sm font-bold text-text-secondary">{unit}</span>}
                </div>
                {subtitle && <p className="text-xs text-text-secondary font-medium mt-1">{subtitle}</p>}
            </div>
        </div>
    );
};

const TemplatesManager = () => {
    const { user } = useAuth();
    const [templates, setTemplates] = useState<AssignmentTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Form fields
    const [label, setLabel] = useState('');
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [instructions, setInstructions] = useState('');
    const [timeLimit, setTimeLimit] = useState(20);
    const [rubric, setRubric] = useState<{name: string, description: string, weight: number}[]>([
        { name: 'Criteria 1', description: 'desc', weight: 100 }
    ]);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const tmpls = await dbService.getAssignmentTemplates();
            setTemplates(tmpls);
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to load templates");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete template?")) return;
        try {
            await dbService.deleteAssignmentTemplate(id);
            toast.success("Template deleted");
            await fetchTemplates();
        } catch(err) {
            toast.error("Failed to delete template");
        }
    }

    const handleSeedTemplates = async () => {
        const seedTemplates: AssignmentTemplate[] = [
            // ... (keeping template objects same for simplicity in replacement, but I'll update the loop)
            {
                id: 'zbrush_sculpt',
                label: 'Zbrush Sculpting Hero',
                title: 'High-Poly Character Sculpt',
                subject: '3D Modeling',
                description: 'Sculpt a highly detailed character bust mimicking industry AAA standards using Zbrush.',
                instructions: 'Use Dynamesh for initial forms, ZRemesher for topology, and carefully apply subdivision levels. Focus on primary forms before jumping into micro-details. Export final renders as ZPR and ZTL files, along with clay renders.',
                timeLimitMinutes: 180,
                rubric: [
                    { name: 'Anatomy & Proportions', description: 'Accurate structural foundations and silhouette', weight: 40 },
                    { name: 'Surface Details', description: 'Realism in pores, wrinkles, and secondary forms', weight: 30 },
                    { name: 'Topology & Optimization', description: 'Efficient subdivision loops and clean mesh flow', weight: 30 }
                ],
                creatorId: user!.id,
                createdAt: Date.now()
            },
            {
                id: 'maya_anim',
                label: 'Maya Combat Animation',
                title: 'Weight & Impact Animation',
                subject: 'Animation',
                description: 'Create a 3-5 second combat attack animation emphasizing weight, timing, and impact using Maya.',
                instructions: 'Start with strong key poses. Use the Graph Editor to refine arcs and ease-in/ease-out. Pay attention to anticipation, follow-through, and overlapping action. Ensure the rig constraints are optimally used.',
                timeLimitMinutes: 120,
                rubric: [
                    { name: 'Timing & Spacing', description: 'Proper weight distribution and kinetic energy', weight: 40 },
                    { name: 'Posing & Silhouette', description: 'Clear readability of action frames', weight: 40 },
                    { name: 'Graph Editor Polish', description: 'Smooth arcs, no IK pops or jitter', weight: 20 }
                ],
                creatorId: user!.id,
                createdAt: Date.now()
            },
            {
                id: 'unreal_cine',
                label: 'Unreal Cinematics',
                title: 'In-Engine Lighting & Camera',
                subject: 'Game Dev',
                description: 'Setup a dramatic lighting scenario and camera movement in Unreal Engine 5 using Lumen and Sequencer.',
                instructions: 'Use the rule of thirds. Setup a 3-point lighting or a dramatic single-source key light setup. Use Sequencer to animate a slow tracking camera. Enable Lumen for Global Illumination and reflections. Ensure post-process volumes enhance the mood safely without blowing out highlights.',
                timeLimitMinutes: 90,
                rubric: [
                    { name: 'Lighting & Mood', description: 'Effective use of shadows, contrast, and color temperature', weight: 50 },
                    { name: 'Camera Composition', description: 'Depth of field, safe zones, rule of thirds', weight: 30 },
                    { name: 'Engine Optimization', description: 'Clean actor hierarchy and proper Lumen constraints', weight: 20 }
                ],
                creatorId: user!.id,
                createdAt: Date.now()
            }
        ];

        try {
            for (const t of seedTemplates) {
                await dbService.saveAssignmentTemplate(t.id, t);
            }
            toast.success("Industry templates seeded successfully!");
            await fetchTemplates();
        } catch (err) {
            toast.error("Failed to seed templates");
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const code = label.toLowerCase().replace(/\s+/g, '_');
            const newTmpl: AssignmentTemplate = {
                id: code,
                label, title, subject, description, instructions, timeLimitMinutes: timeLimit, rubric,
                creatorId: user!.id,
                createdAt: Date.now()
            };
            await dbService.saveAssignmentTemplate(code, newTmpl);
            toast.success("Template created!");
            setLabel(''); setTitle(''); setSubject(''); setDescription(''); setInstructions('');
            await fetchTemplates();
        } catch(err) {
            toast.error("Failed to create template");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-bg-surface p-6 rounded-[32px] border border-gray-50 shadow-sm">
                <div>
                   <h3 className="text-xl font-black text-text-primary mb-1">Templates Library</h3>
                   <p className="text-text-secondary text-sm font-medium">Manage assignment structures and AI grading rubrics</p>
                </div>
                <button 
                  onClick={handleSeedTemplates}
                  className="bg-brand-gold-hover hover:bg-indigo-700 text-bg-main font-bold py-2.5 px-6 rounded-xl transition-colors shadow-md shadow-indigo-600/20"
                >
                  Seed Industry Templates
                </button>
            </div>

            <div className="bg-bg-surface p-8 rounded-[32px] border border-gray-50 shadow-sm">
                <h3 className="text-xl font-black text-text-primary mb-6">Create New Template</h3>
                <form onSubmit={handleCreate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-text-secondary/80 uppercase mb-2">Internal Label (e.g., Physics Essay)</label>
                            <input required value={label} onChange={e=>setLabel(e.target.value)} className="w-full px-5 py-3.5 bg-bg-main border border-transparent rounded-[18px] focus:bg-bg-surface focus:border-indigo-500 font-bold" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary/80 uppercase mb-2">Mission Title</label>
                            <input required value={title} onChange={e=>setTitle(e.target.value)} className="w-full px-5 py-3.5 bg-bg-main border border-transparent rounded-[18px] focus:bg-bg-surface focus:border-indigo-500 font-bold" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary/80 uppercase mb-2">Subject</label>
                            <input required value={subject} onChange={e=>setSubject(e.target.value)} className="w-full px-5 py-3.5 bg-bg-main border border-transparent rounded-[18px] focus:bg-bg-surface focus:border-indigo-500 font-bold" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary/80 uppercase mb-2">Time Limit (mins)</label>
                            <input type="number" required value={timeLimit} onChange={e=>setTimeLimit(Number(e.target.value))} className="w-full px-5 py-3.5 bg-bg-main border border-transparent rounded-[18px] focus:bg-bg-surface focus:border-indigo-500 font-bold" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-text-secondary/80 uppercase mb-2">Description</label>
                        <textarea required value={description} onChange={e=>setDescription(e.target.value)} className="w-full px-5 py-3.5 bg-bg-main border border-transparent rounded-[18px] focus:bg-bg-surface focus:border-indigo-500 font-bold h-24" />
                    </div>
                    <button type="submit" className="px-8 py-4 bg-brand-gold-hover text-bg-main rounded-[16px] font-bold hover:bg-indigo-700 transition">Save Template</button>
                </form>
            </div>

            <div className="bg-bg-surface rounded-[32px] border border-gray-50 shadow-sm overflow-hidden p-6">
                <h3 className="text-xl font-black text-text-primary mb-6">Existing Templates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map(t => (
                        <div key={t.id} className="p-4 border border-border-main rounded-2xl bg-bg-main/50">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-bold text-text-primary">{t.label}</h4>
                                    <p className="text-xs text-text-secondary font-medium">{t.subject}</p>
                                </div>
                                <button onClick={() => handleDelete(t.id)} className="text-rose-500 hover:bg-rose-500/10 p-2 rounded-xl transition">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-sm font-medium text-text-secondary mt-2 line-clamp-2">{t.description}</p>
                        </div>
                    ))}
                    {templates.length === 0 && <div className="text-sm text-text-secondary/80 font-medium col-span-2">No templates yet.</div>}
                </div>
            </div>
        </div>
    );
};

const InviteCodesManager = () => {
    const { user } = useAuth();
    const [codes, setCodes] = useState<InviteCode[]>([]);
    const [loading, setLoading] = useState(false);
    
    const [newRole, setNewRole] = useState<Role>('student');
    const [newCodeName, setNewCodeName] = useState('');
    const [newMaxUses, setNewMaxUses] = useState<string>('1');

    useEffect(() => { fetchCodes(); }, []);

    const fetchCodes = async () => {
        try {
            const codes = await dbService.getAllInviteCodes();
            setCodes(codes);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load codes");
        }
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        const finalCode = (newCodeName || Math.random().toString(36).substring(2, 10)).toUpperCase();
        
        const maxUsesParsed = parseInt(newMaxUses);
        const maxUses = isNaN(maxUsesParsed) || maxUsesParsed <= 0 ? null : maxUsesParsed; 

        setLoading(true);
        try {
            const newCode: InviteCode = {
                id: finalCode,
                code: finalCode,
                role: newRole,
                createdBy: user!.id,
                used: false,
                currentUses: 0,
                maxUses: maxUses,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            await dbService.saveInviteCode(finalCode, newCode);
            setNewCodeName('');
            setNewMaxUses('1');
            await fetchCodes();
            toast.success("Code generated!");
        } catch(err) {
            console.error(err);
            toast.error("Failed to generate code.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (code: InviteCode) => {
        if (!confirm(`Delete code ${code.code}?`)) return;
        try {
            await dbService.deleteInviteCode(code.code);
            await fetchCodes();
        } catch(err) {
            console.error(err);
            toast.error("Failed to delete code");
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-bg-surface rounded-[32px] p-8 border border-border-main shadow-sm col-span-full">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-brand-gold-secondary-hover p-2 rounded-xl">
                        <KeyRound className="w-5 h-5 text-brand-gold" />
                    </div>
                    <h2 className="text-xl font-bold text-text-primary">Issue Entry Tokens</h2>
                </div>
                <form onSubmit={handleGenerate} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-text-secondary/80 uppercase tracking-widest mb-2 ml-1">Custom Token Name</label>
                        <input 
                            type="text" 
                            value={newCodeName} 
                            onChange={e=>setNewCodeName(e.target.value)} 
                            placeholder="E.g. VIP_CLASS" 
                            className="w-full px-6 py-3.5 bg-bg-main border border-transparent rounded-[18px] outline-none focus:bg-bg-surface focus:border-indigo-500 transition-all font-bold tracking-tight" 
                        />
                    </div>
                    <div className="w-full md:w-32">
                        <label className="block text-xs font-bold text-text-secondary/80 uppercase tracking-widest mb-2 ml-1">Max Uses</label>
                        <input 
                            type="number" 
                            min="1"
                            value={newMaxUses} 
                            onChange={e=>setNewMaxUses(e.target.value)} 
                            placeholder="∞" 
                            className="w-full px-5 py-3.5 bg-bg-main border border-transparent rounded-[18px] outline-none focus:bg-bg-surface focus:border-indigo-500 transition-all font-bold" 
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <label className="block text-xs font-bold text-text-secondary/80 uppercase tracking-widest mb-2 ml-1">Target Role</label>
                        <div className="relative">
                            <select 
                                value={newRole} 
                                onChange={e=>setNewRole(e.target.value as Role)} 
                                className="w-full px-5 py-3.5 bg-bg-main border border-border-main text-text-primary rounded-[18px] outline-none focus:bg-bg-surface focus:border-brand-gold transition-all appearance-none font-bold"
                            >
                                <option value="student" className="bg-bg-surface text-text-primary">Student</option>
                                {user?.role === 'superadmin' && <option value="admin" className="bg-bg-surface text-text-primary">Admin</option>}
                                {user?.role === 'superadmin' && <option value="superadmin" className="bg-bg-surface text-text-primary">Superadmin</option>}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary/80">
                                <Filter className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="w-full md:w-auto bg-brand-gold-hover hover:bg-indigo-700 text-bg-main font-black px-8 py-3.5 rounded-[18px] disabled:opacity-50 transition-all shadow-lg shadow-indigo-200 active:scale-95"
                    >
                        {loading ? 'Minting...' : 'Generate Token'}
                    </button>
                </form>
            </div>

            <div className="bg-bg-surface rounded-[32px] border border-border-main shadow-sm overflow-hidden">
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-border-main">
                        <thead className="bg-bg-main/50">
                            <tr>
                                <th className="px-8 py-4 text-left text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Token ID</th>
                                <th className="px-8 py-4 text-left text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Entitlement</th>
                                <th className="px-8 py-4 text-left text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Status / Uses</th>
                                <th className="px-8 py-4 text-left text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Issued Date</th>
                                <th className="px-8 py-4 text-right text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Ops</th>
                            </tr>
                        </thead>
                        <tbody className="bg-bg-surface divide-y divide-gray-50">
                            {codes.map(code => (
                                <tr key={code.code} className="hover:bg-bg-main/50 transition-colors">
                                    <td className="px-8 py-5 whitespace-nowrap text-sm font-black text-text-primary tracking-tight">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-2 h-2 rounded-full", code.used ? "bg-rose-400" : "bg-emerald-400")}></div>
                                            {code.code}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap text-sm">
                                        <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", 
                                            code.role === 'superadmin' ? 'bg-rose-500/10 text-rose-600' :
                                            code.role === 'admin' ? 'bg-brand-gold-secondary-hover text-brand-gold' : 'bg-slate-50 text-slate-600'
                                        )}>
                                            {code.role}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap text-sm">
                                        <div className="flex flex-col gap-1">
                                            {code.used ? (
                                                <span className="flex items-center gap-1.5 text-rose-500 font-bold text-xs">
                                                    <X className="w-3 h-3" /> Fully Exhausted
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-emerald-500 font-bold text-xs">
                                                    <CheckCircle className="w-3 h-3" /> Active
                                                </span>
                                            )}
                                            <span className="text-[10px] text-text-secondary/80 font-bold uppercase tracking-widest">
                                                Uses: {code.currentUses || 0} / {code.maxUses || '∞'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap text-xs text-text-secondary/80 font-medium">
                                        {format(code.createdAt, 'MMM dd, p')}
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-medium">
                                        {!code.used && (
                                            <button onClick={() => handleDelete(code)} className="text-text-secondary/60 hover:text-rose-500 p-2 rounded-xl hover:bg-rose-500/10 transition-all active:scale-90">
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {codes.length === 0 && (
                                <tr><td colSpan={5} className="px-8 py-12 text-center text-text-secondary italic font-medium">No system tokens found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden divide-y divide-gray-50">
                    {codes.map(code => (
                        <div key={code.code} className="p-4 bg-bg-surface flex items-center justify-between gap-4">
                            <div className="overflow-hidden">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", code.used ? "bg-rose-400" : "bg-emerald-400")}></div>
                                    <span className="font-black text-text-primary tracking-tight">{code.code}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tight", 
                                        code.role === 'superadmin' ? 'bg-rose-500/10 text-rose-600' :
                                        code.role === 'admin' ? 'bg-brand-gold-secondary-hover text-brand-gold' : 'bg-slate-50 text-slate-600'
                                    )}>
                                        {code.role}
                                    </span>
                                    <span className="text-[9px] text-text-secondary/80 font-bold uppercase">{format(code.createdAt, 'MMM dd')}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 flex-shrink-0">
                                <div className="text-right">
                                    <div className="text-[9px] font-black text-text-secondary/80 uppercase">Uses</div>
                                    <div className={cn("text-[10px] font-black", code.used ? "text-rose-500" : "text-emerald-500")}>
                                        {code.currentUses || 0} / {code.maxUses || '∞'}
                                    </div>
                                </div>
                                {!code.used && (
                                    <button onClick={() => handleDelete(code)} className="p-2 text-rose-400 active:bg-rose-500/10 rounded-xl">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {codes.length === 0 && (
                        <div className="p-8 text-center text-sm font-bold text-text-secondary/80 italic">No tokens found.</div>
                    )}
                </div>
            </div>
        </div>
    )
}

const UserActionsBottomSheet = ({ 
    u, 
    onClose, 
    onViewAudit, 
    onGrant, 
    onPenalty,
    onRoleChange,
    currentUser
}: { 
    u: User, 
    onClose: () => void, 
    onViewAudit: () => void, 
    onGrant: () => void, 
    onPenalty: () => void,
    onRoleChange: (role: Role) => void,
    currentUser?: User | null
}) => {
    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-text-primary/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
        >
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-bg-surface rounded-[40px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col focus:outline-none"
            >
                <div className="p-6 md:p-8 border-b border-border-main flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-gold-hover text-bg-main flex items-center justify-center font-black text-xl shadow-lg">
                            {u.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-text-primary tracking-tight">{u.name}</h2>
                            <p className="text-xs text-text-secondary/80 font-bold uppercase tracking-widest">{u.email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-bg-main rounded-2xl transition-all text-text-secondary/80 hover:text-text-primary">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-4 h-auto max-h-[65vh] overflow-y-auto no-scrollbar">
                    <button 
                        onClick={() => { onViewAudit(); onClose(); }}
                        className="flex items-center gap-4 p-5 rounded-3xl bg-brand-gold-secondary-hover/50 hover:bg-brand-gold-secondary-hover border border-brand-gold/20/50 transition-all text-left group"
                    >
                        <div className="bg-brand-gold-hover p-3 rounded-2xl text-bg-main shadow-indigo-100 shadow-lg group-active:scale-90 transition-transform">
                            <Eye className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="font-black text-text-primary text-sm">Economy Audit</div>
                            <div className="text-[10px] text-text-secondary/80 font-bold uppercase tracking-widest">View history</div>
                        </div>
                    </button>

                    <button 
                        onClick={() => { onGrant(); onClose(); }}
                        className="flex items-center gap-4 p-5 rounded-3xl bg-brand-gold/10/50 hover:bg-brand-gold/10 border border-brand-gold/20/50 transition-all text-left group"
                    >
                        <div className="bg-amber-500 p-3 rounded-2xl text-bg-main shadow-amber-100 shadow-lg group-active:scale-90 transition-transform">
                            <Gift className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="font-black text-text-primary text-sm">Adjust Wallet</div>
                            <div className="text-[10px] text-text-secondary/80 font-bold uppercase tracking-widest">Grant / Fine</div>
                        </div>
                    </button>

                    <Link 
                        to={`/scorecard/${u.id}`}
                        onClick={onClose}
                        className="flex items-center gap-4 p-5 rounded-3xl bg-success-green/10/50 hover:bg-success-green/10 border border-success-green/20/50 transition-all text-left group"
                    >
                        <div className="bg-emerald-500 p-3 rounded-2xl text-bg-main shadow-emerald-100 shadow-lg group-active:scale-90 transition-transform">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="font-black text-text-primary text-sm">Scorecard</div>
                            <div className="text-[10px] text-text-secondary/80 font-bold uppercase tracking-widest">Analytics</div>
                        </div>
                    </Link>

                    {currentUser?.role === 'superadmin' && (
                        <div className="p-5 rounded-3xl bg-bg-main/50 border border-border-main/50 space-y-3 md:col-span-2">
                            <div className="flex items-center gap-2 px-1">
                                <Shield className="w-4 h-4 text-text-secondary/80" />
                                <span className="text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Type</span>
                            </div>
                            <div className="flex gap-2">
                                {(['student', 'admin', 'superadmin'] as Role[]).map(role => (
                                    <button
                                        key={role}
                                        onClick={() => {
                                            if (window.confirm(`Are you sure you want to change this user's role to ${role}?`)) {
                                                onRoleChange(role);
                                            }
                                        }}
                                        className={cn(
                                            "flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all tracking-tighter",
                                            u.role === role 
                                                ? "bg-brand-gold-hover text-bg-main shadow-lg shadow-indigo-100" 
                                                : "bg-bg-surface text-text-secondary border border-border-main"
                                        )}
                                    >
                                        {role}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};



const UsersManager = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [preRegistered, setPreRegistered] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<Role | 'all'>('student');
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showGrantModal, setShowGrantModal] = useState<{ user: User, type: 'coins' | 'penalty' | 'xp' | 'gift' } | null>(null);
    const [selectedUserForActions, setSelectedUserForActions] = useState<User | null>(null);

    const [auditingUser, setAuditingUser] = useState<User | null>(null);

    const UserActionModal = ({ u, onClose, onRoleChange }: { u: User, onClose: () => void, onRoleChange: (userId: string, role: Role) => void }) => {
        const { user: currentUser } = useAuth();
        const [assignments, setAssignments] = useState<any[]>([]);
        const [loading, setLoading] = useState(true);
        const [isTerminating, setIsTerminating] = useState(false);

        useEffect(() => {
            const fetchDetails = async () => {
                setLoading(true);
                try {
                    const [subs, enrs, templates] = await Promise.all([
                        dbService.getSubmissionsByStudent(u.id),
                        dbService.getEnrollmentsByStudent(u.id),
                        dbService.getAssignmentTemplates()
                    ]);

                    const aMap: any = {};
                    templates.forEach(t => aMap[t.id] = t);
                    
                    // Build combined list
                    const subList = subs.map((sub: any) => ({
                        id: sub.id,
                        type: 'submission',
                        status: sub.status,
                        score: sub.aiScore,
                        submittedAt: sub.submittedAt,
                        assignment: aMap[sub.assignmentId] || { title: 'Unknown Mission' }
                    }));

                    const missedList = enrs
                        .filter((e: any) => e.status === 'missed')
                        .map((e: any) => ({
                            id: e.id,
                            type: 'missed',
                            status: 'missed',
                            submittedAt: e.updatedAt || e.enrolledAt,
                            assignment: aMap[e.assignmentId] || { title: 'Unknown Mission' }
                        }));

                    const activeRetests = enrs
                        .filter((e: any) => e.status === 'active' && e.graceDeadline && e.graceDeadline > Date.now())
                        .map((e: any) => ({
                            id: e.id,
                            type: 'retest',
                            status: 'retest_active',
                            deadline: e.graceDeadline,
                            submittedAt: e.updatedAt || e.enrolledAt,
                            assignment: aMap[e.assignmentId] || { title: 'Unknown Mission' }
                        }));

                    const all = [...subList, ...missedList, ...activeRetests];
                    all.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
                    setAssignments(all);
                } catch (err) {
                    console.error(err);
                    toast.error("Failed to load user details");
                } finally {
                    setLoading(false);
                }
            };
            fetchDetails();
        }, [u.id]);

        return (
            <div className="fixed inset-0 bg-text-primary/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-bg-surface rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col focus:outline-none max-h-[90vh]"
                >
                    <div className="p-6 md:p-8 border-b border-border-main flex justify-between items-center bg-bg-main">
                        <div>
                            <h2 className="text-xl font-black text-text-primary tracking-tight">{u.name}</h2>
                            <p className="text-xs text-text-secondary/80 font-bold uppercase tracking-widest">{u.role}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-border-main rounded-full transition-colors text-text-secondary">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-6 overflow-y-auto">
                        {/* Compact Actions Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => { onClose(); setShowGrantModal({ user: u, type: 'penalty' }); }} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-rose-500/10 text-rose-600 font-black text-xs gap-2">
                                <ShieldAlert size={20} /> Penalty
                            </button>
                            <button onClick={() => { onClose(); setShowGrantModal({ user: u, type: 'coins' }); }} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-brand-gold/10 text-brand-gold font-black text-xs gap-2">
                                <Coins size={20} /> Grant Coins
                            </button>
                            <button onClick={() => { onClose(); setAuditingUser(u); }} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-brand-gold-secondary-hover text-brand-gold font-black text-xs gap-2">
                                <Eye size={20} /> Audit Trail
                            </button>
                             {u.role === 'student' && (
                                <Link to={`/scorecard/${u.id}`} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-success-green/10 text-emerald-600 font-black text-xs gap-2">
                                    <BarChart3 size={20} /> Analytics
                                </Link>
                             )}
                        </div>

                        {currentUser?.role === 'superadmin' && (
                            <div className="flex items-center justify-between p-4 bg-bg-main rounded-2xl">
                                <span className="font-bold text-sm text-text-primary">Set Role</span>
                                <select 
                                   value={u.role} 
                                   onChange={(e) => onRoleChange(u.id, e.target.value as Role)}
                                   className="bg-bg-surface border border-border-main text-text-primary text-xs font-bold rounded-xl p-2 cursor-pointer"
                                >
                                    <option value="student" className="bg-bg-surface text-text-primary">Student</option>
                                    <option value="admin" className="bg-bg-surface text-text-primary">Admin</option>
                                    <option value="superadmin" className="bg-bg-surface text-text-primary">Superadmin</option>
                                </select>
                            </div>
                        )}
                        
                        <div className="space-y-4">
                            <h3 className="text-sm font-black text-text-primary tracking-tight">Recent Missions</h3>
                            {loading ? (
                                <div className="text-center py-10 font-bold text-text-secondary">Loading assignments...</div>
                            ) : (
                                <div className="space-y-3 max-h-60 overflow-y-auto">
                                    {assignments.length > 0 ? (
                                        assignments.map(item => (
                                            <div key={item.id} className="p-3 bg-bg-main rounded-xl flex items-center justify-between border border-border-main">
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <p className="font-bold text-text-primary text-xs truncate">{item.assignment.title}</p>
                                                    <p className={cn(
                                                        "text-[9px] font-black uppercase tracking-wider mt-0.5",
                                                        item.status === 'missed' ? "text-rose-500" :
                                                        item.status === 'retest_active' ? "text-amber-500" :
                                                        item.status === 'assessed' ? "text-emerald-500" :
                                                        "text-text-secondary/80"
                                                    )}>
                                                        {item.status.replace('_', ' ')}
                                                        {item.deadline && ` • Due ${format(item.deadline, 'MMM dd')}`}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    {item.type === 'submission' ? (
                                                        <>
                                                            <p className="font-black text-sm text-brand-gold">{item.score || 0}</p>
                                                            <p className="text-[9px] uppercase font-bold text-text-secondary/80">Score</p>
                                                        </>
                                                    ) : item.type === 'missed' ? (
                                                        <ShieldAlert className="text-rose-400" size={16} />
                                                    ) : (
                                                        <Clock className="text-amber-400" size={16} />
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-10 text-text-secondary/80 text-xs">No submissions found.</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    {currentUser?.role === 'superadmin' && (
                        <div className="p-6 bg-bg-main border-t border-border-main">
                            {isTerminating ? (
                                <div className="space-y-3">
                                    <p className="text-sm font-black text-rose-600 text-center">Are you sure? This is permanent.</p>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setIsTerminating(false)}
                                            className="flex-1 py-3 rounded-xl bg-border-main text-text-secondary font-bold text-xs"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={async () => {
                                                if (currentUser?.role !== 'superadmin' && u.role === 'superadmin') {
                                                    toast.error("Admins cannot terminate a superadmin!");
                                                    return;
                                                }
                                                try {
                                                    await dbService.deleteUser(u.id);
                                                    toast.success("User eliminated from the system");
                                                    onClose();
                                                    window.location.reload(); 
                                                } catch (err) {
                                                    console.error("Erasure failed:", err);
                                                    toast.error("Erasure failed");
                                                    setIsTerminating(false);
                                                }
                                            }}
                                            className="flex-1 py-3 rounded-xl bg-rose-600 text-bg-main font-black text-xs"
                                        >
                                            Yes, Terminal
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setIsTerminating(true)}
                                    className="w-full py-4 rounded-2xl bg-rose-500/10 text-rose-500 font-black text-xs uppercase tracking-widest hover:bg-rose-500/20 transition-all border border-rose-500/20"
                                >
                                    Terminate Occupant
                                </button>
                            )}
                        </div>
                    )}
                </motion.div>
            </div>
        );
    };


    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const all = await dbService.getAllUsers();
            all.sort((a,b) => {
                if (b.coins !== a.coins) return b.coins - a.coins;
                if ((b.xp || 0) !== (a.xp || 0)) return (b.xp || 0) - (a.xp || 0);
                return a.name.localeCompare(b.name);
            });
            setUsers(all);

            try {
                const { collection, getDocs, getFirestore } = await import('firebase/firestore');
                const db = getFirestore();
                const snap = await getDocs(collection(db, 'pre_registered_users'));
                setPreRegistered(snap.docs.map(d => ({ ...d.data(), id: d.id })));
            } catch (e) {
                console.warn("Could not fetch pre_registered_users", e);
            }
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    const repairNegativeBalances = async () => {
        if (!window.confirm("This will reset all negative coin balances to 0 across the entire system. Continue?")) return;
        setLoading(true);
        try {
            const all = await dbService.getAllUsers();
            const negatives = all.filter(u => (u.coins || 0) < 0);
            
            if (negatives.length === 0) {
                toast.success("No negative balances found!");
                return;
            }
            
            let count = 0;
            for (const u of negatives) {
                await dbService.updateUser(u.id, { coins: 0 });
                count++;
            }
            
            toast.success(`SYSTEM REPAIR COMPLETE: Reset ${count} negative balances to 0.`);
            await fetchUsers();
        } catch (err) {
            console.error("Repair failure:", err);
            toast.error("System repair failed");
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId: string, newRole: Role) => {
        const targetUser = users.find(u => u.id === userId);
        if (currentUser?.role !== 'superadmin' && (targetUser?.role === 'superadmin' || newRole === 'superadmin')) {
            toast.error("Admins cannot manage superadmins");
            return;
        }

        console.log("handleRoleChange called for", userId, "with role", newRole);
        // Optimistically update
        const previousUsers = [...users];
        const previousSelectedUser = selectedUserForActions;
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        if (selectedUserForActions?.id === userId) {
            setSelectedUserForActions(prev => prev ? { ...prev, role: newRole } : null);
        }
        
        try {
            await dbService.updateUser(userId, {
                role: newRole,
                updatedAt: Date.now()
            });
            console.log("Successfully updated User");
            toast.success("Role updated");
        } catch(err: any) {
            console.error("Failed role change:", err);
            toast.error("Role update failed");
            setUsers(previousUsers); // Revert
            setSelectedUserForActions(previousSelectedUser);
        }
    }

    const handleGrantCoins = async (u: User) => {
        if (currentUser?.role !== 'superadmin' && u.role === 'superadmin') {
            toast.error("Admins cannot edit superadmin wallets");
            return;
        }

        const amountStr = prompt(`Grant coins to ${u.name}. Current: ${u.coins}\nEnter positive for grant, negative for fine:`, "100");
        if (!amountStr) return;
        const amount = parseInt(amountStr);
        if (isNaN(amount) || amount === 0) return;

        const reason = prompt("Enter reason for adjustment:", amount > 0 ? "Manual reward" : "Penalty");
        if (reason === null) return;

        try {
            await dbService.adjustUserBalance(u.id, Math.abs(amount), amount < 0, currentUser!.id, reason);
            toast.success(`Wallet adjusted: ${amount > 0 ? '+' : ''}${amount} Coins`);
            await fetchUsers();
        } catch(err: any) {
            console.error(err);
            toast.error("Failed to adjust wallet");
        }
    }

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || 
                             u.email.toLowerCase().includes(search.toLowerCase());
        const matchesRole = roleFilter === 'all' || u.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between px-2">
                <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full xs:w-auto md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary/80 w-5 h-5" />
                        <input 
                            type="text" 
                            placeholder="Search students or staff..." 
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-12 pr-6 py-3.5 bg-bg-surface border border-border-main rounded-[24px] shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full xs:w-auto">
                        <Filter className="text-text-secondary w-4 h-4 ml-2 shrink-0" />
                        <select 
                            value={roleFilter} 
                            onChange={e => setRoleFilter(e.target.value as any)}
                            className="flex-1 xs:flex-none bg-bg-surface border border-border-main text-text-primary px-4 py-3 rounded-[24px] shadow-sm outline-none font-bold text-sm cursor-pointer"
                        >
                            <option value="all" className="bg-bg-surface text-text-primary">All Channels</option>
                            <option value="student" className="bg-bg-surface text-text-primary">Students Only</option>
                            <option value="admin" className="bg-bg-surface text-text-primary">Admins Only</option>
                            <option value="superadmin" className="bg-bg-surface text-text-primary">Superadmins</option>
                        </select>
                    </div>
                </div>
                
                {currentUser?.role === 'superadmin' && (
                    <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto mt-4 md:mt-0">
                        <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-2xl mr-2">
                            <span className="text-indigo-400 font-bold text-xs uppercase tracking-widest">Tax Wallet:</span>
                            <span className="text-bg-main font-black bg-indigo-500 px-2 py-0.5 rounded-lg text-sm">{currentUser.taxWallet || 0} Coins</span>
                        </div>
                        <button 
                            onClick={repairNegativeBalances}
                            className="flex items-center justify-center gap-2 bg-rose-500/10 text-rose-600 px-6 py-3.5 rounded-[24px] font-black hover:bg-rose-500/20 transition border border-rose-500/20 text-xs"
                        >
                            <ShieldAlert className="w-4 h-4" /> Reset Negatives
                        </button>
                        <button 
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center justify-center gap-2 bg-brand-gold-hover text-bg-main px-6 py-3.5 rounded-[24px] font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition"
                        >
                            <Plus className="w-5 h-5" /> Add Student
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-bg-surface rounded-[32px] border border-border-main shadow-sm overflow-hidden min-h-[400px]">
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-border-main">
                        <thead className="bg-bg-main/50">
                            <tr>
                                <th className="px-8 py-4 text-left text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Rank/Profile</th>
                                <th className="px-8 py-4 text-left text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Entitlement</th>
                                <th className="px-8 py-4 text-left text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Balance</th>
                                <th className="px-8 py-4 text-left text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Entry Ref</th>
                            </tr>
                        </thead>
                        <tbody className="bg-bg-surface divide-y divide-border-main">
                            {filteredUsers.map(u => (
                                <tr 
                                    key={u.id} 
                                    onClick={() => setSelectedUserForActions(u)} 
                                    className="hover:bg-brand-gold/10 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer group/row border-b border-border-main/30 last:border-0"
                                >
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            {u.role === 'student' ? (
                                                <div className="text-xl font-black text-text-secondary/30 w-8 group-hover/row:text-brand-gold group-hover/row:scale-125 transition-all">
                                                    #{users.filter(x => x.role === 'student').findIndex(x => x.id === u.id) + 1}
                                                </div>
                                            ) : (
                                                <div className="text-xl font-black text-text-secondary/20 w-8 text-center">-</div>
                                            )}
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-bg-main to-border-main flex items-center justify-center text-brand-gold font-bold border border-border-main shadow-sm group-hover/row:scale-110 group-hover/row:rotate-3 transition-transform">
                                                {u.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-text-primary tracking-tight flex items-center gap-2 group-hover/row:text-brand-gold transition-colors">
                                                     {u.name}
                                                    {u.id === currentUser?.id && <span className="bg-brand-gold text-bg-main text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">You</span>}
                                                </div>
                                                <div className="text-[11px] text-text-secondary font-medium">{u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-bg-main text-text-secondary border border-border-main group-hover/row:border-brand-gold/20 group-hover/row:text-brand-gold transition-colors">
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5 font-black text-sm group-hover/row:scale-105 origin-left transition-transform text-brand-gold dark:text-amber-500">
                                                <Coins className="w-3.5 h-3.5 fill-current" />
                                                {u.coins}
                                            </div>
                                            <div className="flex items-center gap-1 font-black text-sm text-cyan-400">
                                                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><path d="M12 2L2 12l10 10 10-10L12 2zm0 17.5L5.5 12 12 5.5l6.5 6.5L12 19.5z"/></svg>
                                                {u.diamonds || 0}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap text-[11px] text-text-secondary font-mono">
                                        {u.inviteCodeUsed || '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden divide-y divide-border-main/30">
                    {filteredUsers.map(u => (
                        <div 
                            key={u.id} 
                            onClick={() => setSelectedUserForActions(u)}
                            className="p-5 active:bg-brand-gold/5 flex items-center justify-between gap-4 transition-all cursor-pointer group"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                {u.role === 'student' && (
                                    <div className="text-xl font-black text-text-secondary/20 w-8 shrink-0 group-hover:text-brand-gold/40 transition-colors">
                                        #{users.filter(x => x.role === 'student').findIndex(x => x.id === u.id) + 1}
                                    </div>
                                )}
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-bg-main to-border-main flex items-center justify-center text-brand-gold font-black text-lg border border-border-main flex-shrink-0 group-hover:scale-110 transition-transform">
                                    {u.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="overflow-hidden">
                                    <div className="text-sm font-black text-text-primary truncate font-display group-hover:text-brand-gold transition-colors">
                                        {u.name}
                                        {u.id === currentUser?.id && <span className="ml-2 bg-brand-gold text-bg-main text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">You</span>}
                                    </div>
                                    <div className="text-[10px] text-text-secondary font-bold uppercase tracking-widest truncate">{u.role} • {u.email}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="text-right">
                                    <div className="flex items-center justify-end gap-1 text-brand-gold dark:text-amber-500 font-black text-sm">
                                        <Coins className="w-3.5 h-3.5 fill-current" />
                                        {u.coins}
                                    </div>
                                    <div className="flex items-center justify-end gap-1 text-cyan-400 font-black text-[10px]">
                                        {u.diamonds || 0} DIA
                                    </div>
                                    <div className="text-[9px] text-text-secondary font-black uppercase tracking-tighter">Balance</div>
                                </div>
                                <ArrowUpRight className="w-4 h-4 text-text-secondary/40 group-hover:text-brand-gold transition-colors" />
                            </div>
                        </div>
                    ))}
                </div>

                {loading && (
                    <div className="py-20 flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-black text-text-secondary/80 uppercase tracking-widest">Scanning System Occupants...</span>
                    </div>
                )}
                
                {!loading && filteredUsers.length === 0 && (
                    <div className="py-20 text-center px-4">
                        <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                        <p className="text-text-secondary/80 font-bold italic">No system occupants found matching criteria.</p>
                    </div>
                )}
            </div>
            
            {preRegistered.length > 0 && (
                <div className="bg-bg-surface rounded-[32px] border border-border-main p-6 shadow-sm overflow-hidden mt-8">
                    <h3 className="text-lg font-black text-text-primary mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-brand-gold" /> Pre-Registered Waitlist ({preRegistered.length})
                    </h3>
                    <div className="text-sm font-medium text-text-secondary/80 mb-4">
                        These users have been added by an Admin but have not yet logged in to claim their account.
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {preRegistered.map(p => (
                            <div key={p.id} className="p-4 bg-bg-main border border-border-main rounded-2xl flex flex-col gap-1 shadow-sm">
                                <div className="font-bold text-text-primary text-sm flex justify-between items-center">
                                    {p.name || 'Unnamed User'}
                                    <span className="text-[10px] font-black uppercase text-text-secondary/70 bg-border-main/50 px-2 py-0.5 rounded flex items-center gap-1">
                                        <Award className="w-3 h-3 text-brand-gold" /> {p.startingCoins || 50}
                                    </span>
                                </div>
                                <div className="text-xs text-text-secondary truncate">{p.email || p.id}</div>
                                <div className="text-[10px] text-text-secondary/60 mt-1 uppercase font-bold tracking-widest">Added via Invite Code</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <>
                {selectedUserForActions && (
                    <UserActionsBottomSheet 
                        u={selectedUserForActions}
                        onClose={() => setSelectedUserForActions(null)}
                        onViewAudit={() => setAuditingUser(selectedUserForActions)}
                        onGrant={() => setShowGrantModal({ user: selectedUserForActions, type: 'coins' })}
                        onPenalty={() => setShowGrantModal({ user: selectedUserForActions, type: 'penalty' })}
                        onRoleChange={(role) => handleRoleChange(selectedUserForActions.id, role)}
                        currentUser={currentUser}
                    />
                )}
            </>

            {showAddModal && (
                <ManualAddStudentModal 
                    onClose={() => setShowAddModal(false)} 
                    onCreated={fetchUsers} 
                />
            )}
            {showGrantModal && (
                <AdminActionModal 
                    u={showGrantModal.user} 
                    initialType={showGrantModal.type}
                    onClose={() => setShowGrantModal(null)} 
                    onSuccess={fetchUsers} 
                />
            )}
            {auditingUser && (
                <TransactionAuditModal 
                    u={auditingUser} 
                    onClose={() => setAuditingUser(null)} 
                />
            )}
        </div>
    )
}

const LeaderboardManager = () => {
    const { user: currentUser } = useAuth();
    const [students, setStudents] = useState<User[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showGrantModal, setShowGrantModal] = useState<{ user: User, type: 'coins' | 'penalty' | 'xp' | 'gift' } | null>(null);

    useEffect(() => { fetchStudents(); }, []);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const users = await dbService.getAllUsers();
            let s = users.filter(u => u.role === 'student');
            s.sort((a,b) => b.coins - a.coins);
            setStudents(s);
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(u => 
        u.name.toLowerCase().includes(search.toLowerCase()) || 
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
                <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary/80 w-5 h-5" />
                    <input 
                        type="text" 
                        placeholder="Search students..." 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-12 pr-6 py-3.5 bg-bg-surface border border-border-main rounded-[24px] shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                    />
                </div>
            </div>

            <div className="bg-bg-surface rounded-[32px] border border-border-main shadow-sm overflow-hidden">
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-border-main">
                        <thead className="bg-bg-main/50">
                            <tr>
                                <th className="px-8 py-4 text-left text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Rank</th>
                                <th className="px-8 py-4 text-left text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Profile</th>
                                <th className="px-8 py-4 text-left text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Balance</th>
                                <th className="px-8 py-4 text-right text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-bg-surface divide-y divide-gray-50">
                            {filteredStudents.map((u, i) => (
                                <tr key={u.id} className="hover:bg-bg-main/50 transition-colors">
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <div className="text-xl font-black text-text-secondary/60">
                                            #{i + 1}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center text-brand-gold font-bold border border-brand-gold/30/50 shadow-sm">
                                                {u.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-text-primary tracking-tight">{u.name}</div>
                                                <div className="text-[11px] text-text-secondary/80 font-medium">{u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5 font-black text-sm text-brand-gold dark:text-amber-500">
                                                <Coins className="w-3.5 h-3.5 fill-current" />
                                                {u.coins}
                                            </div>
                                            <div className="flex items-center gap-1 font-black text-sm text-cyan-400">
                                                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><path d="M12 2L2 12l10 10 10-10L12 2zm0 17.5L5.5 12 12 5.5l6.5 6.5L12 19.5z"/></svg>
                                                {u.diamonds || 0}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap text-right space-x-2">
                                        <button 
                                            onClick={() => setShowGrantModal({ user: u, type: 'coins' })}
                                            className="inline-flex items-center gap-1 bg-bg-surface hover:bg-brand-gold/10 text-brand-gold border border-border-main hover:border-brand-gold/30 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
                                        >
                                            <Gift className="w-3 h-3" /> Adjust Wallet
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden divide-y divide-gray-50">
                    {filteredStudents.map((u, i) => (
                        <div key={u.id} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="text-lg font-black text-text-secondary/80 w-8">#{i + 1}</div>
                                <div className="w-10 h-10 rounded-xl bg-brand-gold-secondary-hover text-brand-gold flex items-center justify-center font-black">
                                    {u.name.charAt(0)}
                                </div>
                                <div className="overflow-hidden max-w-[120px]">
                                    <div className="text-sm font-black text-text-primary truncate">{u.name}</div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-[10px] text-brand-gold font-bold flex items-center gap-1">
                                            <Coins size={10} className="fill-current" /> {u.coins}
                                        </div>
                                        <div className="text-[10px] text-cyan-400 font-bold flex items-center gap-1">
                                            <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="currentColor"><path d="M12 2L2 12l10 10 10-10L12 2zm0 17.5L5.5 12 12 5.5l6.5 6.5L12 19.5z"/></svg>
                                            {u.diamonds || 0}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 flex-shrink-0">
                                <button 
                                    onClick={() => setShowGrantModal({ user: u, type: 'coins' })}
                                    className="bg-brand-gold/10 text-brand-gold px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all text-center"
                                >
                                    Adjust Wallet
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {!loading && filteredStudents.length === 0 && (
                    <div className="px-8 py-12 text-center text-text-secondary italic font-medium">No students found.</div>
                )}
            </div>
            {showGrantModal && (
                <AdminActionModal 
                    u={showGrantModal.user} 
                    initialType={showGrantModal.type}
                    onClose={() => setShowGrantModal(null)} 
                    onSuccess={fetchStudents} 
                />
            )}
        </div>
    );
};

const AdminActionModal = ({ u, onClose, onSuccess, initialType = 'coins' }: { u: User, onClose: () => void, onSuccess: () => void, initialType?: 'coins' | 'gift' | 'xp' | 'penalty' }) => {
    const { user: currentUser } = useAuth();
    const [actionType, setActionType] = useState<'coins' | 'gift' | 'xp' | 'penalty'>(initialType);
    const [amount, setAmount] = useState(initialType === 'penalty' ? '50' : '100');
    const [selectedItem, setSelectedItem] = useState('');
    const [reason, setReason] = useState(initialType === 'penalty' ? 'Rule Violation: Plagiarism' : 'Achievement Reward');
    const [isCustomReason, setIsCustomReason] = useState(false);
    const [loading, setLoading] = useState(false);

    const GIFT_ITEMS = [
        { id: 'frame_neon', label: 'Neon Glow Frame', type: 'frame', duration: 3 },
        { id: 'frame_gold', label: 'Royal Gold Frame', type: 'frame', duration: 7 },
        { id: 'streak_freeze', label: 'Streak Freeze', type: 'one_time', duration: 0 }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (actionType === 'coins' || actionType === 'penalty') {
                const isPenalty = actionType === 'penalty';
                const val = parseInt(amount);
                await dbService.adjustUserBalance(u.id, val, isPenalty, currentUser!.id, reason);
            } else if (actionType === 'xp') {
                const val = parseInt(amount);
                await dbService.adjustUserXP(u.id, val, currentUser!.id, reason);
            } else if (actionType === 'gift') {
                const item = GIFT_ITEMS.find(i => i.id === selectedItem);
                if (!item) throw new Error("Please select an item");
                
                const expiresAt = item.duration > 0 ? Date.now() + (item.duration * 24 * 60 * 60 * 1000) : null;
                const newItem = {
                    id: item.id,
                    label: item.label,
                    type: item.type,
                    grantedAt: Date.now(),
                    expiresAt
                };
                await dbService.grantGift(u.id, newItem, currentUser!.id, reason);
            }

            toast.success("Action processed successfully!");
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error("Failed to process action: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-text-primary/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-bg-surface rounded-[40px] shadow-2xl p-6 md:p-8 max-w-md w-full relative overflow-y-auto max-h-[90vh]"
            >
                <div className="absolute top-0 left-0 w-full h-2 bg-brand-gold-hover"></div>
                <div className="flex justify-between items-start mb-6 mt-2">
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-text-primary tracking-tight leading-tight">Admin Action</h2>
                        <p className="text-[10px] md:text-sm text-text-secondary/80 font-bold uppercase tracking-widest mt-1">On student: {u.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-border-main rounded-full transition-colors text-text-secondary/80 -mr-2 -mt-2">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 p-1 bg-border-main rounded-2xl mb-6">
                    {(['coins', 'penalty', 'xp', 'gift'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => {
                                setActionType(t);
                                if (t === 'penalty') {
                                    setAmount('50');
                                    setReason('Rule Violation');
                                } else if (t === 'coins') {
                                    setAmount('100');
                                    setReason('Achievement Reward');
                                }
                            }}
                            className={cn(
                                "flex-1 min-w-[70px] py-2.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                                actionType === t 
                                    ? (t === 'penalty' ? "bg-rose-500 text-bg-main shadow-lg" : "bg-bg-surface text-brand-gold shadow-sm")
                                    : "text-text-secondary/80 hover:text-text-secondary"
                            )}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {actionType !== 'gift' ? (
                        <>
                            <div>
                                <label className="block text-xs font-black text-text-secondary/80 uppercase tracking-widest mb-2 ml-1">
                                    {actionType === 'penalty' ? 'Penalty Amount' : 'Magnitude'}
                                </label>
                                <div className="relative">
                                    {actionType === 'coins' ? <Coins className="absolute left-6 top-1/2 -translate-y-1/2 text-amber-500 w-6 h-6" /> : 
                                     actionType === 'penalty' ? <ShieldAlert className="absolute left-6 top-1/2 -translate-y-1/2 text-rose-500 w-6 h-6" /> :
                                     <Sparkles className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-gold w-6 h-6" />}
                                    <input 
                                        type="number" 
                                        required 
                                        value={amount} 
                                        onChange={e => {
                                            let val = e.target.value;
                                            if (actionType === 'penalty') {
                                                const nVal = parseInt(val);
                                                if (nVal > 50) val = '50';
                                            }
                                            setAmount(val);
                                        }} 
                                        max={actionType === 'penalty' ? "50" : undefined}
                                        className={cn(
                                            "w-full pl-16 pr-6 py-5 rounded-[24px] outline-none transition-all font-black shadow-inner text-2xl",
                                            actionType === 'penalty' ? "bg-rose-500/10 border-transparent focus:bg-bg-surface focus:border-rose-500 text-rose-600" : "bg-bg-main border-transparent focus:bg-bg-surface focus:border-indigo-500 text-text-primary"
                                        )}
                                    />
                                    {actionType === 'penalty' && <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-rose-400">-</span>}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div>
                            <label className="block text-xs font-black text-text-secondary/80 uppercase tracking-widest mb-2 ml-1">Select Gift Item</label>
                            <div className="grid grid-cols-1 gap-2">
                                {GIFT_ITEMS.map(item => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setSelectedItem(item.id)}
                                        className={cn(
                                            "w-full px-5 py-4 rounded-2xl border-2 transition-all flex items-center justify-between text-left",
                                            selectedItem === item.id ? "bg-brand-gold-secondary-hover border-indigo-500 text-indigo-900" : "bg-bg-surface border-border-main text-text-secondary hover:border-border-main"
                                        )}
                                    >
                                        <div>
                                            <p className="font-bold text-sm">{item.label}</p>
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{item.type} {item.duration > 0 ? `• ${item.duration}d` : ''}</p>
                                        </div>
                                        {selectedItem === item.id && <Check className="text-brand-gold" size={18} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-black text-text-secondary/80 uppercase tracking-widest mb-2 ml-1">Note / Reason</label>
                        {actionType === 'penalty' ? (
                            <select
                                required={!isCustomReason}
                                value={isCustomReason ? "Custom Penalty" : reason}
                                onChange={e => {
                                    if (e.target.value === "Custom Penalty") {
                                        setIsCustomReason(true);
                                        setReason("");
                                    } else {
                                        setIsCustomReason(false);
                                        setReason(e.target.value);
                                    }
                                }}
                                className="w-full px-6 py-4 bg-bg-main border border-transparent rounded-[20px] outline-none focus:bg-bg-surface focus:border-rose-500 transition-all font-bold text-rose-600 shadow-inner appearance-none mb-2"
                            >
                                <option value="Rule Violation: Plagiarism">Rule Violation: Plagiarism</option>
                                <option value="Rule Violation: Inappropriate Behavior">Rule Violation: Inappropriate Behavior</option>
                                <option value="Rule Violation: Late Attendance">Rule Violation: Late Attendance</option>
                                <option value="Rule Violation: Disrespectful Conduct">Rule Violation: Disrespectful Conduct</option>
                                <option value="Rule Violation: Missing Equipment">Rule Violation: Missing Equipment</option>
                                <option value="Rule Violation: Other">Rule Violation: Other</option>
                                <option value="Custom Penalty">Custom (Type below if selected)</option>
                            </select>
                        ) : (
                            <input 
                                required 
                                value={reason} 
                                onChange={e => setReason(e.target.value)} 
                                placeholder="e.g., Competition Winner"
                                className="w-full px-6 py-4 bg-bg-main border border-transparent rounded-[20px] outline-none focus:bg-bg-surface focus:border-indigo-500 transition-all font-bold text-text-primary shadow-inner" 
                            />
                        )}
                        {actionType === 'penalty' && isCustomReason && (
                            <input 
                                required 
                                value={reason} 
                                onChange={e => setReason(e.target.value)} 
                                placeholder="Specify custom penalty reason..."
                                className="w-full px-6 py-4 bg-bg-main border border-transparent rounded-[20px] outline-none focus:bg-bg-surface focus:border-rose-500 transition-all font-bold text-rose-600 shadow-inner" 
                            />
                        )}
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading || (actionType === 'gift' && !selectedItem)}
                        className={cn(
                            "w-full font-black py-5 rounded-[22px] shadow-xl transition-all active:scale-95 disabled:opacity-50 mt-4 h-[68px]",
                            actionType === 'penalty' ? "bg-rose-600 hover:bg-rose-700 text-bg-main shadow-rose-100" : "bg-brand-gold-hover hover:bg-slate-900 text-bg-main shadow-indigo-100"
                        )}
                    >
                        {loading ? 'Processing...' : (actionType === 'penalty' ? 'Confirm Penalty' : 'Confirm Action')}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

const ManualAddStudentModal = ({ onClose, onCreated }: { onClose: () => void, onCreated: () => void }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [coins, setCoins] = useState(100);
    const [role, setRole] = useState<Role>('student');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.includes('@')) {
            toast.error("Invalid email");
            return;
        }

        setLoading(true);
        try {
            const preRegId = email.toLowerCase().replace(/[@.]/g, '_');
            await dbService.savePreRegisteredUser(preRegId, {
                id: preRegId,
                email: email.toLowerCase(),
                name,
                role,
                coins,
                createdAt: Date.now(),
                status: 'pending'
            });

            toast.success("Student pre-registered! They can now log in with this email.");
            onCreated();
            onClose();
        } catch (err: any) {
            toast.error("Failed to add: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-text-primary/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-bg-surface rounded-[40px] shadow-2xl p-8 max-w-md w-full relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-2 bg-brand-gold-hover"></div>
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-text-primary tracking-tight">Add New Student</h2>
                        <p className="text-sm text-text-secondary/80 font-bold uppercase tracking-widest mt-1">Direct Registration</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-border-main rounded-full transition-colors text-text-secondary/80">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-black text-text-secondary/80 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                        <input 
                            required 
                            autoFocus
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            className="w-full px-6 py-4 bg-bg-main border border-transparent rounded-[20px] outline-none focus:bg-bg-surface focus:border-indigo-500 transition-all font-bold text-text-primary shadow-inner" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-text-secondary/80 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                        <input 
                            type="email" 
                            required 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            className="w-full px-6 py-4 bg-bg-main border border-transparent rounded-[20px] outline-none focus:bg-bg-surface focus:border-indigo-500 transition-all font-bold text-text-primary shadow-inner" 
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-text-secondary/80 uppercase tracking-widest mb-2 ml-1">Initial Coins</label>
                            <input 
                                type="number" 
                                required 
                                value={coins} 
                                onChange={e => setCoins(Number(e.target.value))} 
                                className="w-full px-6 py-4 bg-bg-main border border-transparent rounded-[20px] outline-none focus:bg-bg-surface focus:border-indigo-500 transition-all font-black text-brand-gold shadow-inner text-xl" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-text-secondary uppercase tracking-widest mb-2 ml-1">Assigned Role</label>
                            <select 
                                value={role} 
                                onChange={e => setRole(e.target.value as Role)}
                                className="w-full px-6 py-4 bg-bg-main border border-border-main rounded-[20px] outline-none focus:bg-bg-surface focus:border-indigo-500 transition-all font-bold text-text-primary shadow-inner appearance-none h-[62px]"
                            >
                                <option value="student" className="bg-bg-surface text-text-primary">Student</option>
                                <option value="admin" className="bg-bg-surface text-text-primary">Admin</option>
                            </select>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-brand-gold-hover hover:bg-slate-900 text-bg-main font-black py-5 rounded-[22px] shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 mt-4 h-[68px]"
                    >
                        {loading ? 'Processing...' : 'Authorize Registration'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}

const ReviewsManager = () => {
    const { user } = useAuth();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [users, setUsers] = useState<Record<string, User>>({});
    const [assignments, setAssignments] = useState<Record<string, Assignment>>({});
    const [loading, setLoading] = useState(true);
    const [inspectingSub, setInspectingSub] = useState<Submission | null>(null);
    const [processing, setProcessing] = useState(false);
    const [fullViewImage, setFullViewImage] = useState<string | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

    // Editing fields
    const [editScore, setEditScore] = useState(0);
    const [editFeedback, setEditFeedback] = useState('');

    const [view, setView] = useState<'pending' | 'history' | 'retests'>('pending');
    const [activeRetests, setActiveRetests] = useState<any[]>([]);

    useEffect(() => {
        if (view === 'pending') {
            fetchSubmissions();
        } else if (view === 'history') {
            fetchHistory();
        } else if (view === 'retests') {
            fetchRetests();
        }
    }, [view]);

     const fetchRetests = async () => {
        setLoading(true);
        try {
            const [usersList, assignmentsList, enrollmentsList] = await Promise.all([
                dbService.getAllUsers(),
                dbService.getAllAssignments(),
                dbService.getAllEnrollments()
            ]);
            
            const uMap: Record<string, User> = {};
            usersList.forEach(u => uMap[u.id] = u);
            setUsers(uMap);

            const aMap: Record<string, Assignment> = {};
            assignmentsList.forEach(a => aMap[a.id] = a);
            setAssignments(aMap);

            const retests = enrollmentsList
                .filter((e: any) => e.status === 'active' && e.graceDeadline && e.graceDeadline > Date.now());
            
            // Sort by updatedAt desc
            retests.sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0));

            setActiveRetests(retests);
            setSubmissions([]);
        } catch (err: any) {
            toast.error("Failed to load retests");
        } finally {
            setLoading(false);
        }
    };

    const fetchSubmissions = async () => {
        setLoading(true);
        try {
            const subs = await dbService.getAllSubmissions();
            const pending = subs.filter(s => s.status === 'pending_review');
            // Sort by submittedAt desc
            pending.sort((a,b) => b.submittedAt - a.submittedAt);
            setSubmissions(pending);
            await fetchRelations(pending);
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to load submissions");
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const subs = await dbService.getAllSubmissions();
            subs.sort((a,b) => b.submittedAt - a.submittedAt);
            setSubmissions(subs);
            await fetchRelations(subs);
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to load history");
        } finally {
            setLoading(false);
        }
    };

    const fetchRelations = async (subs: Submission[]) => {
        try {
            const studentIds = Array.from(new Set(subs.map(s => s.studentId)));
            const assignmentIds = Array.from(new Set(subs.map(s => s.assignmentId)));

            if (studentIds.length > 0) {
               const allUsers = await dbService.getAllUsers();
               const uMap: Record<string, User> = {};
               allUsers.filter(u => studentIds.includes(u.id)).forEach(u => uMap[u.id] = u);
               setUsers(prev => ({ ...prev, ...uMap }));
            }

            if (assignmentIds.length > 0) {
                const allAss = await dbService.getAllAssignments();
                const aMap: Record<string, Assignment> = {};
                allAss.filter(a => assignmentIds.includes(a.id)).forEach(a => aMap[a.id] = a);
                setAssignments(prev => ({ ...prev, ...aMap }));
            }
        } catch (err: any) {
            console.error(err);
        }
    };

    const handleRevokeSubmission = async (sub: Submission) => {
        const amount = prompt("Enter coin penalty amount to deduct (usually the reward amount student got). Student will be notified.", '0');
        if (amount === null) return;
        const penalty = parseInt(amount);

        if (!confirm(`Confirm REVOKE? This will:\n1. Mark submission REJECTED\n2. Deduct ${penalty} Coins as penalty\n3. Set mission to ACTIVE for user.`)) return;
        
        setProcessing(true);
        try {
            await dbService.revokeSubmission(sub.id, penalty, user!.id);
            toast.success("Submission revoked and penalty applied.");
            fetchSubmissions();
            setInspectingSub(null);
        } catch (err) {
            console.error(err);
            toast.error("Failed to revoke submission");
        } finally {
            setProcessing(false);
        }
    };
    const handleGrantResubmission = async (sub: Submission) => {
        if (!confirm("Require student to re-take the mission? Their current submission will be rejected and they must submit again (48-hour grace period).")) return;
        setProcessing(true);
        try {
            const graceDeadline = Date.now() + (48 * 60 * 60 * 1000); 
            await dbService.grantResubmission(sub.id, graceDeadline, user!.id);
            toast.success("Manual Retest Issued (48h Grace)");
            setSubmissions(prev => prev.filter(s => s.id !== sub.id));
            setInspectingSub(null);
        } catch (err) {
            console.error(err);
            toast.error("Failed to grant re-submission");
        } finally {
            setProcessing(false);
        }
    };

    const getBase64 = async (url: string): Promise<string> => {
        // Try direct fetch first (if CORS is open)
        try {
            const directResp = await fetch(url);
            if (directResp.ok) {
                const blob = await directResp.blob();
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const res = reader.result as string;
                        if (res.includes(',')) resolve(res.split(',')[1]);
                        else reject(new Error("Invalid base64"));
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            }
        } catch (e) {
            console.log("Direct fetch failed, trying proxy...", url);
        }

        // Try proxy fallback
        try {
            const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) {
                let msg = "Proxy failed";
                try {
                    const json = await response.json();
                    msg = json.error || msg;
                } catch (e) {}
                throw new Error(msg);
            }
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const res = reader.result as string;
                    if (res.includes(',')) resolve(res.split(',')[1]);
                    else reject(new Error("Invalid base64"));
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (err) {
            throw err;
        }
    };

    const handleAIAnalyze = async (sub: Submission) => {
        setIsAiAnalyzing(true);
        setAiAnalysis(null);
        try {
            // Check localStorage first (admin config) then global if available safely
            const apiKey = localStorage.getItem('gemini_api_key') || (import.meta as any).env?.VITE_GEMINI_API_KEY;
            
            if (!apiKey) {
                toast.error("AI Key missing. Please configure 'gemini_api_key' in Settings.");
                throw new Error("GEMINI_API_KEY found missing in application state.");
            }
            
            const ai = new GoogleGenAI(apiKey);
            
            const imageParts: any[] = [];
            if (sub.attachments) {
                const images = sub.attachments.filter(att => 
                    att.type?.startsWith('image/') || 
                    att.url?.match(/\.(jpeg|jpg|gif|png|webp)/i)
                );

                // Limit to first 4 images to save tokens/time
                for (const att of images.slice(0, 4)) {
                    try {
                        const b64 = await getBase64(att.url);
                        imageParts.push({
                            inlineData: {
                                mimeType: att.type || 'image/jpeg',
                                data: b64
                            }
                        });
                    } catch (e) {
                        console.error("Failed to load image for AI", e);
                    }
                }
            }

            const promptText = `System: You are an expert assignment reviewer. 
Assignment: ${assignments[sub.assignmentId]?.title || 'Unknown'}
Description: ${assignments[sub.assignmentId]?.description || 'No description'}
Student Content: ${sub.content}

Please analyze the student's submission content and the attached evidence images. 

CRITICAL: You MUST provide the result in the following format so the system can parse it:
Suggested Score: [Number between 0-100]
Feedback: [Your concise but detailed feedback here]

Guidelines:
1. Determine if the evidence matches the assignment requirements.
2. Check for potential fraud or recycled content.
3. Provide a recommended score and brief feedback.
Format your response accurately but concisely.`;

            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: { parts: [{ text: promptText }, ...imageParts] }
            });

            const aiText = response.text;
            setAiAnalysis(aiText);
            
            // Auto-parse and set fields for immediate convenience
            const scoreMatch = aiText.match(/Suggested Score:\s*(\d+)/i);
            const feedbackMatch = aiText.match(/Feedback:\s*([\s\S]+)/i);
            
            if (scoreMatch) {
                setEditScore(Number(scoreMatch[1]));
            }
            if (feedbackMatch) {
                setEditFeedback(feedbackMatch[1].trim());
            }

            toast.success("AI Analysis Complete & Synced!");
        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : "AI Analysis failed.");
        } finally {
            setIsAiAnalyzing(false);
        }
    };

    const handleAwardBonus = async (sub: Submission) => {
        const amount = prompt("Enter bonus coin amount to GIFT to student. They will be notified.", '50');
        if (amount === null) return;
        const bonus = parseInt(amount);
        if (isNaN(bonus) || bonus <= 0) return;

        setProcessing(true);
        try {
            await dbService.adjustUserBalance(
                sub.studentId, 
                bonus, 
                false, 
                user!.id, 
                "Special Bonus Awarded"
            );

            toast.success(`GIFT of ${bonus} coins sent!`);
        } catch (err) {
            console.error(err);
            toast.error("Failed to award bonus");
        } finally {
            setProcessing(false);
        }
    };

    const handleApprove = async (sub: Submission) => {
        if (!user) return;
        setProcessing(true);
        try {
            const finalScore = inspectingSub?.id === sub.id ? editScore : sub.aiScore;
            const finalFeedback = inspectingSub?.id === sub.id ? editFeedback : sub.aiFeedback;

            await dbService.assessSubmission(sub.id, finalScore, finalFeedback, user.id);
            
            toast.success(`Assessment completed successfully.`);
            setInspectingSub(null);
            fetchSubmissions();
        } catch (err: any) {
            toast.error("Approval failed: " + err.message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="space-y-6 px-2">
            <div className="flex gap-4 mb-8">
                <button 
                    onClick={() => setView('pending')}
                    className={cn(
                        "flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                        view === 'pending' ? "bg-brand-gold-hover text-bg-main shadow-lg" : "bg-bg-surface text-text-secondary border border-border-main"
                    )}
                >
                    <Clock size={16} /> Pending Review
                </button>
                <button 
                    onClick={() => setView('history')}
                    className={cn(
                        "flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                        view === 'history' ? "bg-brand-gold-hover text-bg-main shadow-lg" : "bg-bg-surface text-text-secondary border border-border-main"
                    )}
                >
                    <Clock size={16} /> Audit History
                </button>
                <button 
                    onClick={() => setView('retests')}
                    className={cn(
                        "flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                        view === 'retests' ? "bg-amber-600 text-bg-main shadow-lg" : "bg-bg-surface text-text-secondary border border-border-main"
                    )}
                >
                    <RotateCcw size={16} /> Retest Tracking
                </button>
            </div>

            <div className="bg-bg-surface rounded-[32px] border border-border-main shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-black text-text-primary tracking-tight">
                            {view === 'pending' ? 'Manual Review Queue' : view === 'history' ? 'Submission History' : 'Active Retest Requests'}
                        </h3>
                        <p className="text-sm font-medium text-text-secondary/80">
                            {view === 'pending' ? 'Validate student submissions before points are allocated' : 
                             view === 'history' ? 'A complete log of all mission attempts' : 
                             'Students who have been granted a re-submission period'}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <span className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider",
                            view === 'pending' ? "bg-rose-500/10 text-rose-600" : 
                            view === 'history' ? "bg-brand-gold-secondary-hover text-brand-gold" :
                            "bg-brand-gold/10 text-brand-gold"
                        )}>
                            <Clock size={16} className={cn(view === 'pending' && "animate-pulse")} /> 
                            {view === 'retests' ? activeRetests.length : submissions.length} {view === 'pending' ? 'Pending Approval' : view === 'retests' ? 'Active Grace Periods' : 'Total Entries'}
                        </span>
                    </div>
                </div>
                
                <div className="bg-bg-surface rounded-[40px] border border-border-main shadow-sm overflow-hidden">
                    {/* Desktop View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-full divide-y divide-border-main">
                        <thead className="bg-bg-main/50">
                            <tr>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Student</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Mission</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">AI Result</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Submitted</th>
                                <th className="px-8 py-5 text-right text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {view === 'retests' ? (
                                activeRetests.map(enr => (
                                    <tr key={enr.id} className="hover:bg-brand-gold/10/30 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="font-bold text-text-primary">{users[enr.studentId]?.name || 'Loading...'}</div>
                                            <div className="text-[10px] text-text-secondary/80 font-mono">{enr.studentId.slice(0, 12)}</div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="font-bold text-brand-gold">{assignments[enr.assignmentId]?.title || 'Loading...'}</div>
                                            <div className="text-[10px] text-text-secondary/80 font-medium">Mission #{assignments[enr.assignmentId]?.missionNumber || '??'}</div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="bg-brand-gold/10 text-brand-gold px-3 py-1.5 rounded-xl inline-flex flex-col items-start border border-amber-100 shadow-sm">
                                                <span className="text-[10px] font-black uppercase">Grace Deadline</span>
                                                <span className="text-sm font-black tracking-tight">{format(enr.graceDeadline, 'MMM dd, p')}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-xs text-text-secondary font-medium tracking-tight">
                                            -
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-brand-gold/10 text-brand-gold border-amber-100">
                                                Active Retest
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                submissions.map(sub => (
                                    <tr key={sub.id} className="hover:bg-bg-main/50 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="font-bold text-text-primary">{users[sub.studentId]?.name || 'Loading...'}</div>
                                            <div className="text-[10px] text-text-secondary/80 font-mono">{sub.studentId.slice(0, 12)}</div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="font-bold text-brand-gold">{assignments[sub.assignmentId]?.title || 'Loading...'}</div>
                                            <div className="text-[10px] text-text-secondary/80 font-medium">Mission #{assignments[sub.assignmentId]?.missionNumber || '??'}</div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className={cn(
                                                "text-lg font-black",
                                                sub.aiScore >= 80 ? "text-emerald-500" : sub.aiScore >= 50 ? "text-amber-500" : "text-rose-500"
                                            )}>
                                                {sub.aiScore}<span className="text-xs text-text-secondary/60">/100</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-xs text-text-secondary font-medium tracking-tight">
                                            {format(sub.submittedAt, 'MMM dd, p')}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span className={cn(
                                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                                    sub.status === 'assessed' ? "bg-success-green/10 text-emerald-600 border-success-green/20" :
                                                    sub.status === 'rejected' ? "bg-rose-500/10 text-rose-600 border-rose-500/20" :
                                                    "bg-brand-gold/10 text-brand-gold border-amber-100"
                                                )}>
                                                    {sub.status.replace('_', ' ')}
                                                </span>
                                                <button 
                                                    onClick={() => {
                                                        setInspectingSub(sub);
                                                        setEditScore(sub.aiScore || 0);
                                                        setEditFeedback(sub.aiFeedback || '');
                                                    }}
                                                    className="px-6 py-2.5 bg-brand-gold-hover text-bg-main rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all shadow-sm active:scale-95"
                                                >
                                                    {sub.status === 'pending_review' ? 'Review Work' : 'View Audit'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                            {view !== 'retests' && submissions.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-16 text-center text-text-secondary/80 font-bold italic bg-bg-main/30">
                                        Inbox zero! All submissions have been processed.
                                    </td>
                                </tr>
                            )}
                             {view === 'retests' && activeRetests.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-16 text-center text-text-secondary/80 font-bold italic bg-bg-main/30">
                                        No active retest requests found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile view */}
                <div className="md:hidden divide-y divide-border-main">
                    {submissions.map(sub => (
                        <div key={sub.id} className="p-5 bg-bg-surface active:bg-bg-main transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-brand-gold-secondary-hover text-brand-gold flex items-center justify-center font-black">
                                        {users[sub.studentId]?.name?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-text-primary tracking-tight">{users[sub.studentId]?.name}</h4>
                                        <p className="text-[10px] font-bold text-text-secondary/80 uppercase tracking-widest">{format(sub.submittedAt, 'MMM dd, p')}</p>
                                    </div>
                                </div>
                                <div className={cn(
                                    "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tight border",
                                    sub.status === 'assessed' ? "bg-success-green/10 text-emerald-600 border-success-green/20" :
                                    sub.status === 'rejected' ? "bg-rose-500/10 text-rose-600 border-rose-500/20" :
                                    "bg-brand-gold/10 text-brand-gold border-amber-100"
                                )}>
                                    {sub.status.replace('_', ' ')}
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-[10px] font-black text-text-secondary/80 uppercase tracking-widest mb-1">Mission</p>
                                    <p className="text-xs font-bold text-text-secondary truncate">{assignments[sub.assignmentId]?.title}</p>
                                </div>
                                <div className="text-right ml-4">
                                    <p className="text-[10px] font-black text-text-secondary/80 uppercase tracking-widest mb-1">AI Score</p>
                                    <p className={cn(
                                        "text-sm font-black",
                                        sub.aiScore >= 80 ? "text-emerald-500" : sub.aiScore >= 50 ? "text-amber-500" : "text-rose-500"
                                    )}>{sub.aiScore}%</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => {
                                    setInspectingSub(sub);
                                    setEditScore(sub.aiScore || 0);
                                    setEditFeedback(sub.aiFeedback || '');
                                }}
                                className="w-full mt-4 py-3 bg-brand-gold-hover text-bg-main rounded-2xl font-black text-xs active:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                            >
                                {sub.status === 'pending_review' ? 'Assess Submission' : 'View Audit Details'}
                            </button>
                        </div>
                    ))}
                    {submissions.length === 0 && !loading && (
                        <div className="p-10 text-center text-text-secondary/80 font-bold italic">No submissions to display.</div>
                    )}
                </div>
            </div>

        </div>

        <>
                {inspectingSub && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 bg-text-primary/60 backdrop-blur-md z-[120] flex items-center justify-center p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-bg-surface w-full max-w-6xl max-h-[90vh] rounded-[48px] shadow-2xl flex flex-col overflow-hidden border border-border-main"
                        >
                            
                            {/* Modal Header */}
                            <div className="px-6 py-6 md:px-12 md:py-10 bg-brand-gold-hover text-bg-main flex items-center justify-between shrink-0 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-bg-surface/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
                                <div className="relative z-10 flex-1 overflow-hidden">
                                    <div className="flex items-center gap-3 md:gap-4 mb-1 md:mb-2">
                                        <div className="p-2 md:p-3 bg-bg-surface/10 rounded-xl md:rounded-2xl backdrop-blur-sm">
                                            <GraduationCap size={20} className="text-indigo-100 md:w-6 md:h-6" />
                                        </div>
                                        <h2 className="font-black text-xl md:text-3xl tracking-tighter truncate">Assessment Center</h2>
                                    </div>
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <p className="hidden md:block text-[11px] font-black uppercase opacity-70 tracking-widest">Reviewing submission for</p>
                                        <span className="bg-bg-surface/20 px-3 py-1 rounded-xl text-[10px] md:text-[11px] font-black truncate max-w-[200px]">{users[inspectingSub.studentId]?.name || 'Unknown User'}</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => {
                                        setInspectingSub(null);
                                        setAiAnalysis(null);
                                    }} 
                                    className="p-3 md:p-5 hover:bg-bg-surface/10 rounded-2xl md:rounded-3xl transition-all active:scale-95 group relative z-10"
                                >
                                    <X size={24} className="group-hover:rotate-90 transition-transform duration-300 md:w-7 md:h-7" />
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar space-y-8 md:space-y-12 pb-24 md:pb-12">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-16">
                                    {/* Left Column: Evidence & Content */}
                                    <div className="lg:col-span-7 space-y-8 md:space-y-12">
                                        {/* Security Alerts Integrated */}
                                        {((inspectingSub.tabSwitches && inspectingSub.tabSwitches > 0) || (inspectingSub.pasteCount && inspectingSub.pasteCount > 0)) && (
                                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-[32px] p-6 md:p-8 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600 opacity-[0.03] rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-1000" />
                                                <div className="flex items-center gap-4 text-rose-600 font-black mb-4">
                                                    <div className="p-2 bg-rose-500/20 rounded-xl">
                                                        <ShieldAlert size={20} />
                                                    </div>
                                                    <span className="text-[10px] uppercase tracking-[0.2em] font-black">Security Anomaly Detected</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 relative z-10">
                                                    {inspectingSub.tabSwitches && inspectingSub.tabSwitches > 0 && (
                                                        <div className="bg-bg-surface/80 backdrop-blur-sm p-4 rounded-2xl border border-rose-500/20/50">
                                                            <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Window Events</p>
                                                            <p className="text-lg font-black text-rose-600">{inspectingSub.tabSwitches} <span className="text-[9px]">switches</span></p>
                                                        </div>
                                                    )}
                                                    {inspectingSub.pasteCount && inspectingSub.pasteCount > 0 && (
                                                        <div className="bg-bg-surface/80 backdrop-blur-sm p-4 rounded-2xl border border-rose-500/20/50">
                                                            <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Clipboard Paste</p>
                                                            <p className="text-lg font-black text-rose-600">{inspectingSub.pasteCount} <span className="text-[9px]">injections</span></p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Statement */}
                                        <div className="space-y-4 md:space-y-5">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-[10px] md:text-[11px] font-black text-text-secondary/80 uppercase tracking-[0.2em] flex items-center gap-2">
                                                    <Target size={14} /> Student Statement
                                                </h3>
                                                <span className="text-[9px] md:text-[10px] text-text-secondary/60 font-bold tracking-widest uppercase">
                                                    Words: {inspectingSub.content?.split(/\s+/).length || 0}
                                                </span>
                                            </div>
                                            <div className="bg-bg-main/50 border border-border-main rounded-[24px] md:rounded-[40px] p-6 md:p-10 text-text-secondary font-medium leading-relaxed whitespace-pre-wrap shadow-inner relative min-h-[150px] md:min-h-[250px]">
                                                <div className="absolute top-8 right-8 opacity-[0.03] pointer-events-none hidden md:block">
                                                    <Copy size={64} />
                                                </div>
                                                {inspectingSub.content || "No written statement provided."}
                                            </div>
                                        </div>
                                        
                                        {/* Visual Proof */}
                                        {inspectingSub.attachments && inspectingSub.attachments.length > 0 && (
                                            <div className="space-y-4 md:space-y-6">
                                                <h3 className="text-[10px] md:text-[11px] font-black text-text-secondary/80 uppercase tracking-[0.2em] flex items-center gap-2">
                                                    <ImageIcon size={14} /> Evidence Vault
                                                </h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                                    {inspectingSub.attachments.map((att, i) => {
                                                        const isImage = att.type?.startsWith('image/') || 
                                                                       att.url?.match(/\.(jpeg|jpg|gif|png|webp)/i);
                                                        
                                                        return (
                                                            <div key={i} className="group flex flex-col gap-2 md:gap-3">
                                                                 {isImage && (
                                                                    <div className="w-full aspect-video rounded-[24px] md:rounded-[32px] overflow-hidden border border-border-main shadow-lg bg-bg-surface p-1.5 md:p-2">
                                                                        <div className="w-full h-full rounded-[18px] md:rounded-[24px] overflow-hidden relative">
                                                                            <img 
                                                                                src={att.url} 
                                                                                alt={att.name} 
                                                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 cursor-zoom-in"
                                                                                onClick={() => setFullViewImage(att.url)}
                                                                            />
                                                                            <div className="absolute inset-0 bg-brand-gold-hover/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                                                <div className="bg-bg-surface/20 backdrop-blur-md p-2 md:p-3 rounded-xl md:rounded-2xl">
                                                                                    <Eye className="text-bg-main" size={24} />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                <a 
                                                                    href={att.url} 
                                                                    target="_blank" 
                                                                    rel="noreferrer" 
                                                                    className="flex items-center gap-3 md:gap-4 p-4 md:p-5 bg-bg-surface border border-border-main rounded-[20px] md:rounded-[28px] hover:border-brand-gold/30 hover:shadow-xl hover:shadow-indigo-50 transition-all group overflow-hidden"
                                                                >
                                                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-gold-secondary-hover rounded-xl md:rounded-2xl flex items-center justify-center text-brand-gold shrink-0 group-hover:bg-brand-gold-hover group-hover:text-bg-main transition-all duration-300">
                                                                        <ImageIcon size={18} />
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-[11px] md:text-xs font-bold text-text-primary truncate">
                                                                            {att.name.length > 25 ? att.name.substring(0, 25) + '...' : att.name}
                                                                        </p>
                                                                        <p className="text-[9px] md:text-[10px] text-text-secondary/80 uppercase font-black tracking-widest">{att.type?.split('/')[1] || 'FILE'}</p>
                                                                    </div>
                                                                    <ArrowUpRight size={16} className="text-text-secondary/60 group-hover:text-brand-gold transition-all group-hover:translate-x-1 group-hover:-translate-y-1" />
                                                                </a>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Column: Assessment Tools */}
                                    <div className="lg:col-span-5 space-y-8 md:space-y-12">
                                        {/* Intelligence Core */}
                                        <div className="space-y-4 md:space-y-6">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                                <h3 className="text-[10px] md:text-[11px] font-black text-brand-gold uppercase tracking-[0.2em] flex items-center gap-2">
                                                    <BrainCircuit size={14} /> Intelligence Core
                                                </h3>
                                                <button 
                                                    onClick={() => handleAIAnalyze(inspectingSub)}
                                                    disabled={isAiAnalyzing}
                                                    className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-3 bg-brand-gold-hover text-bg-main rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-xl shadow-indigo-100 active:scale-95"
                                                >
                                                    {isAiAnalyzing ? (
                                                        <BrainCircuit size={16} className="animate-spin" />
                                                    ) : (
                                                        <Sparkles size={16} />
                                                    )}
                                                    {isAiAnalyzing ? "Analyzing..." : "Gemini AI Scan"}
                                                </button>
                                            </div>

                                            {aiAnalysis ? (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 15 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="bg-indigo-950 text-indigo-100/90 p-8 md:p-10 rounded-[32px] md:rounded-[40px] relative border border-indigo-800 shadow-2xl overflow-hidden group"
                                                >
                                                    <div className="absolute top-0 right-0 w-32 h-32 md:w-48 md:h-48 bg-bg-surface/5 rounded-full -mr-16 -mt-16 md:-mr-24 md:-mt-24 blur-3xl opacity-50" />
                                                    <div className="text-xs md:text-sm font-medium leading-relaxed italic prose prose-invert max-w-none relative z-10 prose-p:my-2">
                                                        <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                                                    </div>
                                                    <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-white/10 flex justify-end relative z-10">
                                                        <button 
                                                            onClick={() => {
                                                                const scoreMatch = aiAnalysis.match(/(?:Suggested Score|Score):\s*(\d+)/i);
                                                                if (scoreMatch) setEditScore(Number(scoreMatch[1]));
                                                                
                                                                const feedbackMatch = aiAnalysis.match(/(?:Feedback|Remark):\s*([\s\S]+)/i);
                                                                if (feedbackMatch) {
                                                                    setEditFeedback(feedbackMatch[1].trim());
                                                                } else {
                                                                    setEditFeedback(prev => aiAnalysis + "\n\n---\n" + prev);
                                                                }
                                                                
                                                                toast.success("AI Insights Synced!");
                                                            }}
                                                            className="text-[10px] font-black text-indigo-300 hover:text-bg-main uppercase tracking-[0.2em] transition-all flex items-center gap-2 group/btn"
                                                        >
                                                            <Plus size={16} className="group-hover/btn:rotate-90 transition-transform" /> Sync to Grader
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            ) : (
                                                <div className="bg-brand-gold-secondary-hover/30 border-2 border-dashed border-brand-gold/20 rounded-[32px] p-8 md:p-12 flex flex-col items-center justify-center text-center gap-4">
                                                    <div className="w-16 h-16 bg-bg-surface rounded-3xl flex items-center justify-center text-indigo-200 border border-indigo-50 shadow-sm">
                                                        <BrainCircuit size={32} />
                                                    </div>
                                                    <p className="text-[11px] font-black uppercase text-indigo-300 tracking-[0.2em]">Automatic Insight Pending</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Assessment Parameters */}
                                        <div className="space-y-6">
                                            <h3 className="text-[11px] font-black text-text-secondary/80 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <Award size={14} /> Evaluation
                                            </h3>
                                            <div className="grid grid-cols-1 gap-6">
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[9px] font-black text-text-secondary/80 uppercase tracking-widest ml-1">Override Score (0-100)</label>
                                                        {(() => {
                                                            // Find highest min that is <= editScore
                                                            const sortedGrades = Object.entries(GRADE_REWARDS).sort((a,b) => b[1].min - a[1].min);
                                                            const gradeInfo = sortedGrades.find(([_, info]) => editScore >= info.min);
                                                            
                                                            if (!gradeInfo) return null;
                                                            const [grade, info] = gradeInfo;
                                                            return (
                                                                <div className={cn("px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-tight flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2", info.bg, info.color)}>
                                                                    Result: Grade {grade} ({info.multiplier > 0 ? `${Math.round(info.multiplier*100)}% Coins` : 'XP Only'})
                                                                </div>
                                                            );
                                                        })()}
                                                        <div className="flex gap-2">
                                                            {[25, 50, 75, 100].map(v => (
                                                                <button key={v} onClick={() => setEditScore(v)} className="px-2 py-0.5 bg-bg-main hover:bg-brand-gold-secondary-hover rounded-lg text-[9px] font-black text-text-secondary/80 hover:text-brand-gold transition-all border border-transparent hover:border-brand-gold/20">
                                                                    {v}%
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="relative">
                                                        <input 
                                                            type="number" 
                                                            max="100" 
                                                            min="0"
                                                            value={editScore}
                                                            onChange={e => setEditScore(Number(e.target.value))}
                                                            className="w-full px-8 py-5 bg-bg-main border-2 border-transparent rounded-[24px] md:rounded-[32px] font-black text-2xl focus:bg-bg-surface focus:border-indigo-600 transition-all outline-none"
                                                        />
                                                        <div className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-200 font-black text-xl">%</div>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <label className="text-[9px] font-black text-text-secondary/80 uppercase tracking-widest ml-1">Feedback Report</label>
                                                    <textarea 
                                                        value={editFeedback}
                                                        onChange={e => setEditFeedback(e.target.value)}
                                                        placeholder="Constructive feedback here..."
                                                        className="w-full px-8 py-6 bg-bg-main border-2 border-transparent rounded-[24px] md:rounded-[32px] font-medium text-sm focus:bg-bg-surface focus:border-indigo-600 transition-all outline-none h-40 md:h-48 resize-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-4 pt-4">
                                            <button 
                                                onClick={() => handleApprove(inspectingSub)}
                                                disabled={processing}
                                                className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-bg-main rounded-[24px] md:rounded-[32px] font-black text-md shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
                                            >
                                                {processing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={24} />}
                                                Confirm Assessment
                                            </button>
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <button 
                                                    onClick={() => handleRevokeSubmission(inspectingSub)}
                                                    disabled={processing}
                                                    className="py-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-[24px] md:rounded-[32px] font-black text-[10px] uppercase tracking-widest transition-all border border-rose-500/20 active:scale-[0.98] disabled:opacity-50"
                                                >
                                                    Revoke
                                                </button>
                                                <button 
                                                    onClick={() => handleGrantResubmission(inspectingSub)}
                                                    disabled={processing}
                                                    className="py-4 bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold rounded-[24px] md:rounded-[32px] font-black text-[10px] uppercase tracking-widest transition-all border border-amber-100 active:scale-[0.98] disabled:opacity-50"
                                                >
                                                    Retest
                                                </button>
                                            </div>

                                            <button 
                                                onClick={() => handleAwardBonus(inspectingSub)}
                                                disabled={processing}
                                                className="w-full py-4 bg-brand-gold-secondary-hover hover:bg-brand-gold-secondary-hover text-brand-gold rounded-[24px] md:rounded-[32px] font-black text-[10px] uppercase tracking-widest transition-all border border-brand-gold/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                <Coins size={16} /> Issue Bonus
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </>

            {/* Lightbox for Evidence Images */}
            <>
                {fullViewImage && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-[100] bg-text-primary/95 flex items-center justify-center p-4 cursor-zoom-out"
                        onClick={() => setFullViewImage(null)}
                    >
                        <button className="absolute top-8 right-8 text-bg-main/40 hover:text-bg-main transition-colors">
                            <X size={32} />
                        </button>
                        <motion.img 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            src={fullViewImage}
                            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        />
                    </motion.div>
                )}
            </>
        </div>
    );
};

const SettingsManager = () => {
    const [mobileNumber, setMobileNumber] = useState('');
    const [payeeName, setPayeeName] = useState('Lumina');
    const [paymentLink, setPaymentLink] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        dbService.getPlatformSettings().then(settings => {
            if (settings) {
                setMobileNumber(settings.mobileNumber || '');
                setPayeeName(settings.payeeName || 'Lumina');
                setPaymentLink(settings.paymentLink || '');
            }
        });
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await dbService.updatePlatformSettings({
                mobileNumber,
                payeeName,
                paymentLink,
                updatedAt: Date.now()
            });
            toast.success('System parameters updated!');
        } catch(err) {
            console.error(err);
            toast.error('Failed to save settings');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-bg-surface rounded-[40px] border border-border-main shadow-sm p-10 mt-6 max-w-2xl mx-auto text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
                <div className="bg-slate-100 p-3 rounded-2xl">
                    <Settings className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                   <h2 className="text-2xl font-black text-text-primary tracking-tight">System Core</h2>
                   <p className="text-sm text-text-secondary/80 font-medium tracking-tight">Global platform variables and payment logic</p>
                </div>
            </div>
            
            <form onSubmit={handleSave} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-text-secondary/80 uppercase tracking-widest mb-1 ml-1 text-left">Entity Payee Name</label>
                        <input 
                          type="text" 
                          value={payeeName} 
                          onChange={e => setPayeeName(e.target.value)} 
                          placeholder="Lumina Limited" 
                          className="w-full px-6 py-4 bg-bg-main border border-transparent rounded-[20px] outline-none focus:bg-bg-surface focus:border-indigo-500 transition-all font-bold text-text-primary" 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-text-secondary/80 uppercase tracking-widest mb-1 ml-1 text-left">UPI / Gateway ID</label>
                        <input 
                          type="text" 
                          value={mobileNumber} 
                          onChange={e => setMobileNumber(e.target.value)} 
                          placeholder="handle@bank" 
                          className="w-full px-6 py-4 bg-bg-main border border-transparent rounded-[20px] outline-none focus:bg-bg-surface focus:border-indigo-500 transition-all font-bold text-text-primary" 
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="p-5 bg-brand-gold-secondary-hover/50 rounded-3xl border border-brand-gold/20/50">
                        <p className="text-[13px] text-indigo-700 font-medium leading-relaxed text-left">
                            <span className="font-black">Pro Tip:</span> Enter a verified UPI handle (e.g., <code className="bg-brand-gold-secondary-hover px-1.5 py-0.5 rounded text-indigo-900 font-bold">ace@upi</code>) to enable automated intent routing for mobile users.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-text-secondary/80 uppercase tracking-widest mb-1 ml-1 text-left">Redirect Payment URI</label>
                        <input 
                          type="url" 
                          value={paymentLink} 
                          onChange={e => setPaymentLink(e.target.value)} 
                          placeholder="https://razorpay.me/pay_..." 
                          className="w-full px-6 py-4 bg-bg-main border border-transparent rounded-[20px] outline-none focus:bg-bg-surface focus:border-indigo-500 transition-all font-bold text-text-primary" 
                        />
                        <p className="text-[11px] text-text-secondary/80 font-medium ml-1 text-left">External checkout URL for secondary redundancy.</p>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-50">
                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="w-full bg-brand-gold-hover hover:bg-slate-900 text-bg-main font-black px-10 py-5 rounded-[22px] disabled:opacity-50 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                    >
                        {loading ? 'Committing Changes...' : 'Save System State'}
                    </button>
                    <p className="text-center text-[10px] text-text-secondary/80 font-black uppercase tracking-widest mt-6">
                        Authorized Operation: {payeeName} Deployment
                    </p>
                </div>
            </form>
        </div>
    )
}
