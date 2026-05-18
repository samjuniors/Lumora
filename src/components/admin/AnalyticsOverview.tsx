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
import { motion } from 'motion/react';
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
import { Card, Button } from '../CommonUI';

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
        <div className="space-y-10">
            {/* Profit Metrics */}
            <Card variant="glass" className="p-8 relative overflow-hidden shadow-2xl border-white/[0.03]">
                <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                        <div className="space-y-1">
                            <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3 text-text-primary">
                                <TrendingUp className="text-brand-gold w-8 h-8" />
                                Platform Operations
                            </h2>
                            <p className="text-text-secondary font-bold text-xs uppercase tracking-[0.2em]">Global Revenue & Performance Index</p>
                        </div>
                        <Button 
                            variant="gold"
                            onClick={generateEconomyInsights}
                            isLoading={isAnalyzing}
                            icon={Sparkles}
                            size="md"
                        >
                            AI Economy Insights
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white/[0.03] p-6 rounded-2xl border border-white/5 hover:bg-white/[0.05] transition-all group">
                             <p className="text-[10px] font-black uppercase text-text-muted tracking-[0.2em] mb-4">Tax Yield (30%)</p>
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 flex items-center justify-center bg-brand-gold/10 rounded-xl text-brand-gold border border-brand-gold/20">
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <p className="text-3xl font-black text-text-primary flex items-center gap-1.5 leading-none">
                                        <Coins size={20} className="text-brand-gold/50" />
                                        {stats.taxRevenue.toLocaleString()}
                                    </p>
                                    <p className="text-[10px] text-brand-gold/60 font-bold mt-2 uppercase tracking-wide">Treasury Balance</p>
                                </div>
                             </div>
                        </div>

                        <div className="bg-white/[0.03] p-6 rounded-2xl border border-white/5 hover:bg-white/[0.05] transition-all group">
                             <p className="text-[10px] font-black uppercase text-text-muted tracking-[0.2em] mb-4">Penalty Volume</p>
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 flex items-center justify-center bg-rose-500/10 rounded-xl text-rose-500 border border-rose-500/20">
                                    <Zap size={24} />
                                </div>
                                <div>
                                    <p className="text-3xl font-black text-text-primary flex items-center gap-1.5 leading-none">
                                        <Coins size={20} className="text-rose-500/50" />
                                        {stats.penaltyVolume.toLocaleString()}
                                    </p>
                                    <p className="text-[10px] text-rose-500/60 font-bold mt-2 uppercase tracking-wide">Deadline Enforcement</p>
                                </div>
                             </div>
                        </div>

                        <div className="bg-white/[0.03] p-6 rounded-2xl border border-white/5 hover:bg-white/[0.05] transition-all group">
                             <p className="text-[10px] font-black uppercase text-text-muted tracking-[0.2em] mb-4">Gross Inflow</p>
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 flex items-center justify-center bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
                                    <Wallet size={24} />
                                </div>
                                <div>
                                    <p className="text-3xl font-black text-text-primary flex items-center gap-1 leading-none">
                                        ${stats.rechargeVolume.toLocaleString()}
                                    </p>
                                    <p className="text-[10px] text-emerald-500/60 font-bold mt-2 uppercase tracking-wide">Fiat Converters</p>
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
            </Card>

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
                <Card className="lg:col-span-2 p-8 border-white/[0.03]">
                    <div className="flex justify-between items-center mb-8">
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-text-primary leading-none">Submission Velocity</h3>
                            <p className="text-xs text-text-muted font-medium tracking-wide">Activity recorded over the last 7 days</p>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={submissionData}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.15}/>
                                        <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        borderRadius: '12px', 
                                        backgroundColor: '#0a1027',
                                        borderColor: 'rgba(255,255,255,0.1)',
                                        color: '#f8fafc',
                                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        fontSize: '12px'
                                    }}
                                    itemStyle={{ color: '#fbbf24', fontWeight: 'bold' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="count" 
                                    stroke="#fbbf24" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorCount)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="p-8 border-white/[0.03] flex flex-col">
                    <h3 className="text-lg font-bold text-text-primary leading-none mb-1">System Health</h3>
                    <p className="text-xs text-text-muted font-medium mb-8 uppercase tracking-widest">Network Distribution</p>
                    <div className="flex-grow flex items-center justify-center">
                        <PieChart width={160} height={160}>
                            <Pie
                                data={[
                                    { name: 'Students', value: stats.studentCount },
                                    { name: 'Staff', value: stats.totalUsers - stats.studentCount }
                                ]}
                                cx={80}
                                cy={80}
                                innerRadius={50}
                                outerRadius={70}
                                paddingAngle={8}
                                dataKey="value"
                            >
                                <Cell fill="#fbbf24" stroke="none" />
                                <Cell fill="rgba(255,255,255,0.05)" stroke="none" />
                            </Pie>
                        </PieChart>
                    </div>
                    <div className="space-y-4 mt-8">
                        <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-brand-gold"></div>
                                <span className="text-text-secondary font-bold tracking-wide">Elite Students</span>
                            </div>
                            <span className="font-black text-text-primary">{stats.studentCount}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-white/10"></div>
                                <span className="text-text-secondary font-bold tracking-wide">Command Staff</span>
                            </div>
                            <span className="font-black text-text-primary">{stats.totalUsers - stats.studentCount}</span>
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="p-1 w-full bg-brand-gold relative overflow-hidden group">
                <div className="bg-bg-main p-8 rounded-[14px] flex flex-col md:flex-row gap-8 items-center">
                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-2xl font-black mb-2 flex items-center justify-center md:justify-start gap-4 text-text-primary">
                            <Bell className="text-brand-gold" size={24} /> 
                            Global Transmission
                        </h3>
                        <p className="text-text-secondary text-sm font-medium leading-relaxed">Broadcast high-priority system alerts and mission directives to all student terminals.</p>
                    </div>
                    
                    <div className="w-full md:w-[450px] flex flex-col sm:flex-row gap-3">
                        <div className="flex-grow">
                           <input 
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-5 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-brand-gold/50 transition-all"
                                placeholder="Transmission content..."
                                id="broadcast-input"
                            />
                        </div>
                        <Button 
                            variant="gold"
                            size="md"
                            className="shrink-0 font-black"
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
                        >
                            Execute
                        </Button>
                    </div>
                </div>
            </Card>

        </div>
    );
};

