import React, { useEffect, useState } from 'react';
import { 
  Users as UserIcon, 
  Settings, 
  Target, 
  Zap, 
  Award, 
  BarChart3, 
  UserPlus, 
  Wallet
} from 'lucide-react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';

// Extracted Components
import { AnalyticsOverview } from '../components/admin/AnalyticsOverview';
import { TemplatesManager } from '../components/admin/TemplatesManager';
import { InviteCodesManager } from '../components/admin/InviteCodesManager';
import { UsersManager } from '../components/admin/UsersManager';
import { ReviewsManager } from '../components/admin/ReviewsManager';
import { RechargesManager } from '../components/admin/RechargesManager';
import { SettingsManager } from '../components/admin/SettingsManager';
import { AssignmentsManager } from '../components/admin/AssignmentsManager';
import { AdminAnalytics } from './AdminAnalytics';

export const AdminPanel = () => {
    const { user, isAdmin, isSuperAdmin } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialTab = (searchParams.get('tab') as any) || 'users';
    const [tab, setTabState] = useState<'overview'|'analytics'|'assignments'|'reviews'|'invites'|'users'|'recharges'|'settings'|'templates'|'leaderboard'>(initialTab);

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

    if (!user || !isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    const MAIN_TABS = [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'analytics', label: 'Analytics', icon: Award },
        { id: 'assignments', label: 'Missions', icon: Target },
        { id: 'reviews', label: 'Reviews', icon: Zap },
        { id: 'users', label: 'Users', icon: UserIcon },
        { id: 'recharges', label: 'Economy', icon: Wallet },
    ] as const;

    const ALL_TABS = [
        ...MAIN_TABS,
        { id: 'settings', label: 'System', icon: Settings },
        { id: 'invites', label: 'Invites', icon: UserPlus },
    ] as const;

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-32 pt-6 px-4">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2 border-b border-white/5">
                <div className="space-y-1">
                    <h1 className="text-4xl md:text-5xl font-black text-text-primary tracking-tighter">
                        Platform <span className="text-brand-gold text-glow-gold">Ops</span>
                    </h1>
                    <div className="flex items-center gap-2 text-text-muted font-bold text-[10px] uppercase tracking-widest">
                       Cleared as <span className="text-brand-gold">{user.role}</span> &bull; System Stable
                    </div>
                </div>

                {/* Tab Navigation - Desktop */}
                <div className="hidden lg:flex items-center gap-1 bg-white/[0.03] p-1 rounded-2xl border border-white/5 h-fit">
                    {MAIN_TABS.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all text-[10px] uppercase tracking-widest ${
                                tab === t.id 
                                    ? 'bg-brand-gold text-bg-main shadow-lg shadow-brand-gold/10' 
                                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <t.icon size={13} />
                            {t.label}
                        </button>
                    ))}
                    {isSuperAdmin && (
                        <button
                            onClick={() => setTab('settings')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all text-[10px] uppercase tracking-widest border border-transparent ${
                                tab === 'settings' 
                                    ? 'bg-white text-bg-main shadow-lg' 
                                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Settings size={13} />
                            System
                        </button>
                    )}
                </div>

                {/* Mobile Tab Navigation (Horizontal Scroll) */}
                <div className="lg:hidden flex overflow-x-auto no-scrollbar gap-2 pb-2 -mx-4 px-4">
                    {ALL_TABS.map((t) => (
                        (t.id !== 'settings' || isSuperAdmin) && (
                            <button
                                key={t.id}
                                onClick={() => setTab(t.id)}
                                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest whitespace-nowrap border transition-all ${
                                    tab === t.id 
                                        ? 'bg-brand-gold text-bg-main border-brand-gold' 
                                        : 'bg-white/[0.03] text-text-secondary border-white/5'
                                }`}
                            >
                                <t.icon size={12} />
                                {t.label}
                            </button>
                        )
                    ))}
                </div>
            </div>


            <div className="relative z-10">
                <motion.div 
                    key={tab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full"
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
                    {tab === 'settings' && isSuperAdmin && <SettingsManager />}
                </motion.div>
            </div>
        </div>
    );
};

export default AdminPanel;
