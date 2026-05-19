import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { 
  userService, 
  assignmentService, 
  adminService 
} from "../services/dbProvider";
import { Assignment, Enrollment } from "../types";
import { Link, Navigate } from "react-router-dom";
import { toast } from 'react-hot-toast';
import { 
  ArrowRight,
  BookOpen,
  Trophy,
  Gem,
  Coins,
  Sparkles,
  Send,
  Plus,
  Crown,
  Flame,
  Lock,
  AlertTriangle,
  ZapOff,
  Bell,
  ArrowUpRight,
  Target,
  Search,
  Compass,
  ShoppingBag,
  Settings
} from "lucide-react";
import { AssignmentGroupCard } from "../components/AssignmentGroupCard";
import { CompletedMissionsStack } from "../components/CompletedMissionsStack";
import { ResourceCollector } from "../components/ResourceCollector";
import { TheOracle } from "../components/TheOracle";
import { motion, AnimatePresence } from "motion/react";
import { cn, getUserLevelAndXP, getVIPLevel } from "../lib/utils";
import { DashboardSkeleton, ListSkeleton } from "../components/Skeletons";
import { Card, SectionHeader, Button, EmptyState, animations } from "../components/CommonUI";

import {
  calculatePerformanceScore,
  getPerformanceBadge,
} from "../lib/performance";

import { useAssignments, useStudentEnrollments } from "../hooks/queries/useAssignments";

