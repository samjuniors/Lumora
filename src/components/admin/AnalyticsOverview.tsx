import React, { useState, useEffect } from 'react';
import { 
    TrendingUp, 
    Sparkles, 
    ShieldCheck, 
    Coins, 
    Zap, 
    Wallet, 
    Bot, 
    GraduationCap, 
    ArrowUpRight, 
    Bell
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    PieChart, 
    Pie, 
    Cell 
} from 'recharts';
import { subDays, format, startOfDay } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { userService, assignmentService, submissionService, walletService, adminService } from '../../services/dbProvider';
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import StatCard from './StatCard';

export const AnalyticsOverview = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalUsers: 0,
        studentCount: 0,
        activeMissions: 0,
        totalSubmissions: 0,
        totalCoins: 0,
        avgScore: 0,
        taxRevenue: 0,
        penaltyVolume: 0,
        rechargeVolume: 0
    });
    const [loading, setLoading] = useState(true);
    const [submissionData, setSubmissionData] = useState<any[]>([]);
    const [economyInsights, setEconomyInsights] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        fetchStats();
    }, []);

    const generateEconomyInsights = async () => {
        setIsAnalyzing(true);
        try {
            const response = await fetch('/api/ai/economy-insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stats })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            setEconomyInsights(data.text);
        } catch (err) {
            console.error(err);
            toast.error("AI Insight failed");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const fetchStats = async () => {
        try {
            setLoading(true);
            const [users, assignments, submissions, transactions, recharges] = await Promise.all([
                userService.getAllUsers(),
                assignmentService.getAllAssignments(),
                submissionService.getAllSubmissions(),
                walletService.getAllTransactions(),
                walletService.getAllRechargeRequests()
            ]);

            const totalCoins = users.reduce((acc, u) => acc + (u.coins || 0), 0);
            const taxRevenue = users.reduce((acc, u) => acc + (u.taxWallet || 0), 0);
            const assessedSubmissions = submissions.filter(s => s.status === 'assessed');
            const avgScore = assessedSubmissions.length > 0 
                ? assessedSubmissions.reduce((acc, s) => acc + s.aiScore, 0) / assessedSubmissions.length 
                : 0;

            const penaltyVolume = transactions
                .filter(t => t.type === 'penalty' || t.type === 'assignment_penalty')
                .reduce((acc, t) => acc + t.amount, 0);
            
            const rechargeVolume = recharges
                .filter(r => r.status === 'approved')
                .reduce((acc, r) => acc + r.amount, 0);

            setStats({
                totalUsers: users.length,
                studentCount: users.filter(u => u.role === 'student').length,
                activeMissions: assignments.length,
                totalSubmissions: submissions.length,
                totalCoins,
                avgScore: Math.round(avgScore),
                taxRevenue,
                penaltyVolume,
                rechargeVolume
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
            {/* Profit Metrics */}
            <div className="bg-[#1A2B48] rounded-[2.5rem] p-8 text-white shadow-2xl border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                                <TrendingUp className="text-brand-gold w-8 h-8" />
                                Platform Revenue
                            </h2>
                            <p className="text-white/60 font-medium text-sm mt-1 uppercase tracking-widest">Global Earnings & Profitability</p>
                        </div>
                        <button 
                            onClick={generateEconomyInsights}
                            disabled={isAnalyzing}
                            className="bg-brand-gold text-bg-main px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-brand-gold/20 flex items-center gap-2"
                        >
                            <Sparkles size={16} />
                            {isAnalyzing ? "Analyzing..." : "AI Economy Suggest"}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 hover:bg-white/10 transition-all group">
                             <p className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-3">Tax Collected (30%)</p>
                             <div className="flex items-center gap-3">
                                <div className="p-3 bg-brand-gold/20 rounded-2xl text-brand-gold">
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <span className="text-2xl font-black text-white flex items-center gap-1 leading-none">
                                        <Coins size={20} className="fill-current" />
                                        {stats.taxRevenue.toLocaleString()}
                                    </span>
                                    <p className="text-[10px] text-brand-gold font-bold mt-1">SUPERADMIN WALLET</p>
                                </div>
                             </div>
                        </div>

                        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 hover:bg-white/10 transition-all group">
                             <p className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-3">Penalty Revenue</p>
                             <div className="flex items-center gap-3">
                                <div className="p-3 bg-rose-500/20 rounded-2xl text-rose-500">
                                    <Zap size={24} />
                                </div>
                                <div>
                                    <span className="text-2xl font-black text-white flex items-center gap-1 leading-none">
                                        <Coins size={20} className="fill-current" />
                                        {stats.penaltyVolume.toLocaleString()}
                                    </span>
                                    <p className="text-[10px] text-rose-400 font-bold mt-1">FROM MISSED TASKS</p>
                                </div>
                             </div>
                        </div>

                        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 hover:bg-white/10 transition-all group">
                             <p className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-3">Gross Sales (Recharges)</p>
                             <div className="flex items-center gap-3">
                                <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-500">
                                    <Wallet size={24} />
                                </div>
                                <div>
                                    <span className="text-2xl font-black text-white leading-none">
                                        ${stats.rechargeVolume.toLocaleString()}
                                    </span>
                                    <p className="text-[10px] text-emerald-400 font-bold mt-1">REAL MONEY VOLUME</p>
                                </div>
                             </div>
                        </div>
                    </div>

                    {economyInsights && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-8 p-6 bg-brand-gold/10 border border-brand-gold/20 rounded-3xl"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <Bot className="text-brand-gold w-5 h-5" />
                                <span className="text-[10px] font-black uppercase text-brand-gold tracking-widest">Gemini Economy Analysis</span>
                            </div>
                            <div className="text-sm font-medium text-indigo-100 prose prose-invert max-w-none">
                                <ReactMarkdown>{economyInsights}</ReactMarkdown>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

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
                                    await adminService.sendBroadcastNotification(msg, user.id);
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

