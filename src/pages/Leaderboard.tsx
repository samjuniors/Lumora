import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService, submissionService } from '../services/dbProvider';
import { handleFirestoreError, OperationType } from '../lib/errorHandling';
import { User, Submission } from '../types';
import { Trophy, Medal, Crown, Sparkles, Send, GraduationCap, Flame, Target, Gem } from 'lucide-react';
import { cn, getUserLevelAndXP, getVIPLevel } from '../lib/utils';
import { calculatePerformanceScore, getPerformanceBadge } from '../lib/performance';
import { motion, AnimatePresence } from 'motion/react';

import { Link, useSearchParams } from 'react-router-dom';
import { ListSkeleton } from '../components/Skeletons';
import { UserProfileModal } from '../components/UserProfileModal';
import { PresenceDot } from '../components/PresenceDot';

const getTierInfo = (diamonds: number) => {
  if (diamonds >= 100) return { name: 'Diamond', color: 'text-cyan-500', bg: 'bg-cyan-100', border: 'border-cyan-300', shadow: 'shadow-cyan-200/50' };
  if (diamonds >= 50) return { name: 'Platinum', color: 'text-slate-600', bg: 'bg-slate-200', border: 'border-slate-400', shadow: 'shadow-slate-300/50' };
  if (diamonds >= 25) return { name: 'Gold', color: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-400', shadow: 'shadow-yellow-300/50' };
  if (diamonds >= 10) return { name: 'Silver', color: 'text-text-secondary', bg: 'bg-border-main', border: 'border-border-main', shadow: 'shadow-black/5/50' };
  if (diamonds >= 5) return { name: 'Bronze', color: 'text-brand-gold', bg: 'bg-brand-gold/20', border: 'border-amber-400', shadow: 'shadow-amber-200/50' };
  return { name: 'Wood', color: 'text-amber-900', bg: 'bg-orange-50', border: 'border-orange-200', shadow: 'shadow-none' };
};

const getRankBadge = (rank: number) => {
    if (rank === 1) return { name: 'Champion', bg: 'bg-yellow-100', color: 'text-yellow-800', border: 'border-yellow-200' };
    if (rank === 2) return { name: 'Master', bg: 'bg-border-main', color: 'text-text-primary', border: 'border-border-main' };
    if (rank === 3) return { name: 'Expert', bg: 'bg-brand-gold/20', color: 'text-amber-800', border: 'border-brand-gold/30' };
    return { name: 'Bronze', bg: 'bg-orange-50', color: 'text-orange-700', border: 'border-orange-100' };
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.02 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { duration: 0.2, ease: "easeOut" as const } }
};

