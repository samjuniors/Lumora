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
import { DashboardSkeleton } from "../components/Skeletons";
import { Card, SectionHeader, Button, EmptyState, animations } from "../components/CommonUI";

import {
  calculatePerformanceScore,
  getPerformanceBadge,
} from "../lib/performance";

import { useAssignments, useStudentEnrollments } from "../hooks/queries/useAssignments";

export const Dashboard = () => {
  const { user, updateResources } = useAuth();
  
  const { data: assignments = [], isLoading: isAssignmentsLoading } = useAssignments();
  const { data: studentEnrollments = [], isLoading: isEnrollmentsLoading } = useStudentEnrollments(user?.id);

  const levelData = getUserLevelAndXP(user);
  const { currentLevel, xpCurrent, xpMax, xpProgress, nextRewardLevel } = levelData;
  const sweepPerformed = React.useRef(false);

  const [platformEvents, setPlatformEvents] = useState<any[]>([]);

  const isLoading = isAssignmentsLoading || isEnrollmentsLoading;

  useEffect(() => {
    const events = [
      { id: 1, text: "Avery J. earned an A+ in Physics!", icon: "🎓", color: "text-amber-500" },
      { id: 2, text: "Marcus L. collected 50 Coins!", icon: "⛏️", color: "text-cyan-400" },
      { id: 3, text: "Global Mission: 'Mesh Theory' is active!", icon: "🌐", color: "text-indigo-400" },
      { id: 4, text: "Sarah K. found a 'Rare Badge'!", icon: "💎", color: "text-fuchsia-400" },
      { id: 5, text: "System: Weekly leaderboard reset in 2 days", icon: "⏰", color: "text-orange-400" }
    ];
    setPlatformEvents(events);
  }, []);

  if (user?.role === "admin" || user?.role === "superadmin") {
    return <Navigate to="/admin" replace />;
  }

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
    if (user?.role !== 'student') return assignments;
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
        sKey = a.title.replace(/ \((Session|Day) \d+\)$/, "");
      }
      if (!sKey) sKey = "General Tasks";

      if (!groups[sKey]) groups[sKey] = [];
      groups[sKey].push(a);
    });

    Object.keys(groups).forEach((k) => {
      groups[k].sort((a, b) => {
        const tA = a.startDate || a.dueDate;
        const tB = b.startDate || b.dueDate;
        return tA - tB;
      });
    });

    return Object.entries(groups)
      .map(([name, items]) => ({ name, items }))
      .slice(0, 3);
  }, [visibleAssignments]);

  if (isLoading && visibleAssignments.length === 0) return <DashboardSkeleton />;

  const missedCount = studentEnrollments.filter(e => e.status === 'missed').length;
  const activeMissions = visibleAssignments.filter(a => {
      const enr = studentEnrollments.find(e => e.assignmentId === a.id);
      return !enr || (enr.status === 'active');
  });
  
  const potentialLoss = activeMissions.reduce((acc, a) => acc + (a.entryFee || 0), 0);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    show: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 24 },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto space-y-8 pb-32 px-4"
    >
      {/* Premium Minimal Header */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-4">
        <div className="lg:col-span-8 flex flex-col justify-between space-y-6">
          <div className="space-y-1">
             <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-text-primary">
                The Lumina <span className="text-brand-gold">Terminal</span>
             </h1>
             <p className="text-text-secondary font-medium md:text-lg">Elite academic performance monitoring and mission control.</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
             <div className="bg-navy-900 border border-navy-700/50 rounded-xl px-5 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                   <Flame size={18} />
                </div>
                <div>
                   <div className="text-[10px] uppercase tracking-widest font-black text-text-muted">Daily Streak</div>
                   <div className="text-xl font-black text-text-primary">{user?.streak || 0} Days</div>
                </div>
             </div>
             <div className="bg-navy-900 border border-navy-700/50 rounded-xl px-5 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-gold/10 flex items-center justify-center text-brand-gold">
                   <Coins size={18} />
                </div>
                <div>
                   <div className="text-[10px] uppercase tracking-widest font-black text-text-muted">Lumina Coins</div>
                   <div className="text-xl font-black text-text-primary">{user?.coins?.toLocaleString() || 0}</div>
                </div>
             </div>
          </div>
        </div>

        <Card
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-4 p-6 flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
             <Gem size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">Available Diamonds</span>
              <Gem className="text-cyan-400" size={20} />
            </div>
            <div className="text-5xl font-display font-bold text-text-primary tracking-tighter mb-1">
              {user?.diamonds || 0}
            </div>
            <div className="text-[10px] text-text-secondary font-medium flex items-center gap-1.5">
              Ranked #{user?.rank || '--'} global <ArrowUpRight size={10} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-6 mt-6 border-t border-navy-700/50 relative z-10">
            <Link to="/assignments?filter=active" className="p-4 bg-navy-800 border border-navy-700/50 rounded-xl hover:border-navy-600 transition-colors group">
              <div className="text-[9px] font-black text-text-muted uppercase tracking-wider mb-1">Active</div>
              <div className="text-xl font-black text-brand-gold">{studentEnrollments.filter((e) => e.status === "active").length}</div>
            </Link>
            <Link to="/assignments?filter=completed" className="p-4 bg-navy-800 border border-navy-700/50 rounded-xl hover:border-navy-600 transition-colors group">
              <div className="text-[9px] font-black text-text-muted uppercase tracking-wider mb-1">Done</div>
              <div className="text-xl font-black text-success">{studentEnrollments.filter((e) => e.status === "submitted" || e.status === "graded").length}</div>
            </Link>
          </div>
        </Card>
      </div>

      {(potentialLoss > 0 || missedCount > 3) && (
        <div className="flex flex-col gap-3">
          {potentialLoss > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500 text-white rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-red-500/20">
                     <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-red-500 uppercase tracking-widest">Risk Exposure</h3>
                    <p className="text-sm font-medium text-text-primary">
                       Potential loss of <span className="font-bold text-red-500">{potentialLoss} Coins</span> due to pending deadlines.
                    </p>
                  </div>
               </div>
               <Link to="/assignments?filter=active" className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest">Secure Now</Link>
            </div>
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
            {groupedAssignments.length === 0 ? (
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
                userRole={user?.role}
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
