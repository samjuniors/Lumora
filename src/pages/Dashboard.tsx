import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { dbService } from "../services/dbProvider";
import { Assignment, Enrollment } from "../types";
import { Link, Navigate } from "react-router-dom";
import { toast } from 'react-hot-toast';
import {
  ArrowRight,
  BookOpen,
  Trophy,
  Gem,
  Sparkles,
  Send,
  Plus,
  Crown,
  Flame,
  Lock,
} from "lucide-react";
import { AssignmentGroupCard } from "../components/AssignmentGroupCard";
import { CompletedMissionsStack } from "../components/CompletedMissionsStack";
import { motion } from "motion/react";
import { cn, getUserLevelAndXP, getVIPLevel } from "../lib/utils";
import { DashboardSkeleton } from "../components/Skeletons";

import {
  calculatePerformanceScore,
  getPerformanceBadge,
} from "../lib/performance";

export const Dashboard = () => {
  const { user, updateUserBalance } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [studentEnrollments, setStudentEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { currentLevel } = getUserLevelAndXP(user);
  const sweepPerformed = React.useRef(false);

  if (user?.role === "admin" || user?.role === "superadmin") {
    return <Navigate to="/admin" replace />;
  }

  useEffect(() => {
    if (user?.id) {
      const checkStreak = async () => {
        const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        const year = nowIST.getFullYear();
        const month = String(nowIST.getMonth() + 1).padStart(2, '0');
        const day = String(nowIST.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;
        
        if (user.lastActive !== today) {
          let newStreak = user.streak || 0;
          let diffDays = 0;
          let missingPenaltyCoins = 0;

          if (user.lastActive) {
            const lastDate = new Date(user.lastActive);
            const todayDate = new Date(today);
            const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
            diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
              newStreak += 1;
            } else if (diffDays > 1) {
              const missedDays = diffDays - 1;
              // Check for streak freeze
              if (user.inventory?.includes('streak_freeze')) {
                const newInventory = [...user.inventory];
                const index = newInventory.indexOf('streak_freeze');
                newInventory.splice(index, 1);
                
                await dbService.updateUser(user.id, {
                  inventory: newInventory
                });
                // Streak stays the same (frozen)
                console.log("Streak Freeze used!");
              } else {
                newStreak = 1;
                // Calculate missed streak penalty
                let currentPen = 20;
                for (let i = 0; i < missedDays; i++) {
                  missingPenaltyCoins += Math.floor(currentPen);
                  currentPen *= 1.5;
                }
              }
            }
          } else {
            newStreak = 1;
          }

          if (missingPenaltyCoins > 0) {
            try {
                // Since writeBatch is Firestore-specific, we'll do sequential updates or implement a batch method in dbInterface
                // For now, sequential is safer for generic IDatabaseService
                await dbService.createTransaction({
                    senderId: user.id,
                    receiverId: "SYSTEM",
                    amount: missingPenaltyCoins,
                    type: "penalty",
                    status: 'completed',
                    timestamp: Date.now()
                });
                
                await dbService.updateUser(user.id, {
                    coins: (user.coins || 0) - missingPenaltyCoins,
                    streak: newStreak,
                    lastActive: today,
                });

                updateUserBalance((user.coins || 0) - missingPenaltyCoins);
                toast.error(`You lost ${missingPenaltyCoins} coins for breaking your login streak!`, { icon: '💸' });
                return; // Skip normal update below
            } catch (err: any) {
                console.error('Streak penalty error:', err);
            }
          }

          try {
            await dbService.updateUser(user.id, {
              streak: newStreak,
              lastActive: today
            });
          } catch (err: any) {
            console.error('Update streak error:', err);
          }
        }
      };
      checkStreak();
      
      const interval = setInterval(checkStreak, 60000); // Check every minute for midnight rollovers
      return () => clearInterval(interval);
    }
  }, [user?.id, user?.lastActive, user?.streak, user?.coins, updateUserBalance]);

  useEffect(() => {
    if (!user?.id) return;

    const processMissedAssignments = async () => {
      if (user.role !== "student") return;
      
      // Throttle: once every 6 hours
      const SIX_HOURS = 6 * 60 * 60 * 1000;
      if (user.lastMissedSweep && (Date.now() - user.lastMissedSweep) < SIX_HOURS) {
        return;
      }

      if (sweepPerformed.current) return;
      sweepPerformed.current = true;

      try {
        // 1. Fetch relevant assignments
        const allRelevantAssignments = (await dbService.getAllAssignments()).filter(a => {
            if (a.isGlobal === true) return true;
            if (a.isGlobal === false) {
                return a.allowedStudents?.includes(user.id) || (user.email && a.allowedStudents?.includes(user.email.toLowerCase())) || false;
            }
            if (a.isGlobal === undefined) {
               if (!a.allowedStudents || a.allowedStudents.length === 0) return true;
               return a.allowedStudents.includes(user.id) || (user.email && a.allowedStudents.includes(user.email.toLowerCase()));
            }
            return false;
        });

        // 2. Fetch existing enrollments
        const userEnrollments = await dbService.getEnrollmentsByStudent(user.id);

        let newBalance = user.coins;
        const now = Date.now();
        let balanceChanged = false;

        let totalCoinsPenalty = 0;
        let totalXpPenalty = 0;

        for (const assignment of allRelevantAssignments) {
          const existingEnr = userEnrollments.find(e => e.assignmentId === assignment.id);
          
          if (existingEnr && (existingEnr.status === "submitted" || existingEnr.status === "graded")) continue;

          const activeDeadline = (existingEnr && existingEnr.graceDeadline) ? existingEnr.graceDeadline : assignment.dueDate;
          if (now <= activeDeadline) continue;

          const isRetest = !!(existingEnr && existingEnr.graceDeadline);
          const isBonus = !!assignment.isBonus;
          const isRecurring = isRetest || isBonus;

          if (!isRecurring && existingEnr && existingEnr.status === "missed") continue;

          const daysSinceDeadline = Math.floor((now - activeDeadline) / (24 * 60 * 60 * 1000));
          const targetMissIndex = daysSinceDeadline + 1;

          const appliedMissIndex = (existingEnr as any)?.lastPenaltyIndexApplied || 0;
          if (targetMissIndex <= appliedMissIndex) continue;
          
          let sweepCoinsPenalty = 0;
          let sweepXpPenalty = 0;

          for (let i = appliedMissIndex + 1; i <= targetMissIndex; i++) {
              if (isRetest) {
                  sweepCoinsPenalty += 25 * Math.pow(1.25, i - 1);
                  sweepXpPenalty += 50; 
              } else if (isBonus) {
                  sweepCoinsPenalty += assignment.penaltyFee || 0;
                  sweepXpPenalty += Math.floor((assignment.xpReward || 100) * 0.5);
              } else {
                  if (i === 1) {
                      sweepCoinsPenalty += assignment.penaltyFee || 0;
                      sweepXpPenalty += Math.floor((assignment.xpReward || 50) * 0.5);
                  }
              }
          }
          
          sweepCoinsPenalty = Math.floor(sweepCoinsPenalty);
          
          const enrollmentUpdate = {
              status: "missed",
              rewardEarned: -(existingEnr?.rewardEarned ? Math.abs(existingEnr.rewardEarned) + sweepCoinsPenalty : sweepCoinsPenalty),
              lastPenaltyIndexApplied: targetMissIndex,
              updatedAt: now
          };

          if (!existingEnr) {
            await dbService.createEnrollment({
              assignmentId: assignment.id,
              studentId: user.id,
              enrolledAt: now,
              ...enrollmentUpdate
            } as any);
          } else {
            await dbService.updateEnrollment(existingEnr.id, enrollmentUpdate as any);
          }

          if (sweepCoinsPenalty > 0) {
            newBalance -= sweepCoinsPenalty;
            totalCoinsPenalty += sweepCoinsPenalty;
            balanceChanged = true;
            totalXpPenalty += sweepXpPenalty;

            await dbService.createTransaction({
              senderId: user.id,
              receiverId: "SYSTEM",
              amount: sweepCoinsPenalty,
              type: "assignment_penalty",
              status: 'completed',
              timestamp: now,
              // Note: Transactions don't have message field in current schema but we can add it or ignore
            });
          }
        }

        // Apply all user updates
        const userUpdate: any = {
          lastMissedSweep: now
        };

        if (balanceChanged) {
          userUpdate.coins = (user.coins || 0) - totalCoinsPenalty;
          userUpdate.xp = (user.xp || 0) - totalXpPenalty; 
        }

        await dbService.updateUser(user.id, userUpdate);

        if (balanceChanged) {
          updateUserBalance(newBalance);
        }
      } catch (error: any) {
        console.error("Missed assignments processing error:", error);
      }
    };

    const fetchAssignments = async () => {
      try {
        let allAssignments = await dbService.getAllAssignments();

        if (user?.role === "student") {
          // Filter out assignments not meant for this student
          allAssignments = allAssignments.filter(a => {
            if (a.isGlobal === true) return true;
            if (a.isGlobal === false) {
               return a.allowedStudents?.includes(user.id) || (user.email && a.allowedStudents?.includes(user.email.toLowerCase())) || false;
            }
            if (a.isGlobal === undefined) {
               if (!a.allowedStudents || a.allowedStudents.length === 0) return true;
               return a.allowedStudents.includes(user.id) || (user.email && a.allowedStudents.includes(user.email.toLowerCase()));
            }
            return false;
          });

          const enrollments = await dbService.getEnrollmentsByStudent(user.id);
          setStudentEnrollments(enrollments);
        }
        setAssignments(allAssignments);
      } catch (err) {
        console.error('Fetch assignments error:', err);
      }
    };

    const loadData = async () => {
      setIsLoading(true);
      await fetchAssignments();
      setIsLoading(false);
      // Process missed assignments in background
      processMissedAssignments().catch(err => console.error("Background sweep failed:", err));
    }
    loadData();
  }, [user?.id, user?.role, user?.lastMissedSweep, user?.coins, user?.xp, user?.email, updateUserBalance]);

  const groupedAssignments = useMemo(() => {
    const groups: Record<string, Assignment[]> = {};
    assignments.forEach((a) => {
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
      .slice(0, 3); // show top 3 campaigns on dashboard
  }, [assignments]);

  if (isLoading) return <DashboardSkeleton />;

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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-6xl mx-auto px-4 space-y-6 md:space-y-8 pb-8"
    >
      {/* Hero Section */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
        className="relative overflow-hidden rounded-3xl p-8 md:p-12 bg-bg-surface border border-border-main shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-8"
      >
        <div className="relative z-10 max-w-2xl w-full">
          <motion.div
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center gap-3 mb-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-border-main rounded-md text-xs font-semibold uppercase tracking-wider text-text-secondary bg-bg-main/50 text-brand-gold">
              Level {currentLevel} • {user ? getPerformanceBadge(calculatePerformanceScore(user)).title : "Student"}
            </div>
            {user && (getVIPLevel(user).level > 0 || user.vipLevel > 0) && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-amber-500/20 rounded-md text-xs font-semibold uppercase tracking-wider text-amber-500 bg-amber-500/10">
                VIP {getVIPLevel(user).level || user.vipLevel}
              </div>
            )}
            {(user?.streak ?? 0) > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-orange-500/20 rounded-md text-xs font-semibold uppercase tracking-wider text-orange-500 bg-orange-500/10">
                <Flame className="w-3.5 h-3.5" /> {user?.streak} Day Streak
              </div>
            )}
          </motion.div>
          <motion.h1
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-4xl md:text-5xl font-bold mb-3 tracking-tight text-text-primary uppercase"
          >
            Welcome, {user?.name.split(" ")[0]}
          </motion.h1>
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-text-secondary text-lg font-medium leading-relaxed max-w-lg"
          >
            Track your progress, complete assignments, and level up your skills.
          </motion.p>

          {/* Quick Stats Bars Inline */}
          {user && (
             <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="mt-8 flex flex-col md:flex-row gap-6 max-w-md md:max-w-xl"
             >
               <div className="flex-1 space-y-2">
                 <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-text-secondary">
                   <span>XP Progress</span>
                   <span className="text-text-primary">{getUserLevelAndXP(user).xpCurrent} / {getUserLevelAndXP(user).xpMax}</span>
                 </div>
                 <div className="w-full h-1 bg-border-main rounded-full overflow-hidden">
                   <div
                     className="h-full bg-brand-gold rounded-full transition-all duration-1000 ease-out"
                     style={{ width: `${getUserLevelAndXP(user).xpProgress}%` }}
                   />
                 </div>
               </div>

               {getVIPLevel(user).level > 0 && (
               <div className="flex-1 space-y-2">
                 <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-amber-500">
                   <span>VIP Progress</span>
                   <span className="text-amber-400">{getVIPLevel(user).xp} / {getVIPLevel(user).nextLevelXP}</span>
                 </div>
                 <div className="w-full h-1 bg-amber-500/20 rounded-full overflow-hidden">
                   <div
                     className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-out"
                     style={{ width: `${getVIPLevel(user).progress}%` }}
                   />
                 </div>
               </div>
               )}
             </motion.div>
          )}

          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-10"
          >
            <Link
              to="/assignments"
              className="inline-flex items-center gap-2 bg-text-primary text-bg-main hover:bg-text-secondary px-6 py-3 rounded-md font-bold text-sm transition-all focus:ring-2 focus:ring-brand-gold focus:outline-none"
            >
              View Assignments <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>

        {/* Minimal Stats Card on Right */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="relative z-10 w-full md:w-80 shrink-0 flex flex-col p-6 md:p-8 bg-bg-main border border-border-main rounded-2xl"
        >
          <div className="flex items-center justify-between mb-8">
             <span className="text-text-secondary text-xs font-semibold uppercase tracking-widest">Diamonds</span>
             <Gem className="w-5 h-5 text-cyan-400" strokeWidth={2} />
          </div>
          <div className="text-5xl md:text-6xl font-black text-text-primary tracking-tighter mb-8">
            {user?.diamonds || 0}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border-main">
            <Link to="/assignments?filter=active" className="group">
               <div className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-1 group-hover:text-text-primary transition-colors">Active</div>
               <div className="text-xl font-bold text-brand-gold">{studentEnrollments.filter((e) => e.status === "active").length}</div>
            </Link>
            <Link to="/assignments?filter=completed" className="group">
               <div className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-1 group-hover:text-text-primary transition-colors">Done</div>
               <div className="text-xl font-bold text-emerald-500">{studentEnrollments.filter((e) => e.status === "submitted" || e.status === "graded").length}</div>
            </Link>
            <Link to="/assignments?filter=missed" className="group mt-2">
               <div className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-1 group-hover:text-text-primary transition-colors">Missed</div>
               <div className="text-xl font-bold text-rose-500">{studentEnrollments.filter((e) => e.status === "missed").length}</div>
            </Link>
            <Link to="/assignments?filter=retest" className="group mt-2">
               <div className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-1 group-hover:text-text-primary transition-colors">Retest</div>
               <div className="text-xl font-bold text-amber-500">{studentEnrollments.filter((e) => e.status === "active" && e.graceDeadline && e.graceDeadline > Date.now()).length}</div>
            </Link>
          </div>
        </motion.div>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6 md:gap-8">
        {/* Recent Assignments section */}
        <div className="md:col-span-2 space-y-6 md:space-y-8">
          <div className="flex justify-between items-end px-1 md:px-2 border-b border-border-main pb-3 md:pb-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-text-primary flex items-center gap-2 tracking-tight">
                Active Campaigns
              </h2>
            </div>
            <Link
              to="/assignments"
              className="text-xs md:text-sm text-text-primary font-bold hover:text-black transition flex items-center gap-1 bg-border-main/50 hover:bg-border-main px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl"
            >
              All <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
            </Link>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-4 md:space-y-6"
          >
            {groupedAssignments.map((group) => (
              <motion.div variants={itemVariants} key={group.name}>
                <AssignmentGroupCard
                  group={group}
                  enrollments={studentEnrollments}
                  userRole={user?.role}
                />
              </motion.div>
            ))}
            {groupedAssignments.length === 0 && (
              <motion.div
                variants={itemVariants}
                className="p-12 text-center border-2 border-dashed border-border-main/60 rounded-3xl text-text-secondary/80 font-medium bg-bg-surface flex flex-col items-center justify-center"
              >
                <div className="w-20 h-20 bg-bg-main rounded-full flex items-center justify-center mb-4">
                  <Sparkles className="w-10 h-10 text-text-secondary/60" />
                </div>
                <h3 className="text-xl font-black text-text-primary mb-2">
                  You're All Caught Up!
                </h3>
                <p className="text-text-secondary max-w-sm text-sm">
                  No active campaigns right now. Take a break or check back
                  later for new missions.
                </p>
              </motion.div>
            )}
          </motion.div>

          <div className="pt-8">
            <CompletedMissionsStack />
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-6">
          <div className="flex justify-between items-end px-1 md:px-2 border-b border-border-main pb-3 md:pb-4">
              <h2 className="text-2xl md:text-3xl font-bold text-text-primary flex items-center gap-2 tracking-tight">
                Quick Actions
              </h2>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 gap-3 md:gap-4"
          >
            {[
              {
                to: "/wallet",
                icon: Trophy,
                title: "Recharge",
                locked: false
              },
              {
                to: "/wallet",
                icon: Send,
                title: "Transfer",
                locked: user && getVIPLevel(user).level < 1 && getUserLevelAndXP(user).currentLevel < 5 ? "Lvl 5" : false
              },
              {
                to: "/leaderboard",
                icon: Crown,
                title: "Ranks",
                locked: false
              },
              {
                to: "/scorecard",
                icon: BookOpen,
                title: "Stats",
                locked: false
              },
            ].map((action, idx) => (
              <motion.div variants={itemVariants} key={idx}>
                <Link
                  to={action.to}
                  className={cn(
                    "group rounded-2xl p-4 bg-bg-surface border border-border-main hover:border-text-secondary/50 transition-all flex flex-col items-center justify-center text-center h-28 relative overflow-hidden",
                    action.locked && "opacity-60 grayscale"
                  )}
                >
                  <action.icon className="w-6 h-6 mb-3 text-text-secondary group-hover:text-text-primary transition-colors" strokeWidth={1.5} />
                  <span className="block font-bold text-text-primary text-sm tracking-tight relative z-10">
                      {action.title}
                  </span>
                  {action.locked && (
                     <div className="absolute inset-0 bg-bg-main/80 backdrop-blur-[2px] flex items-center justify-center flex-col gap-1 z-20">
                         <Lock className="w-4 h-4 text-text-secondary" />
                         <span className="text-[9px] font-black uppercase text-text-secondary tracking-widest">{action.locked}</span>
                     </div>
                  )}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};