const Podium = ({ leaders, type, setSelectedUser, timeframe }: { leaders: any[], type: 'diamonds' | 'grades', setSelectedUser: (user: any) => void, timeframe: 'daily' | 'weekly' | 'overall' }) => {
    if (leaders.length === 0) return null;
    const top3 = [leaders[1], leaders[0], leaders[2]]; // 2nd, 1st, 3rd

    return (
      <div className="flex flex-col md:flex-row items-stretch justify-center gap-6 md:gap-8 pt-12 pb-16 px-2 sm:px-4 relative items-center md:items-end">
        {top3.map((student, i) => {
          const rank = i === 1 ? 1 : i === 0 ? 2 : 3;
          if (!student) return <div key={`empty-${rank}`} className="hidden md:block flex-1 max-w-[220px]"></div>;
          
          const isFirst = rank === 1;
          const bgClass = isFirst ? 'bg-gradient-to-br from-brand-gold to-amber-600 text-bg-main' : 'bg-white/[0.02] text-text-primary';
          const borderClass = isFirst ? 'border-brand-gold shadow-[0_20px_50px_rgba(251,191,36,0.3)]' : 'border-white/5 shadow-premium';
          
          return (
            <motion.div 
              key={student.id + '-' + type} 
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: (3 - rank) * 0.1, type: "spring", stiffness: 250, damping: 20 }}
              className={cn(
                "flex flex-col items-center justify-center relative group w-full md:flex-1 max-w-[300px] rounded-[2.5rem] p-8 border transition-all duration-500",
                bgClass, borderClass,
                isFirst ? "md:order-2 md:h-96 z-10 scale-110 shadow-glow-gold" : i === 0 ? "md:order-1 md:h-72" : "md:order-3 md:h-72"
              )}
            >
              {isFirst && (
                <div className="absolute -top-6 bg-white text-bg-main text-[10px] font-black px-6 py-2 rounded-full flex items-center gap-2 shadow-2xl border border-white/20 uppercase tracking-[0.3em]">
                   <Crown className="w-4 h-4" /> Apex Operative
                </div>
              )}
              {!isFirst && (
                <div className="absolute -top-4 bg-white/10 backdrop-blur-md text-[9px] font-black px-4 py-1.5 rounded-full border border-white/10 uppercase tracking-widest opacity-60">
                   Rank {rank}
                </div>
              )}

              <motion.div 
                 whileHover={{ scale: 1.1, rotate: 5 }}
                 className={cn(
                 "relative flex items-center justify-center bg-bg-main rounded-3xl shadow-inner mb-6 overflow-hidden border-2 transition-all",
                 isFirst ? 'w-28 h-28 border-white/40' : 'w-20 h-20 border-white/10'
               )}>
                 {(student.avatar?.startsWith('http') || student.avatar?.startsWith('data:')) ? (
                   <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                 ) : (
                   <span className={cn("text-3xl", isFirst && "text-5xl")}>{student.avatar || '👤'}</span>
                 )}
                 {student.inventory?.includes('avatar_frame_gold') && (
                    <div className="absolute inset-0 border-[4px] border-brand-gold rounded-3xl z-20 pointer-events-none animate-pulse" />
                 )}
               </motion.div>
               
               <button onClick={() => setSelectedUser(student)} className="font-black text-center truncate block max-w-full px-2 text-xl hover:opacity-80 transition-opacity uppercase tracking-tight">
                  {student.name.split(' ')[0]}
               </button>

               <div className={cn("mt-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-60", isFirst ? "text-bg-main" : "text-text-muted")}>
                  Clearance Lvl {getUserLevelAndXP(student).currentLevel}
               </div>
                            <div className={cn("mt-6 font-black flex items-center gap-2", isFirst ? "text-4xl text-bg-main" : "text-3xl text-brand-gold")}>
                 {type === 'diamonds' ? (
                   <>{(() => {
                      const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
                      const today = `${nowIST.getFullYear()}-${String(nowIST.getMonth() + 1).padStart(2, '0')}-${String(nowIST.getDate()).padStart(2, '0')}`;
                      const d = new Date(nowIST);
                      d.setHours(0,0,0,0);
                      d.setDate(d.getDate() + 4 - (d.getDay() || 7));
                      const yearStart = new Date(d.getFullYear(),0,1);
                      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
                      const thisWeek = `${d.getFullYear()}-W${weekNo}`;
                      
                      if (timeframe === 'daily') return student.lastResetDay === today ? (student.dailyDiamonds || 0) : 0;
                      if (timeframe === 'weekly') return student.lastResetWeek === thisWeek ? (student.weeklyDiamonds || 0) : 0;
                      return student.lifetimeDiamonds || student.diamonds || 0;
                    })()} <Gem className={cn("w-6 h-6", isFirst ? 'text-bg-main' : 'text-cyan-400')}/></>
                 ) : (
                   <>{student.averageGrade}% <GraduationCap className={cn("w-6 h-6", isFirst ? 'text-bg-main' : 'text-brand-gold')}/></>
                 )}
               </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

export const Leaderboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as 'diamonds' | 'grades') || 'diamonds';
  const timeframe = (searchParams.get('time') as 'daily' | 'weekly' | 'overall') || 'overall';

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab, time: timeframe });
  };
  
  const setTimeframe = (time: string) => {
    setSearchParams({ tab: activeTab, time });
  };
  const [selectedUser, setSelectedUser] = useState<(User & { averageGrade?: number, gradedCount?: number }) | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [updatedUsers, updatedSubmissions] = await Promise.all([
          userService.getAllUsers(), // Already cached in service now
          submissionService.getAllAssessedSubmissions()
        ]);
        
        setUsers(updatedUsers.filter(u => u.role === 'student'));
        setSubmissions(updatedSubmissions);
      } catch(err) {
        handleFirestoreError(err, OperationType.LIST, 'leaderboard_data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const calculatedUsers = useMemo(() => {
    return users.map(u => {
      const userSubs = submissions.filter(s => s.studentId === u.id);
      const totalScore = userSubs.reduce((acc, sub) => acc + sub.aiScore, 0);
      const averageGrade = userSubs.length > 0 ? Math.round(totalScore / userSubs.length) : 0;
      
      return {
        ...u,
        coins: u.coins || 0,
        diamonds: u.diamonds || 0,
        streak: u.streak || 0,
        averageGrade,
        gradedCount: userSubs.length
      };
    });
  }, [users, submissions]);

  const coinLeaders = useMemo(() => {
    const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const today = `${nowIST.getFullYear()}-${String(nowIST.getMonth() + 1).padStart(2, '0')}-${String(nowIST.getDate()).padStart(2, '0')}`;
    
    // Simple ISO week calculation
    const d = new Date(nowIST);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(),0,1);
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    const thisWeek = `${d.getFullYear()}-W${weekNo}`;

    return [...calculatedUsers].sort((a, b) => {
      // 1. Diamonds (Primary, based on timeframe)
      let aVal = 0, bVal = 0;
      if (timeframe === 'daily') {
        aVal = a.lastResetDay === today ? (a.dailyDiamonds || 0) : 0;
        bVal = b.lastResetDay === today ? (b.dailyDiamonds || 0) : 0;
      } else if (timeframe === 'weekly') {
        aVal = a.lastResetWeek === thisWeek ? (a.weeklyDiamonds || 0) : 0;
        bVal = b.lastResetWeek === thisWeek ? (b.weeklyDiamonds || 0) : 0;
      } else {
        aVal = a.lifetimeDiamonds || a.diamonds || 0;
        bVal = b.lifetimeDiamonds || b.diamonds || 0;
      }
      
      if (bVal !== aVal) return bVal - aVal;
      
      // 2. XP/Level (Secondary)
      const aStats = getUserLevelAndXP(a);
      const bStats = getUserLevelAndXP(b);
      if (bStats.totalXP !== aStats.totalXP) return bStats.totalXP - aStats.totalXP;
      
      // 3. Name (Tertiary)
      const nameCompare = a.name.localeCompare(b.name);
      if (nameCompare !== 0) return nameCompare;
      
      // 4. VIP Level (Quaternary)
      const aStatsVip = getVIPLevel(a);
      const bStatsVip = getVIPLevel(b);
      if (bStatsVip.level !== aStatsVip.level) return bStatsVip.level - aStatsVip.level;
      
      return 0;
    });
  }, [users]);

  const gradeLeaders = useMemo(() => {
    return [...calculatedUsers].sort((a, b) => b.averageGrade - a.averageGrade || b.gradedCount - a.gradedCount);
  }, [calculatedUsers]);

  if (loading) {
     return <div className="max-w-6xl mx-auto"><ListSkeleton /></div>;
  }





  const renderList = (leadersList: any[], type: 'diamonds' | 'grades') => (
    <div className="space-y-4 lg:space-y-6 relative mt-10">
      <Podium leaders={leadersList} type={type} setSelectedUser={setSelectedUser} timeframe={timeframe} />
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="bg-bg-surface border border-border-main rounded-3xl overflow-hidden shadow-sm"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
        
        {leadersList.slice(3).map((student, idx) => {
          const index = idx + 3;
          const rankBadge = getRankBadge(index + 1);
          const { currentLevel } = getUserLevelAndXP(student);
          
          return (
            <motion.div 
              variants={itemVariants}
              key={student.id} 
              className={cn(
                "flex flex-col md:flex-row md:items-center px-4 md:px-8 py-5 md:py-6 border-b border-border-main/50 transition-all gap-4 relative group shrink-0 w-full min-w-0 max-w-full overflow-hidden hover:bg-bg-surface/50",
                student.id === currentUser?.id ? "bg-amber-500/10" : "",
                index === leadersList.length - 1 && "border-b-0"
              )}
            >
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#D4AF37] transform scale-y-0 origin-bottom transition-transform group-hover:scale-y-100 rounded-r-full"></div>
              {student.id === currentUser?.id && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#D4AF37] rounded-r-full scale-y-100"></div>}

              <div className="flex items-center gap-4 w-full md:w-auto min-w-0">
                <div className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center font-bold text-text-secondary/70 text-lg md:text-xl shrink-0">
                   #{index + 1}
                </div>
                
                <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-bg-main rounded-2xl border border-border-main shrink-0 shadow-sm relative overflow-hidden">
                  {(student.avatar?.startsWith('http') || student.avatar?.startsWith('data:')) ? (
                     <img src={student.avatar} key={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                  ) : (
                     <span className="text-2xl md:text-3xl">{student.avatar || '👤'}</span>
                  )}
                  {student.inventory?.includes('avatar_frame_gold') && (
                    <div className="absolute inset-0 border-[3px] border-[#D4AF37] rounded-2xl z-10 pointer-events-none"></div>
                  )}
                  <PresenceDot status={student.presence} className="absolute bottom-1 right-1 z-20 scale-75" />
                </div>
                
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <button onClick={() => setSelectedUser(student)} className="text-lg md:text-xl font-bold truncate hover:text-[#D4AF37] transition-colors tracking-tight text-left text-text-primary">
                      {student.name}
                    </button>
                    {student.luminaId && (
                      <span className="text-[10px] font-mono text-text-secondary bg-bg-main px-1.5 py-0.5 rounded border border-border-main/50">
                        {student.luminaId}
                      </span>
                    )}
                    {student.id === currentUser?.id && <span className="text-[10px] uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded flex-shrink-0 font-bold">YOU</span>}
                    <span className={cn("text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border", rankBadge.bg, rankBadge.color, rankBadge.border)}>
                      {rankBadge.name}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border bg-bg-main border-border-main text-text-secondary">
                      Lvl {currentLevel}
                    </span>
                  </div>
                  <div className="text-xs text-text-secondary flex items-center gap-3">
                     {student.achievements && student.achievements.length > 0 && (
                       <span className="flex items-center font-medium"><Sparkles className="w-3.5 h-3.5 mr-1 text-[#D4AF37]" /> {student.achievements.length} Badges</span>
                     )}
                     {student.streak && student.streak > 0 ? (
                        <span className="flex items-center font-medium"><Flame className="w-3.5 h-3.5 mr-1 text-orange-500" /> {student.streak} Streak</span>
                     ) : null}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t border-border-main/50 md:border-0 pt-4 md:pt-0 mt-3 md:mt-0 relative z-10 shrink-0">
                <div className="font-bold text-2xl flex items-center gap-2 min-w-[120px] justify-end tracking-tight">
                  {type === 'diamonds' ? (
                    <span className="text-text-primary flex items-center gap-2">
                       {(() => {
                         const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
                         const today = `${nowIST.getFullYear()}-${String(nowIST.getMonth() + 1).padStart(2, '0')}-${String(nowIST.getDate()).padStart(2, '0')}`;
                         const d = new Date(nowIST);
                         d.setHours(0,0,0,0);
                         d.setDate(d.getDate() + 4 - (d.getDay() || 7));
                         const yearStart = new Date(d.getFullYear(),0,1);
                         const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
                         const thisWeek = `${d.getFullYear()}-W${weekNo}`;
                         
                         if (timeframe === 'daily') return student.lastResetDay === today ? (student.dailyDiamonds || 0) : 0;
                         if (timeframe === 'weekly') return student.lastResetWeek === thisWeek ? (student.weeklyDiamonds || 0) : 0;
                         return student.lifetimeDiamonds || student.diamonds || 0;
                       })()} <Gem className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"/>
                    </span>
                  ) : (
                    <span className="text-text-primary flex items-center gap-2">
                       {student.averageGrade}% <GraduationCap className="w-5 h-5 text-[#D4AF37]"/>
                    </span>
                  )}
                </div>

                {currentUser && student.id !== currentUser.id && (
                  <button 
                    onClick={() => setSelectedUser(student)}
                    className="p-2.5 text-text-secondary/60 hover:text-text-primary hover:bg-bg-main rounded-full transition-all"
                    title={`View ${student.name}'s profile`}
                  >
                    <Target className="w-5 h-5" />
                  </button>
                )}
                {currentUser && student.id === currentUser.id && (
                  <div className="w-10"></div>
                )}
              </div>
            </motion.div>
          );
        })}
        {leadersList.length <= 3 && leadersList.length > 0 && (
          <div className="p-12 text-center text-text-secondary font-medium">Complete more missions to join the ranks!</div>
        )}
        {leadersList.length === 0 && <div className="p-12 text-center text-text-secondary font-medium">No students yet.</div>}
      </motion.div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-12 relative pb-48 px-6">
      {/* Premium minimal Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6 pt-16 pb-12"
      >
        <div className="flex flex-col items-center gap-4">
           <div className="flex items-center gap-3">
             <span className="h-[1px] w-12 bg-brand-gold/30"></span>
             <span className="text-[10px] font-black text-brand-gold uppercase tracking-[0.4em]">Operational Dominance</span>
             <span className="h-[1px] w-12 bg-brand-gold/30"></span>
           </div>
           <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-text-primary uppercase leading-[0.85]">
              Syndicate <span className="text-brand-gold text-glow-gold">Rankings</span>
           </h1>
           <p className="text-text-secondary text-lg md:text-xl font-medium max-w-2xl mx-auto italic opacity-80">
              Elite performance metrics. Only the most precise operatives ascend to the Apex Tier.
           </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="pt-12">
          <div className="flex bg-white/[0.02] backdrop-blur-md p-2 w-full max-w-xl mx-auto rounded-[2rem] border border-white/5 shadow-premium">
            <button
              onClick={() => setActiveTab('diamonds')}
              className={cn(
                "flex-1 px-8 py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-500 flex items-center justify-center gap-3",
                activeTab === 'diamonds' ? "bg-brand-gold text-bg-main shadow-lg shadow-brand-gold/20" : "text-text-muted hover:text-text-primary"
              )}
            >
              <Gem className="w-4 h-4" /> Asset Leaders
            </button>
            <button
              onClick={() => setActiveTab('grades')}
              className={cn(
                "flex-1 px-8 py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-500 flex items-center justify-center gap-3",
                activeTab === 'grades' ? "bg-brand-gold text-bg-main shadow-lg shadow-brand-gold/20" : "text-text-muted hover:text-text-primary"
              )}
            >
              <GraduationCap className="w-4 h-4" /> Mastery Tier
            </button>
          </div>

          {activeTab === 'diamonds' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-6 mt-10"
            >
               {['daily', 'weekly', 'overall'].map((t) => (
                 <button
                   key={t}
                   onClick={() => setTimeframe(t)}
                   className={cn(
                     "px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] transition-all border",
                     timeframe === t 
                       ? "bg-brand-gold/5 border-brand-gold/30 text-brand-gold" 
                       : "text-text-muted border-transparent hover:text-text-primary hover:bg-white/5"
                   )}
                 >
                   {t}
                 </button>
               ))}
            </motion.div>
          )}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="transition-all"
        >
          {activeTab === 'diamonds' && renderList(coinLeaders, 'diamonds')}
          {activeTab === 'grades' && renderList(gradeLeaders, 'grades')}
        </motion.div>
      </AnimatePresence>

      {/* Sticky Current User Rank Bar (if user is logged in as student) */}
      {currentUser && currentUser.role === 'student' && (
        <div className="fixed bottom-[calc(104px+env(safe-area-inset-bottom))] md:bottom-8 left-0 right-0 px-4 z-[1000] pointer-events-none flex justify-center">
          <div className="w-full max-w-4xl pointer-events-auto">
             {(() => {
                const list = activeTab === 'diamonds' ? coinLeaders : gradeLeaders;
                const myIndex = list.findIndex(u => u.id === currentUser.id);
                const me = list[myIndex];
                if (!me) return null;

                const tier = getTierInfo(me.lifetimeDiamonds || me.diamonds || 0);
                
                return (
                    <motion.div 
                      key={activeTab}
                      initial={{ y: 50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className="bg-bg-card/90 backdrop-blur-3xl border border-brand-gold/30 rounded-[2rem] shadow-glow-gold p-3 md:p-5 flex items-center gap-4 text-text-primary overflow-hidden relative"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-brand-gold/5 to-transparent pointer-events-none"></div>
                      <div className="w-12 h-12 md:w-14 md:h-14 bg-brand-gold text-bg-main rounded-[1.25rem] flex items-center justify-center font-black text-xl md:text-2xl shrink-0">
                        #{myIndex + 1}
                      </div>
                      <div className="w-12 h-12 md:w-14 md:h-14 bg-white/5 rounded-[1.25rem] flex items-center justify-center shrink-0 border border-white/5 overflow-hidden">
                        {(me.avatar?.startsWith('http') || me.avatar?.startsWith('data:')) ? (
                           <img src={me.avatar} key={me.avatar} alt={me.name} className="w-full h-full object-cover" />
                        ) : (
                           <span className="text-2xl md:text-3xl">{me.avatar || '👤'}</span>
                        )}
                      </div>
                      <div className="flex-1 font-black z-10 min-w-0">
                        <p className="truncate text-[10px] text-brand-gold uppercase tracking-[0.3em] mb-1">Operative Standing</p>
                        <div className="flex items-center gap-3">
                          <span className="text-lg md:text-xl truncate uppercase tracking-tighter">Apex Designation</span>
                          <div className="hidden md:flex items-center gap-2">
                            <span className={cn("text-[9px] uppercase tracking-[0.2em] font-black px-3 py-1 rounded-full text-bg-main bg-brand-gold")}>
                              {tier.name}
                            </span>
                            <span className={cn(
                              "text-[9px] uppercase font-black tracking-[0.2em] px-3 py-1 rounded-full shadow-sm text-text-primary border border-white/10 bg-white/5",
                            )}>
                              {getPerformanceBadge(calculatePerformanceScore(me)).title}
                            </span>
                          </div>
                        </div>
                      </div>
                    <div className="font-black text-xl md:text-3xl z-10 whitespace-nowrap bg-brand-gold/10 px-6 py-3 rounded-2xl flex items-center gap-2 border border-brand-gold/20 text-brand-gold shadow-glow-gold">
                      {activeTab === 'diamonds' ? (
                        <span className="flex items-center gap-3">
                          {(() => {
                             const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
                             const today = `${nowIST.getFullYear()}-${String(nowIST.getMonth() + 1).padStart(2, '0')}-${String(nowIST.getDate()).padStart(2, '0')}`;
                             const d = new Date(nowIST);
                             d.setHours(0,0,0,0);
                             d.setDate(d.getDate() + 4 - (d.getDay() || 7));
                             const yearStart = new Date(d.getFullYear(),0,1);
                             const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
                             const thisWeek = `${d.getFullYear()}-W${weekNo}`;
                             
                             if (timeframe === 'daily') return me.lastResetDay === today ? (me.dailyDiamonds || 0) : 0;
                             if (timeframe === 'weekly') return me.lastResetWeek === thisWeek ? (me.weeklyDiamonds || 0) : 0;
                             return me.lifetimeDiamonds || me.diamonds || 0;
                          })()} <Gem className="w-5 h-5 text-cyan-400" />
                        </span>
                      ) : (
                        <span className="flex items-center gap-3">
                          {me.averageGrade || 0}% <GraduationCap className="w-5 h-5" />
                        </span>
                      )}
                    </div>
                  </motion.div>
                )
             })()}
          </div>
        </div>
      )}

      <AnimatePresence>
        {selectedUser && (
          <UserProfileModal user={selectedUser as User & { averageGrade?: number, gradedCount?: number }} onClose={() => setSelectedUser(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

