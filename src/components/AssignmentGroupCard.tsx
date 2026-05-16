import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Assignment, Enrollment } from '../types';
import { BookOpen, ChevronRight, Target, Clock, CheckCircle2, Lock, ArrowRight, Edit, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ExpandableText } from './ExpandableText';
import { motion } from 'motion/react';

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
    active: "bg-navy-900 border-navy-700/50 hover:border-brand-gold/30 shadow-soft",
    upcoming: "bg-navy-900 opacity-80 border-navy-700/50",
    completed: "bg-navy-950/50 border-emerald-500/10 grayscale-[0.3]",
    missed: "bg-navy-950/50 border-error/10 grayscale-[0.5]",
  };

  return (
    <div className={cn(
      "card-premium p-4 md:p-6 transition-all duration-300", 
      isDuoGroup ? "bg-brand-gold/5 border-brand-gold/20" : (statusColors[cardStatus as keyof typeof statusColors] || statusColors.upcoming)
    )}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 md:w-12 md:h-12 border flex items-center justify-center shrink-0 rounded-xl transition-all",
            isDuoGroup ? "bg-brand-gold/10 border-brand-gold/20 text-brand-gold" : "bg-navy-800 border-navy-700 text-text-primary"
          )}>
            <BookOpen size={20} strokeWidth={2}/>
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-base md:text-lg font-display font-bold text-text-primary leading-tight truncate">{group.name}</h2>
              {isDuoGroup && (
                <span className="bg-brand-gold text-navy-950 text-[8px] font-bold px-1.5 py-0.5 rounded-sm tracking-wider">DUO</span>
              )}
            </div>
            <p className="text-text-secondary font-medium text-[11px] md:text-xs">
              {total} Missions • {progressPercent}% Progress
            </p>
          </div>
        </div>
        
        <div className="flex-1 w-full md:max-w-[180px]">
           <div className="w-full h-1 bg-navy-800 rounded-full overflow-hidden border border-navy-700">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1 }}
                className={cn("h-full rounded-full", isAllFinished ? "bg-success" : "bg-brand-gold")}
              />
           </div>
        </div>
      </div>

      <div className="bg-navy-800/40 border border-navy-700/30 rounded-xl p-4 mb-5 relative group">
        {isAllFinished ? (
          <div className="flex items-center gap-3 text-success">
             <CheckCircle2 size={24} />
             <div>
               <p className="text-sm font-bold">Campaign Success</p>
               <p className="text-[11px] opacity-70">Review your findings in the missions log.</p>
             </div>
          </div>
        ) : currentActive ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      "px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border",
                      now > currentActive.dueDate ? "bg-error/10 text-error border-error/20" : "bg-success/10 text-success border-success/20"
                    )}>
                      {now > currentActive.dueDate ? 'Deadline Expired' : 'Active Mission'} M{currentActive.missionNumber || 1}
                    </span>
                    {currentActive.xpReward > 0 && (
                      <span className="text-[10px] font-bold text-brand-gold">
                        +{currentActive.xpReward} XP
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm md:text-base text-text-primary leading-tight">{currentActive.title}</h3>
                </div>
                
                <div className="flex-shrink-0 bg-navy-900 border border-navy-700 rounded-lg px-2.5 py-1 flex items-center gap-2">
                  <Clock size={12} className={cn(now > currentActive.dueDate ? "text-error" : "text-brand-gold")} />
                  <span className="font-mono text-[11px] font-bold text-text-primary">{timeLeftStr || '00:00:00'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-navy-700/30 pt-3">
                <ExpandableText text={currentActive.description} maxLength={50} className="flex-1" textClassName="text-[11px] md:text-sm text-text-secondary" />
                <button 
                  onClick={() => navigate(`/assignments/${currentActive!.id}`)}
                  className="bg-text-primary text-navy-950 px-4 py-1.5 rounded-lg font-bold text-xs hover:bg-white active:scale-95 transition-all text-nowrap"
                >
                  {now > currentActive.dueDate ? 'Resolve' : 'View'}
                </button>
              </div>
            </div>
        ) : upcoming ? (
          <div className="flex items-center justify-between opacity-70">
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-text-secondary" />
              <div>
                <p className="text-sm font-bold text-text-primary">Next: {upcoming.title}</p>
                <p className="text-[11px] text-text-secondary">Opens {upcoming.startDate ? format(upcoming.startDate, 'PPp') : 'soon'}</p>
              </div>
            </div>
            <div className="text-[10px] font-mono font-bold">In {timeLeftStr}</div>
          </div>
        ) : (
          <p className="text-center text-xs text-text-secondary py-2 font-medium">All missions in this campaign have concluded.</p>
        )}
      </div>

      {/* Pathway Timeline */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {sortedItems.map((a, i) => {
          const state = getMissionState(a);
          const isCompleted = state.status === 'completed';
          const isActive = currentActive?.id === a.id;
          const isLocked = state.locked;
          
          return (
            <motion.div 
              whileHover={!isLocked ? { scale: 1.02 } : {}}
              key={a.id}
              onClick={() => !isLocked && navigate(`/assignments/${a.id}`)}
              className={cn(
                "shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer relative",
                isCompleted ? "bg-success/20 border-success text-success" : 
                isActive ? "bg-brand-gold/20 border-brand-gold text-brand-gold ring-4 ring-brand-gold/10" :
                isLocked ? "bg-navy-800 border-navy-700 opacity-40 cursor-not-allowed" : 
                "bg-navy-800 border-navy-700 text-text-secondary"
              )}
              title={a.title}
            >
              {isCompleted ? <CheckCircle2 size={14} /> : (isLocked ? <Lock size={12} /> : <span className="text-[10px] font-bold">{i + 1}</span>)}
              
              {isActive && (
                <div className="absolute -bottom-1 w-1 h-1 bg-brand-gold rounded-full" />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>

  );
};

