import React, { useState, useEffect } from 'react';
import { KeyRound, Filter, X, CheckCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/dbProvider';
import { toast } from 'react-hot-toast';
import { InviteCode, Role } from '../../types';
import { cn } from '../../lib/utils';
import { ConfirmModal } from '../ui/ConfirmModal';

export const InviteCodesManager = () => {
    const { user, isSuperAdmin } = useAuth();
    const [codes, setCodes] = useState<InviteCode[]>([]);
    const [loading, setLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<InviteCode | null>(null);
    
    const [newRole, setNewRole] = useState<Role>('student');
    const [newCodeName, setNewCodeName] = useState('');
    const [newMaxUses, setNewMaxUses] = useState<string>('1');

    useEffect(() => { fetchCodes(); }, []);

    const fetchCodes = async () => {
        try {
            const codes = await adminService.getAllInviteCodes();
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
            await adminService.saveInviteCode(finalCode, newCode);
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
        try {
            await adminService.deleteInviteCode(code.code);
            await fetchCodes();
            toast.success("Token burned!");
        } catch(err) {
            console.error(err);
            toast.error("Failed to delete code");
        } finally {
            setShowDeleteConfirm(null);
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
                                {isSuperAdmin && <option value="admin" className="bg-bg-surface text-text-primary">Admin</option>}
                                {isSuperAdmin && <option value="superadmin" className="bg-bg-surface text-text-primary">Superadmin</option>}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary/80">
                                <Filter className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="w-full md:w-auto bg-brand-gold-hover hover:bg-slate-900 text-bg-main font-black px-8 py-3.5 rounded-[18px] disabled:opacity-50 transition-all shadow-lg shadow-indigo-100 active:scale-95"
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
                                            <button onClick={() => setShowDeleteConfirm(code)} className="text-text-secondary/60 hover:text-rose-500 p-2 rounded-xl hover:bg-rose-500/10 transition-all active:scale-90">
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
                                    <button onClick={() => setShowDeleteConfirm(code)} className="p-2 text-rose-400 active:bg-rose-500/10 rounded-xl">
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

            <ConfirmModal 
                isOpen={!!showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(null)}
                onConfirm={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
                title="Burn Entry Token"
                message={`Are you sure you want to permanently delete the invite token "${showDeleteConfirm?.code}"? New students will no longer be able to use it.`}
                confirmText="Burn Token"
                variant="danger"
            />
        </div>
    );
};