export const Dashboard = () => {
  const { user, updateResources, isStudent, isAdmin } = useAuth();
  
  const { data: assignments = [], isLoading: isAssignmentsLoading } = useAssignments();
  const { data: studentEnrollments = [], isLoading: isEnrollmentsLoading } = useStudentEnrollments(user?.id);

  const levelData = getUserLevelAndXP(user);
  const { currentLevel, xpCurrent, xpMax, xpProgress, nextRewardLevel } = levelData;
  const sweepPerformed = React.useRef(false);

  const [platformEvents, setPlatformEvents] = useState<any[]>([]);

  const isLoading = isAssignmentsLoading || isEnrollmentsLoading;
  const hasData = assignments.length > 0 || studentEnrollments.length > 0;
  const showSkeleton = isLoading && !hasData;

  useEffect(() => {
    const events = [
      { id: 1, text: "OPERATIONAL: Sector 7 reported 98% efficiency.", icon: "⚡", color: "text-brand-gold" },
      { id: 2, text: "MARKET: Diamond liquidity increased by 4%.", icon: "💎", color: "text-cyan-400" },
      { id: 3, text: "GLOBAL: 'Mesh Theory' protocol in effect.", icon: "🌐", color: "text-indigo-400" },
      { id: 4, text: "SIGNAL: Elite status detected in neural-link.", icon: "🛰️", color: "text-fuchsia-400" },
      { id: 5, text: "SYSTEM: Epoch reset in 48 hours.", icon: "⏳", color: "text-orange-400" }
    ];
    setPlatformEvents(events);
  }, []);

  // Use Admin panel link in navigation instead of forced redirect
  // if (isAdmin) {
  //   return <Navigate to="/admin" replace />;
  // }

  // We'll track the last streak check in memory to prevent dependency loops
  const streakChecked = React.useRef(false);

  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;

    const performSyncTasks = async () => {
       // Throttled sweep - Extra safety check to prevent re-triggered effects
       if (sweepPerformed.current) return;
       sweepPerformed.current = true;

       try {
         const { coinsDeducted } = await adminService.processUserSweep(user.id);
         if (!isMounted) return;
         if (coinsDeducted > 0) {
           toast.error(`Automated penalty applied for missed deadlines: -${coinsDeducted} coins`, { 
             id: 'sweep-penalty',
             style: { background: '#0f172a', color: '#fff', border: '1px solid #ef4444' }
           });
         }
       } catch (e) {
         // Silently fail or log sparingly for sweep
       }

       // Streak check (once per session)
       if (streakChecked.current) return;
       streakChecked.current = true;

       const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
       const today = `${nowIST.getFullYear()}-${String(nowIST.getMonth() + 1).padStart(2, '0')}-${String(nowIST.getDate()).padStart(2, '0')}`;
       
       if (user.lastActive !== today) {
         let newStreak = user.streak || 0;
         if (user.lastActive) {
            const lastDate = new Date(user.lastActive);
            const todayDate = new Date(today);
            const diffDays = Math.ceil(Math.abs(todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) newStreak += 1;
            else if (diffDays > 1) newStreak = 1;
         } else {
            newStreak = 1;
         }
         
         if (isMounted) {
           userService.updateUser(user.id, { streak: newStreak, lastActive: today }).catch(() => {});
         }
       }
    };

    performSyncTasks();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const visibleAssignments = useMemo(() => {
    if (!isStudent) return assignments;
    return assignments.filter(a => {
      if (a.isGlobal) return true;
      return a.allowedStudents?.includes(user!.id) || (user!.email && a.allowedStudents?.includes(user!.email.toLowerCase()));
    });
  }, [assignments, user]);

  const groupedAssignments = useMemo(() => {
    const groups: Record<string, Assignment[]> = {};
    visibleAssignments.forEach((a) => {
      let sKey = a.subject;
      if (!sKey) {
        sKey = (a.title || "Untitled").replace(/ \((Session|Day) \d+\)$/, "");
      }
      if (!sKey) sKey = "General Tasks";

      if (!groups[sKey]) groups[sKey] = [];
      groups[sKey].push(a);
    });

    Object.keys(groups).forEach((k) => {
      groups[k].sort((a, b) => {
        const tA = Number(a.startDate || a.dueDate || 0);
        const tB = Number(b.startDate || b.dueDate || 0);
        return tA - tB;
      });
    });

    return Object.entries(groups)
      .map(([name, items]) => ({ name, items }))
      .slice(0, 3);
  }, [visibleAssignments]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "tween" as const, ease: "easeOut", duration: 0.3 },
    },
  };

  const missedCount = studentEnrollments?.filter(e => e.status === 'missed').length || 0;
  const activeMissions = visibleAssignments?.filter(a => {
      const enr = studentEnrollments?.find(e => e.assignmentId === a.id);
      return !enr || (enr.status === 'active');
  }) || [];
  
  const potentialLoss = activeMissions.reduce((acc, a) => acc + (a.entryFee || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="max-w-7xl mx-auto space-y-4 md:space-y-6 pb-6 px-3 md:px-0"
    >
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row gap-4 md:gap-8 items-start pt-4 md:pt-8">
        <div className="flex-grow space-y-4 md:space-y-6">
          <div className="space-y-2 md:space-y-3">
             <div className="flex items-center gap-3">
               <span className="h-[1px] w-8 md:w-12 bg-brand-gold/30"></span>
               <span className="text-xs font-semibold text-brand-gold tracking-widest uppercase">Strategic Control</span>
             </div>
             <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-text-primary leading-[1]">
                Lumina <span className="text-brand-gold text-glow-gold font-normal">Protocol</span>
             </h1>
             <p className="text-text-secondary font-medium text-sm md:text-lg max-w-2xl border-l-2 border-brand-gold/20 pl-4 py-1.5 opacity-80 leading-relaxed">
               High-stakes academic dominance monitoring. Execute with precision or face liquidation.
             </p>
          </div>
          
          <div className="flex flex-wrap gap-5">
             <div className="bg-white/[0.02] border border-white/5 rounded-3xl px-8 py-5 flex items-center gap-5 transition-all hover:bg-white/[0.04] hover:scale-105 shadow-inner">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                   <Flame size={24} />
                </div>
                <div>
                   <p className="text-xs font-semibold tracking-wide text-text-muted opacity-80 uppercase">Neural Burn Streak</p>
                   <p className="text-3xl font-bold text-text-primary leading-none tabular-nums pt-1">{user?.streak || 0}</p>
                </div>
             </div>
             <div className="bg-white/[0.02] border border-white/5 rounded-3xl px-8 py-5 flex items-center gap-5 transition-all hover:bg-white/[0.04] hover:scale-105 shadow-inner">
                <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 flex items-center justify-center text-brand-gold">
                   <Coins size={24} />
                </div>
                <div>
                   <p className="text-xs font-semibold tracking-wide text-text-muted opacity-80 uppercase">Capital Stockpile</p>
                   <p className="text-3xl font-bold text-text-primary leading-none tabular-nums pt-1">{user?.coins?.toLocaleString() || 0}</p>
                </div>
             </div>
          </div>
        </div>

        <Card
          variant="glass"
          className="w-full lg:w-[400px] p-8 md:p-10 flex flex-col justify-between relative overflow-hidden group border-white/10"
        >
          <div className="absolute top-0 right-0 p-10 opacity-[0.04] group-hover:opacity-[0.08] transition-all duration-700 group-hover:scale-110 group-hover:rotate-12">
             <Gem size={140} />
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-10">
              <span className="text-xs font-semibold text-text-muted pb-1 uppercase tracking-wider">Asset Allocation: Diamonds</span>
              <Gem className="text-brand-gold opacity-80" size={24} />
            </div>
            <div className="text-6xl font-bold text-text-primary tracking-tight mb-4 tabular-nums">
              {user?.diamonds || 0}
            </div>
            <div className="flex items-center gap-3">
               <span className="bg-brand-gold text-bg-main text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Level {currentLevel}</span>
               <div className="h-1 flex-1 bg-white/[0.05] rounded-full overflow-hidden">
                  <div className="h-full bg-brand-gold shadow-glow-gold" style={{ width: `${xpProgress}%` }} />
               </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-10 mt-10 border-t border-white/5 relative z-10">
            <Link to="/assignments?filter=active" className="space-y-2 group/ops">
              <p className="text-xs font-semibold text-text-muted transition-colors opacity-80 uppercase tracking-wide">Operations</p>
              <p className="text-3xl font-bold text-text-primary leading-none tabular-nums group-hover/ops:translate-x-1 transition-transform">{studentEnrollments.filter((e) => e.status === "active").length}</p>
            </Link>
            <Link to="/assignments?filter=completed" className="space-y-2 group/sec text-right">
              <p className="text-xs font-semibold text-text-muted transition-colors opacity-80 uppercase tracking-wide">Secured</p>
              <p className="text-3xl font-bold text-text-primary leading-none tabular-nums group-hover/sec:-translate-x-1 transition-transform">{studentEnrollments.filter((e) => e.status === "submitted" || e.status === "graded").length}</p>
            </Link>
          </div>
        </Card>
      </div>

      {(potentialLoss > 0 || missedCount > 3) && (
        <div className="space-y-6">
          {potentialLoss > 0 && (
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6"
            >
               <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl flex items-center justify-center shrink-0">
                     <AlertTriangle size={32} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-rose-500 uppercase tracking-widest mb-1.5">Liquidation Exposure Alert</h3>
                    <p className="text-sm font-medium text-text-secondary leading-relaxed max-w-xl">
                       System predicts a loss of <span className="font-bold text-rose-400">{potentialLoss} Credits</span> due to deadline degradation. Immediate intervention mandatory.
                    </p>
                  </div>
               </div>
               <Link to="/assignments?filter=active">
                 <Button variant="danger" size="lg" className="w-full sm:w-auto font-bold shadow-lg shadow-rose-500/10">Execute Defense</Button>
               </Link>
            </motion.div>
          )}
        </div>
      )}


      {/* The Oracle AI Strategic Advisor */}
      <TheOracle 
        submissions={studentEnrollments.filter(e => e.status === 'graded')} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <SectionHeader 
            title="Operational Campaigns" 
            action={<Link to="/assignments" className="text-xs font-bold text-brand-gold hover:opacity-80 transition-opacity">View All</Link>}
          />

          <div className="space-y-4">
            {showSkeleton ? (
               <ListSkeleton />
            ) : groupedAssignments.length === 0 ? (
               <EmptyState 
                 icon={Target}
                 title="No Active Missions"
                 description="No active missions found for your current clearance level. Check back soon for new deployments."
               />
            ) : groupedAssignments.map((group) => (
              <AssignmentGroupCard
                key={group.name}
                group={group}
                enrollments={studentEnrollments}
                isStudent={isStudent}
                userId={user?.id}
              />
            ))}
          </div>

          <CompletedMissionsStack />
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="space-y-3">
             <SectionHeader title="Access Control" />
             
             <div className="grid grid-cols-2 gap-3">
               {[
                 { to: "/wallet", icon: Trophy, title: "Vault" },
                 { to: "/leaderboard", icon: Crown, title: "Hall of Fame" },
                 { to: "/shop", icon: ShoppingBag, title: "Shop" },
                 { to: "/profile", icon: Settings, title: "Settings" },
               ].map((action, idx) => (
                 <Link
                   key={idx}
                   to={action.to}
                   className="flex-1"
                 >
                   <Card hover className="flex flex-col items-start p-5 overflow-hidden relative group h-full">
                     <div className="absolute -right-2 -bottom-2 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                        <action.icon size={80} />
                     </div>
                     <div className="p-2.5 bg-navy-800 border border-navy-700/50 rounded-xl group-hover:border-navy-600 text-text-secondary group-hover:text-cyan-400 transition-all mb-4">
                       <action.icon size={20} />
                     </div>
                     <span className="text-xs font-bold text-text-primary uppercase tracking-widest">{action.title}</span>
                   </Card>
                 </Link>
               ))}
             </div>
          </div>

          <div className="pt-4">
             <ResourceCollector />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
