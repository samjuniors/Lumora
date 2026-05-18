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

                {/* Tab Navigation - Desktop */}
                <div className="hidden lg:flex items-center gap-1 bg-bg-surface p-1.5 rounded-[24px] border border-border-main shadow-sm h-fit">
                    {MAIN_TABS.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black transition-all text-xs uppercase tracking-widest ${
                                tab === t.id 
                                    ? 'bg-text-primary text-bg-main shadow-lg translate-y-[-2px]' 
                                    : 'text-text-secondary hover:bg-bg-main hover:text-text-primary'
                            }`}
                        >
                            <t.icon size={16} />
                            {t.label}
                        </button>
                    ))}
                    {isSuperAdmin && (
                        <button
                            onClick={() => setTab('settings')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black transition-all text-xs uppercase tracking-widest ${
                                tab === 'settings' 
                                    ? 'bg-text-primary text-bg-main shadow-lg translate-y-[-2px]' 
                                    : 'text-text-secondary hover:bg-bg-main hover:text-text-primary'
                            }`}
                        >
                            <Settings size={16} />
                            System
                        </button>
                    )}
                </div>

                {/* Mobile Tab Navigation (Horizontal Scroll) */}
                <div className="lg:hidden flex overflow-x-auto no-scrollbar gap-2 pb-2 -mx-4 px-4 sticky top-0 z-40 bg-bg-main/80 backdrop-blur-md">
                    {ALL_TABS.map((t) => (
                        (t.id !== 'settings' || isSuperAdmin) && (
                            <button
                                key={t.id}
                                onClick={() => setTab(t.id)}
                                className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs whitespace-nowrap border ${
                                    tab === t.id 
                                        ? 'bg-text-primary text-bg-main border-text-primary' 
                                        : 'bg-bg-surface text-text-secondary border-border-main'
                                }`}
                            >
                                <t.icon size={14} />
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
