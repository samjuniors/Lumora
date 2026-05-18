import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Assignment, Enrollment } from '../types';
import { BookOpen, CheckCircle2, Lock, Clock, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { getAssignmentStatus, getStatusConfig } from '../lib/assignmentUtils';

interface AssignmentGroupCardProps { 
  group: { id?: string, name: string, items: Assignment[] }; 
  enrollments: Enrollment[]; 
  isStudent?: boolean; 
  userId?: string;
  onEdit?: (a: Assignment) => void;
}

export const AssignmentGroupCard: React.FC<AssignmentGroupCardProps> = ({ group, enrollments, isStudent, userId, onEdit }) => {
  const navigate = useNavigate();
  const now = Date.now();
  
  const sortedItems = [...group.items].sort((a, b) => Number(a.startDate || a.dueDate || 0) - Number(b.startDate || b.dueDate || 0));

  const getMissionState = (a: Assignment) => {
    const status = getAssignmentStatus(a, enrollments, isStudent, userId);
    
    if (isStudent && userId) {
      const index = sortedItems.findIndex(item => item.id === a.id);
      if (index > 0) {
        const prevStatus = getAssignmentStatus(sortedItems[index-1], enrollments, isStudent, userId);
        if (prevStatus !== 'completed' && prevStatus !== 'missed') {
          return { status, locked: true };
        }
      }
    }
    return { status, locked: false };
  };

  let currentActive: Assignment | null = null;
  let upcoming: Assignment | null = null;
  let finishedCount = 0;

  for (const a of sortedItems) {
    const state = getMissionState(a);
    if (state.status === 'completed') {
      finishedCount++;
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
      targetTime = Number(currentActive.dueDate || 0);
    } else if (upcoming) {
      targetTime = Number(upcoming.startDate || upcoming.dueDate || 0);
    }

    if (!targetTime || isAllFinished) return;

    const interval = setInterval(() => {
      const diff = targetTime - Date.now();
      if (diff <= 0) {
        setTimeLeftStr('00:00:00');
      } else {
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

  const overallStatus = isAllFinished ? 'completed' : (currentActive ? (now > Number(currentActive.dueDate || 0) ? 'missed' : 'active') : 'upcoming');
  const config = getStatusConfig(overallStatus as any);

  return (
    <div className={cn(
      "card-premium p-4 md:p-6 transition-all duration-300", 
      isDuoGroup ? "bg-brand-gold/5 border-brand-gold/20" : config.color
    )}>
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 border flex items-center justify-center shrink-0 rounded-xl transition-all",
            isDuoGroup ? "bg-brand-gold/10 border-brand-gold/20 text-brand-gold" : "bg-navy-800 border-navy-700 text-text-primary"
          )}>
            <BookOpen size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm md:text-base font-display font-bold text-text-primary truncate">{group.name}</h2>
              {isDuoGroup && (
                <span className="bg-brand-gold text-navy-950 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">Duo</span>
              )}
            </div>
            <p className="text-[10px] md:text-xs text-text-secondary font-bold uppercase tracking-tight">
              {total} Missions • {progressPercent}% Efficiency
            </p>
          </div>
        </div>
        
        <div className="hidden sm:block w-32 shrink-0">
           <div className="w-full h-1 bg-navy-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                className={cn("h-full", isAllFinished ? "bg-success shadow-glow-success" : "bg-brand-gold shadow-glow-gold")}
              />
           </div>
        </div>
      </div>

      <div className="bg-navy-950/40 border border-navy-700/30 rounded-2xl p-4 mb-4 relative overflow-hidden group">
        {isAllFinished ? (
          <div className="flex items-center gap-3 text-success">
             <div className="p-2 bg-success/10 rounded-lg">
                <CheckCircle2 size={20} />
             </div>
             <div>
                <p className="text-xs font-bold uppercase tracking-widest">Campaign Success</p>
                <p className="text-[10px] text-text-secondary">All objectives achieved. Rewards secured.</p>
             </div>
          </div>
        ) : currentActive ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={cn(
                      "px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest rounded border",
                      now > Number(currentActive.dueDate || 0) ? "bg-error/10 text-error border-error/20" : "bg-success/10 text-success border-success/20"
                    )}>
                      {now > Number(currentActive.dueDate || 0) ? 'Expired' : 'Active'} M{currentActive.missionNumber || 1}
                    </span>
                    {currentActive.xpReward > 0 && (
                      <span className="text-[9px] font-black text-brand-gold-hover uppercase">+{currentActive.xpReward} XP</span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-text-primary leading-tight truncate">{currentActive.title}</h3>
                </div>
                
                <div className="shrink-0 bg-navy-900/50 border border-navy-700 px-2 py-1 rounded-lg flex items-center gap-1.5">
                  <Clock size={10} className={cn(now > Number(currentActive.dueDate || 0) ? "text-error" : "text-brand-gold")} />
                  <span className="font-mono text-[10px] font-bold text-text-primary">{timeLeftStr || '00:00:00'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-navy-700/30">
                <p className="text-[11px] text-text-secondary font-medium line-clamp-1 flex-1">{currentActive.description}</p>
                <button 
                  onClick={() => navigate(`/assignments/${currentActive!.id}`)}
                  className="bg-brand-gold text-navy-950 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all shadow-glow-gold shrink-0 flex items-center gap-1"
                >
                  {now > Number(currentActive.dueDate || 0) ? 'Resolve' : 'Deploy'} <ChevronRight size={12} />
                </button>
              </div>
            </div>
        ) : upcoming ? (
          <div className="flex items-center justify-between opacity-70">
            <div className="flex items-center gap-3">
              <Clock size={18} className="text-text-secondary" />
              <div>
                <p className="text-xs font-bold text-text-primary">Next: {upcoming.title}</p>
                <p className="text-[10px] text-text-secondary">Expected {upcoming.startDate ? format(new Date(upcoming.startDate), 'MMM d') : 'soon'}</p>
              </div>
            </div>
            <div className="text-[9px] font-black text-brand-gold uppercase tracking-tighter">In {timeLeftStr}</div>
          </div>
        ) : (
          <p className="text-center text-[10px] text-text-secondary py-2 font-bold uppercase tracking-widest">Campaign Concluded</p>
        )}
      </div>

      <div className="flex justify-center sm:justify-start items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {sortedItems.map((a, i) => {
          const state = getMissionState(a);
          const isCompleted = state.status === 'completed';
          const isActive = currentActive?.id === a.id;
          const isLocked = state.locked;
          
          return (
            <motion.div 
              whileHover={!isLocked ? { scale: 1.05 } : {}}
              whileTap={!isLocked ? { scale: 0.95 } : {}}
              key={a.id}
              onClick={() => !isLocked && navigate(`/assignments/${a.id}`)}
              className={cn(
                "shrink-0 w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer relative",
                isCompleted ? "bg-success/10 border-success/30 text-success" : 
                isActive ? "bg-brand-gold/10 border-brand-gold text-brand-gold shadow-glow-gold" :
                isLocked ? "bg-navy-900 border-navy-800 opacity-30 cursor-not-allowed" : 
                "bg-navy-800 border-navy-700 text-text-secondary hover:border-brand-gold/50"
              )}
            >
              {isCompleted ? <CheckCircle2 size={14} /> : (isLocked ? <Lock size={12} /> : <span className="text-[10px] font-black">{i + 1}</span>)}
              {isActive && (
                <div className="absolute -bottom-0.5 w-1 h-1 bg-brand-gold rounded-full shadow-glow-gold" />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};


