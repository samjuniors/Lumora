import React, { useState, useEffect } from 'react';
import { 
    Search, 
    Filter, 
    ShieldAlert, 
    Plus, 
    Coins, 
    ArrowUpRight, 
    X, 
    Eye, 
    Gift, 
    BarChart3, 
    Shield, 
    Clock, 
    Award
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { 
    userService, 
    assignmentService, 
    submissionService,
    adminService 
} from '../../services/dbProvider';
import { toast } from 'react-hot-toast';
import { User, Role } from '../../types';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';
import TransactionAuditModal from './TransactionAuditModal';
import AdminActionModal from './AdminActionModal';

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
                        className="flex items-center gap-4 p-5 rounded-3xl bg-brand-gold-secondary-hover/50 hover:bg-brand-gold-secondary-hover border border-brand-gold/20 transition-all text-left group"
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
                        className="flex items-center gap-4 p-5 rounded-3xl bg-brand-gold/10 hover:bg-brand-gold/10 border border-brand-gold/20 transition-all text-left group"
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
                        className="flex items-center gap-4 p-5 rounded-3xl bg-success-green/10 hover:bg-success-green/10 border border-success-green/20 transition-all text-left group"
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

const UserActionModal = ({ 
    u, 
    onClose, 
    onRoleChange,
    setShowGrantModal,
    setAuditingUser
}: { 
    u: User, 
    onClose: () => void, 
    onRoleChange: (userId: string, role: Role) => void,
    setShowGrantModal: (data: { user: User, type: 'coins' | 'penalty' | 'diamonds' | 'gift' } | null) => void,
    setAuditingUser: (user: User | null) => void
}) => {
    const { user: currentUser } = useAuth();
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isTerminating, setIsTerminating] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            try {
                const [subs, enrs, templates] = await Promise.all([
                    submissionService.getSubmissionsByStudent(u.id),
                    assignmentService.getEnrollmentsByStudent(u.id),
                    assignmentService.getAssignmentTemplates()
                ]);

                const aMap: any = {};
                templates.forEach(t => aMap[t.id] = t);
                
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
                                <option value="student">Student</option>
                                <option value="admin">Admin</option>
                                <option value="superadmin">Superadmin</option>
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
                                                await userService.deleteUser(u.id);
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

export const UsersManager = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [preRegistered, setPreRegistered] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<Role | 'all'>('student');
    const [loading, setLoading] = useState(true);
    const [showGrantModal, setShowGrantModal] = useState<{ user: User, type: 'coins' | 'penalty' | 'diamonds' | 'gift' } | null>(null);
    const [selectedUserForActions, setSelectedUserForActions] = useState<User | null>(null);
    const [auditingUser, setAuditingUser] = useState<User | null>(null);

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const all = await userService.getAllUsers();
            all.sort((a,b) => {
                if (b.coins !== a.coins) return b.coins - a.coins;
                if ((b.diamonds || 0) !== (a.diamonds || 0)) return (b.diamonds || 0) - (a.diamonds || 0);
                return a.name.localeCompare(b.name);
            });
            setUsers(all);

            try {
                const preRegSnap = await adminService.getPreRegisteredUsers();
                setPreRegistered(preRegSnap);
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
            const all = await userService.getAllUsers();
            const negatives = all.filter(u => (u.coins || 0) < 0);
            
            if (negatives.length === 0) {
                toast.success("No negative balances found!");
                return;
            }
            
            let count = 0;
            for (const u of negatives) {
                await userService.updateUser(u.id, { coins: 0 });
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

        const previousUsers = [...users];
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        
        try {
            await userService.updateUser(userId, {
                role: newRole,
                updatedAt: Date.now()
            });
            toast.success("Role updated");
        } catch(err: any) {
            console.error("Failed role change:", err);
            toast.error("Role update failed");
            setUsers(previousUsers); 
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
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full sm:w-auto md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary/80 w-5 h-5" />
                        <input 
                            type="text" 
                            placeholder="Search students or staff..." 
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-12 pr-6 py-3.5 bg-bg-surface border border-border-main rounded-[24px] shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Filter className="text-text-secondary w-4 h-4 ml-2 shrink-0" />
                        <select 
                            value={roleFilter} 
                            onChange={e => setRoleFilter(e.target.value as any)}
                            className="flex-1 sm:flex-none bg-bg-surface border border-border-main text-text-primary px-4 py-3 rounded-[24px] shadow-sm outline-none font-bold text-sm cursor-pointer"
                        >
                            <option value="all">All Channels</option>
                            <option value="student">Students Only</option>
                            <option value="admin">Admins Only</option>
                            <option value="superadmin">Superadmins</option>
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

            {auditingUser && (
                <TransactionAuditModal 
                    u={auditingUser} 
                    onClose={() => setAuditingUser(null)} 
                />
            )}

            {showGrantModal && (
                <AdminActionModal 
                    type={showGrantModal.type}
                    u={showGrantModal.user}
                    onClose={() => setShowGrantModal(null)}
                    onComplete={fetchUsers}
                />
            )}
        </div>
    )
}

