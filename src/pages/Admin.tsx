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
const AdminAnalytics = React.lazy(() => import('./AdminAnalytics').then(m => ({ default: m.AdminAnalytics })));

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
        { id: 'analytics', label: 'Analytics', icon: BarChart3 }, // Added this
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

    const visibleTabs = ALL_TABS.filter(t => t.id !== 'settings' || isSuperAdmin);

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
            </div>

            {/* Premium Mobile-Responsive Scrollable Operational Navigation Bar */}
            <div className="border-b border-white/[0.06] pb-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
                <nav className="flex gap-2 min-w-max" aria-label="Admin Operations Navigation">
                    {visibleTabs.map((item) => {
                        const IconComponent = item.icon;
                        const isActive = tab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setTab(item.id)}
                                className={`group relative flex items-center gap-2.5 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border ${
                                    isActive
                                        ? 'text-brand-gold bg-brand-gold/10 border-brand-gold/30 shadow-[0_0_15px_rgba(212,175,55,0.05)]'
                                        : 'text-text-muted hover:text-white bg-white/[0.01] hover:bg-white/[0.04] border-white/5'
                                }`}
                            >
                                <IconComponent className={`w-3.5 h-3.5 ${isActive ? 'text-brand-gold' : 'text-text-muted group-hover:text-white transition-colors'}`} />
                                <span>{item.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeAdminTabIndicator"
                                        className="absolute bottom-[-9px] left-0 right-0 h-[2px] bg-brand-gold"
                                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </nav>
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
                    {tab === 'analytics' && (
                        <React.Suspense fallback={
                            <div className="bg-bg-surface p-12 text-center rounded-[2rem] border border-border-main shadow-sm flex flex-col items-center justify-center min-h-[300px]">
                                <div className="w-12 h-12 border-4 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin mb-4"></div>
                                <p className="text-text-secondary font-bold animate-pulse">Synchronizing Neural Core Analytics...</p>
                            </div>
                        }>
                            <AdminAnalytics />
                        </React.Suspense>
                    )}
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
