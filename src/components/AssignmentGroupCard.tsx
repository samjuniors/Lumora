import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Assignment, Enrollment } from '../types';
import { BookOpen, ChevronRight, Target, Clock, CheckCircle2, Lock, ArrowRight, Edit, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ExpandableText } from './ExpandableText';

interface AssignmentGroupCardProps { 
  group: { id?: string, name: string, items: Assignment[] }; 
  enrollments: Enrollment[]; 
  userRole?: string; 
  onEdit?: (a: Assignment) => void;
}

export const AssignmentGroupCard: React.FC<AssignmentGroupCardProps> = ({ group, enrollments, userRole, onEdit }) => {
  const navigate = useNavigate();
  const now = Date.now();
  const sliderRef = useRef<HTMLDivElement>(null);
  
  let currentActive: Assignment | null = null;
  let upcoming: Assignment | null = null;
  let finishedCount = 0;

  const sortedItems = [...group.items].sort((a, b) => (a.startDate || a.dueDate) - (b.startDate || b.dueDate));

  const getMissionStatus = (a: Assignment) => {
    const start = a.startDate || 0;
    const isPastDue = now > a.dueDate;
    if (userRole === 'student') {
      const enr = enrollments.find(e => e.assignmentId === a.id);
      if (enr && (enr.status === 'submitted' || enr.status === 'graded')) return 'completed';
      if (enr && enr.status === 'active' && enr.graceDeadline && now <= enr.graceDeadline) return 'retest';
      if (isPastDue) return 'missed';
      if (now >= start) return 'active';
      return 'upcoming';
    } else {
      if (isPastDue) return 'missed';
      if (now >= start && now <= a.dueDate) return 'active';
      return 'upcoming';
    }
  };

  const getMissionState = (a: Assignment) => {
    const status = getMissionStatus(a);
    if (status === 'completed') return { status: 'completed', locked: false };
    if (status === 'retest') return { status: 'retest', locked: false };
    
    // Check if previous is completed (sequential logic for students)
    if (userRole === 'student') {
      const index = sortedItems.findIndex(item => item.id === a.id);
      if (index > 0) {
        const prevStatus = getMissionStatus(sortedItems[index-1]);
        if (prevStatus !== 'completed' && prevStatus !== 'missed') {
          return { status, locked: true };
        }
      }
    }
    return { status, locked: false };
  };

  for (const a of sortedItems) {
    const state = getMissionState(a);
    if (state.status === 'completed') {
      finishedCount++;
    } else if (state.status === 'missed') {
      // Missed, doesn't count towards finished
    } else if (!state.locked && (state.status === 'active' || state.status === 'retest') && !currentActive) {
      currentActive = a;
    } else if (!state.locked && state.status === 'upcoming' && !upcoming && !currentActive) {
      upcoming = a;
    }
  }

  const total = sortedItems.length;
  const progressPercent = Math.round((finishedCount / total) * 100);
  const isAllFinished = finishedCount === total;
  const isDuoGroup = group.id?.startsWith('duo___');

  const [timeLeftStr, setTimeLeftStr] = useState<string>('');

  useEffect(() => {
    let targetTime = 0;
    if (currentActive) {
      targetTime = currentActive.dueDate;
    } else if (upcoming) {
      targetTime = upcoming.startDate || upcoming.dueDate;
    }

    if (!targetTime || isAllFinished) return;

    const interval = setInterval(() => {
      const diff = targetTime - Date.now();
      if (diff <= 0) {
        setTimeLeftStr('00:00:00');
      } else {
         // handle negative diff for missed within active
         const absDiff = Math.abs(diff);
        const d = Math.floor(absDiff / (1000 * 60 * 60 * 24));
        const h = Math.floor((absDiff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((absDiff / 1000 / 60) % 60);
        const s = Math.floor((absDiff / 1000) % 60);
        if (d > 0) {
          setTimeLeftStr(`${d}d ${h}h ${m}m`);
        } else {
          setTimeLeftStr(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentActive, upcoming, isAllFinished]);

  let cardStatus = 'upcoming';
  if (isAllFinished) {
    cardStatus = 'completed';
  } else if (currentActive) {
    if (now > currentActive.dueDate) {
      cardStatus = 'missed';
    } else {
      cardStatus = 'active';
    }
  }

  const statusColors = {
    active: "bg-bg-surface border-indigo-500/30",
    upcoming: "bg-bg-main border-border-main",
    completed: "bg-bg-main border-success-green/20",
    missed: "bg-bg-main border-rose-500/20",
  };

  const innerStatusColors = {
    active: "bg-bg-main/50 border-indigo-500/10",
    upcoming: "bg-bg-main/50 border-border-main",
    completed: "bg-bg-main/50 border-success-green/10",
    missed: "bg-bg-main/50 border-rose-500/10",
  };

  return (
    <div className={cn(
      "rounded-2xl p-5 md:p-6 border transition-all duration-300 relative overflow-hidden", 
      isDuoGroup ? "bg-brand-gold/5 border-brand-gold/30" : (statusColors[cardStatus as keyof typeof statusColors] || statusColors.upcoming)
    )}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 md:w-14 md:h-14 border flex flex-col items-center justify-center shrink-0 rounded-xl transition-all",
            isDuoGroup ? "bg-brand-gold/10 border-brand-gold/20 text-brand-gold" : "bg-bg-main border-border-main text-text-primary"
          )}>
            <BookOpen className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5}/>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-text-primary leading-tight line-clamp-1">{group.name}</h2>
              {isDuoGroup && (
                <span className="bg-brand-gold text-bg-main text-[9px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 rounded-sm uppercase tracking-wider">DUO</span>
              )}
            </div>
            <p className="text-text-secondary font-medium text-xs md:text-sm">{isDuoGroup ? '2-Part Special Mission' : `${total} ${total === 1 ? 'Mission' : 'Missions'} in this campaign`}</p>
          </div>
        </div>
        
        <div className="flex-1 w-full mt-2 md:mt-0 md:max-w-xs">
           <div className="flex justify-between items-end mb-2">
              <div className="flex flex-col">
                <span className="text-[10px] md:text-xs font-semibold text-text-secondary uppercase tracking-widest">Progress</span>
                {!isAllFinished && currentActive && (now + 24 * 60 * 60 * 1000 > currentActive.dueDate) && (
                  <span className="text-[9px] font-bold text-rose-500 uppercase tracking-tight mt-1 animate-pulse flex items-center gap-1">
                    <Clock size={10} /> Expiring Soon
                  </span>
                )}
              </div>
              <span className="text-sm md:text-base font-bold text-text-primary tracking-tighter">{progressPercent}%</span>
           </div>
           <div className="w-full h-1.5 md:h-2 bg-border-main rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all duration-1000 ease-out", isAllFinished ? "bg-emerald-500" : "bg-brand-gold")}
                style={{ width: `${progressPercent}%` }}
              ></div>
           </div>
        </div>
      </div>

      <div className={cn("rounded-xl p-4 md:p-5 border mb-6", innerStatusColors[cardStatus as keyof typeof innerStatusColors] || innerStatusColors.upcoming)}>
        {isAllFinished ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-emerald-600 gap-4">
             <div className="flex items-center gap-3 md:gap-4">
               <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8" strokeWidth={2} />
               <div>
                 <p className="text-base md:text-lg font-black tracking-tight text-success-green">Campaign Completed</p>
                 <p className="text-xs md:text-sm font-medium text-emerald-600/80 mt-0.5 max-w-[200px] md:max-w-none">All missions are logged in the completed stack.</p>
               </div>
             </div>
          </div>
        ) : currentActive ? (
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-5 relative">
              <div className="absolute -top-4 -right-4 md:-top-6 md:-right-6">
                <div className={cn(
                  "px-3 py-1.5 md:px-4 md:py-2 rounded-bl-2xl shadow-lg border-b border-l font-black text-[10px] md:text-[12px] flex items-center gap-1.5",
                  currentActive.isBonus 
                    ? "bg-amber-400 text-amber-950 border-amber-500" 
                    : "bg-brand-gold-hover text-bg-main border-indigo-700"
                )}>
                  <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  +{currentActive.xpReward || (currentActive.isBonus ? 100 : 50)} XP
                </div>
              </div>
              <div className="pr-12 md:pr-0">
              {now > currentActive.dueDate && getMissionStatus(currentActive) !== 'retest' ? (
                <span className="inline-block px-2.5 py-1 md:px-3 bg-red-50 text-red-600 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-full border border-red-200 mb-2 md:mb-3 leading-none truncate max-w-full">
                  Missing - Penalty Active {currentActive.isBonus && (
                    currentActive.isDuoBonus ? `• DUO BONUS` : `• BONUS`
                  )} {currentActive.bonusType === 'presentation' ? 'PRESENTATION' : 'TEST'} M{currentActive.missionNumber || 1}
                </span>
              ) : getMissionStatus(currentActive) === 'retest' ? (
                <span className="inline-block px-2.5 py-1 md:px-3 bg-brand-gold/20 text-brand-gold text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-full border border-brand-gold/40 mb-2 md:mb-3 leading-none animate-pulse">
                  Retest Required {currentActive.isBonus && (
                    currentActive.isDuoBonus ? `• DUO BONUS` : `• BONUS`
                  )} {currentActive.bonusType === 'presentation' ? 'PRESENTATION' : 'TEST'} M{currentActive.missionNumber || 1}
                </span>
              ) : (
                <span className={cn("inline-block px-2.5 py-1 md:px-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-full border mb-2 md:mb-3 leading-none", currentActive.isBonus ? "bg-brand-gold/20 text-brand-gold border-brand-gold/30" : "bg-success-green/10 text-emerald-600 border-success-green/30")}>
                  Active Now {currentActive.isBonus && (
                    currentActive.isDuoBonus ? `• DUO BONUS` : `• BONUS`
                  )} {currentActive.bonusType === 'presentation' ? 'PRESENTATION' : 'TEST'} M{currentActive.missionNumber || 1}
                </span>
              )}
              <h3 className="font-black text-lg md:text-xl tracking-tight text-text-primary leading-tight pr-4">{currentActive.title}</h3>
              <ExpandableText text={currentActive.description} maxLength={60} className="mt-1 md:mt-2 lg:max-w-md" textClassName="text-xs md:text-sm text-text-secondary font-medium" />
            </div>
            <div className="flex flex-row md:flex-wrap items-center gap-2 md:gap-3 w-full lg:w-auto mt-2 lg:mt-0">
              <div className="flex-1 lg:flex-none bg-bg-surface px-3 md:px-4 py-3 md:py-3 rounded-xl md:rounded-2xl border border-border-main shadow-sm flex items-center justify-center gap-2 min-w-[120px]">
                 <Clock className={cn("w-3.5 h-3.5 md:w-4 md:h-4", now > currentActive.dueDate ? "text-red-500 animate-pulse" : "text-amber-500")} />
                 <span className="font-mono font-bold text-xs md:text-sm text-text-primary tracking-tight">{timeLeftStr || '00:00:00'}</span>
              </div>
              <button 
                onClick={() => navigate(`/assignments/${currentActive!.id}`)}
                className="flex-1 lg:flex-none flex justify-center items-center gap-1 md:gap-2 px-4 md:px-6 py-3 bg-text-primary hover:bg-text-secondary/80 hover:text-bg-main text-bg-main rounded-xl md:rounded-2xl font-bold text-sm transition-colors active:scale-95 group/btn"
              >
                {now > currentActive.dueDate ? 'Resolve' : 'Start'} <ChevronRight className="w-4 h-4 md:group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        ) : upcoming ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-5 opacity-80">
            <div>
              <span className="inline-block px-2.5 py-1 md:px-3 bg-brand-gold/10 text-brand-gold text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-full border border-brand-gold/30 mb-2 md:mb-3">Upcoming</span>
              <h3 className="font-black text-lg md:text-xl tracking-tight text-text-primary leading-tight">{upcoming.title}</h3>
              <p className="text-xs md:text-sm text-text-secondary font-medium mt-1 md:mt-2">Starts {upcoming.startDate ? format(upcoming.startDate, 'PPp') : 'TBD'}</p>
            </div>
            <div className="flex items-center w-full md:w-auto mt-2 md:mt-0">
              <div className="w-full bg-bg-surface px-4 py-3 rounded-xl border border-border-main shadow-sm flex items-center gap-2 justify-center">
                 <Target className="w-4 h-4 text-amber-500" />
                 <span className="font-mono font-bold text-xs md:text-sm text-text-primary tracking-tight">In {timeLeftStr}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-5 opacity-80">
            <div>
              <span className="inline-block px-2.5 py-1 md:px-3 bg-border-main text-text-secondary text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-full mb-2 md:mb-3">Campaign Concluded</span>
              <p className="font-black text-base md:text-lg text-text-primary tracking-tight">Missions have expired.</p>
              <p className="text-xs md:text-sm text-text-secondary font-medium mt-1">You missed the deadlines for this campaign.</p>
            </div>
            <button 
                onClick={() => navigate(`/assignments/${sortedItems[sortedItems.length-1].id}`)}
                className="w-full md:w-auto px-5 py-3 bg-bg-surface hover:bg-bg-main border border-border-main text-text-primary rounded-xl text-sm font-bold transition-all active:scale-95 shadow-sm mt-2 md:mt-0"
             >
                Review Last
             </button>
          </div>
        )}
      </div>

      {/* Campaign Missions Timeline Scroll */}
      <div className="relative">
        <h4 className="text-[11px] font-bold text-text-secondary uppercase tracking-widest mb-3 ml-2 flex items-center gap-2">
          {isDuoGroup ? 'Duo Mission Components' : 'Campaign Pathway'}
          <ArrowRight className="w-3 h-3 text-text-secondary/80" />
        </h4>
        <div 
          ref={sliderRef}
          className="flex gap-3 overflow-x-auto pb-4 px-2 -mx-2 snap-x hide-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {sortedItems.map((a, i) => {
            const state = getMissionState(a);
            const isCompleted = state.status === 'completed';
            const isActive = currentActive?.id === a.id;
            const isLocked = state.locked;
            
            return (
              <div 
                key={a.id}
                onClick={() => !isLocked && navigate(`/assignments/${a.id}`)}
                className={cn(
                  "snap-start shrink-0 w-[240px] p-4 rounded-2xl border transition-all duration-300 relative group flex flex-col",
                  isCompleted ? "bg-success-green/10/50 border-success-green/20 cursor-pointer hover:bg-success-green/10" : 
                  isActive ? "bg-bg-surface border-indigo-300 shadow-md ring-1 ring-indigo-200 cursor-pointer" :
                  isLocked ? "bg-bg-main/50 border-border-main opacity-60 cursor-not-allowed" : 
                  "bg-bg-surface border-border-main shadow-sm cursor-pointer hover:shadow-md"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                   <div className="flex flex-col">
                     <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary/80">
                       {isDuoGroup ? (a.bonusType === 'test' ? 'Part A: Test' : 'Part B: Presentation') : `Phase ${i + 1}`}
                     </span>
                     {a.xpReward > 0 && (
                       <span className="text-[9px] font-bold text-brand-gold uppercase tracking-tighter">
                         ✨ {a.xpReward} XP
                       </span>
                     )}
                   </div>
                    <div className="flex items-center gap-1.5">
                     {(userRole === 'admin' || userRole === 'superadmin') && (
                       <button 
                         onClick={(e) => { e.stopPropagation(); onEdit?.(a); }}
                         className="p-1 px-2 flex items-center gap-1 bg-brand-gold-secondary-hover hover:bg-brand-gold-hover text-brand-gold hover:text-bg-main rounded-md transition-all border border-brand-gold/20"
                         title="Edit Mission"
                       >
                         <Edit size={10} />
                         <span className="text-[8px] font-black uppercase">Edit</span>
                       </button>
                     )}
                     {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                     {isLocked && <Lock className="w-3.5 h-3.5 text-text-secondary/80" />}
                     {isActive && <span className="w-2 h-2 bg-brand-gold rounded-full animate-pulse blur-[1px]"></span>}
                   </div>
                </div>
                <h5 className="font-bold text-text-primary text-sm leading-tight line-clamp-2 h-10 mb-2">
                  {a.title}
                </h5>
                <div className="mt-auto">
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-1 rounded-lg border",
                    isCompleted ? (enrollments.find(e => e.assignmentId === a.id)?.status === 'submitted' 
                      ? "bg-brand-gold/20 text-brand-gold border-brand-gold/30" 
                      : "bg-success-green/20 text-success-green border-success-green/30") :
                    state.status === 'retest' ? "bg-amber-500 text-bg-main border-amber-600 animate-pulse" :
                    isActive ? "bg-brand-gold-secondary-hover text-indigo-700 border-brand-gold/30" :
                    isLocked ? "bg-border-main text-text-secondary border-border-main" :
                    "bg-slate-100 text-slate-600 border-slate-200"
                  )}>
                    {isCompleted ? (enrollments.find(e => e.assignmentId === a.id)?.status === 'submitted' ? 'In Review' : 'Completed') : 
                     state.status === 'retest' ? 'RETEST' :
                     isActive ? 'Active Now' : isLocked ? 'Locked' : 'Available soon'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

