import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Assignment, Enrollment } from '../types';
import { BookOpen, CheckCircle2, Lock, Clock, ChevronRight } from 'lucide-react';
import { Card, Button } from './CommonUI';
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
    <Card 
      variant="flat" 
      className={cn(
        "p-6 transition-all duration-300 border-white/[0.03]", 
        isDuoGroup ? "border-brand-gold/20" : ""
      )}
    >
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 border flex items-center justify-center shrink-0 rounded-2xl transition-all",
            isDuoGroup 
              ? "bg-brand-gold/10 border-brand-gold/20 text-brand-gold" 
              : "bg-white/[0.03] border-white/5 text-text-primary"
          )}>
            <BookOpen size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base md:text-lg font-black text-text-primary truncate tracking-tight">{group.name}</h2>
              {isDuoGroup && (
                <span className="bg-brand-gold text-bg-main text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest leading-none">Duo Ops</span>
              )}
            </div>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-[0.2em] leading-none">
              {total} Missions &bull; {progressPercent}% Tactical Efficiency
            </p>
          </div>
        </div>
        
        <div className="hidden sm:block w-32 shrink-0">
           <div className="w-full h-1 bg-white/[0.03] rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                className={cn("h-full", isAllFinished ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-brand-gold shadow-[0_0_8px_rgba(251,191,36,0.5)]")}
              />
           </div>
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/[0.03] rounded-2xl p-5 mb-6 relative overflow-hidden group">
        {isAllFinished ? (
          <div className="flex items-center gap-4 text-emerald-500">
             <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <CheckCircle2 size={20} />
             </div>
             <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1">Campaign Successful</p>
                <p className="text-xs text-text-muted font-medium">All objectives neutralized. Full XP yields secured.</p>
             </div>
          </div>
        ) : currentActive ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-md border",
                      now > Number(currentActive.dueDate || 0) ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-brand-gold/10 text-brand-gold border-brand-gold/20"
                    )}>
                      {now > Number(currentActive.dueDate || 0) ? 'Terminated' : 'Active'} Objective
                    </span>
                    {currentActive.xpReward > 0 && (
                      <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest">+{currentActive.xpReward} XP Priority</span>
                    )}
                  </div>
                  <h3 className="font-black text-base text-text-primary tracking-tight truncate">{currentActive.title}</h3>
                </div>
                
                <div className="shrink-0 bg-white/[0.03] border border-white/5 px-3 py-1.5 rounded-xl flex items-center gap-2">
                  <Clock size={12} className={cn(now > Number(currentActive.dueDate || 0) ? "text-rose-500" : "text-brand-gold")} />
                  <span className="font-mono text-xs font-black text-text-primary tracking-tighter">{timeLeftStr || '00:00:00'}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                <p className="text-[11px] text-text-muted font-bold tracking-tight line-clamp-1 flex-1">{currentActive.description}</p>
                <Button 
                  size="sm"
                  variant="gold"
                  icon={ChevronRight}
                  onClick={() => navigate(`/assignments/${currentActive!.id}`)}
                  className="shrink-0 text-[10px] font-black px-4"
                >
                  {now > Number(currentActive.dueDate || 0) ? 'Force Resolve' : 'Deploy Payload'}
                </Button>
              </div>
            </div>
        ) : upcoming ? (
          <div className="flex items-center justify-between opacity-50 px-2 py-1">
            <div className="flex items-center gap-4">
              <Clock size={20} className="text-text-muted" />
              <div>
                <p className="text-xs font-black text-text-primary uppercase tracking-widest">Awaiting Command: {upcoming.title}</p>
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-tight">Window opens {upcoming.startDate ? format(upcoming.startDate, 'MMM d') : 'imminently'}</p>
              </div>
            </div>
            <div className="text-[10px] font-black text-brand-gold uppercase tracking-[0.2em]">{timeLeftStr} Remaining</div>
          </div>
        ) : (
          <p className="text-center text-[10px] text-text-muted py-4 font-black uppercase tracking-[0.3em]">Campaign Concluded & Archive Sealed</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {sortedItems.map((a, i) => {
          const state = getMissionState(a);
          const isCompleted = state.status === 'completed';
          const isActive = currentActive?.id === a.id;
          const isLocked = state.locked;
          
          return (
            <motion.div 
              whileHover={!isLocked ? { scale: 1.05, y: -2 } : {}}
              whileTap={!isLocked ? { scale: 0.95 } : {}}
              key={a.id}
              onClick={() => !isLocked && navigate(`/assignments/${a.id}`)}
              className={cn(
                "shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer relative",
                isCompleted ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : 
                isActive ? "bg-brand-gold text-bg-main border-brand-gold shadow-lg shadow-brand-gold/20" :
                isLocked ? "bg-white/[0.02] border-white/5 opacity-30 cursor-not-allowed" : 
                "bg-white/[0.03] border-white/5 text-text-muted hover:border-white/20 hover:text-text-primary"
              )}
            >
              {isCompleted ? <CheckCircle2 size={16} /> : (isLocked ? <Lock size={14} /> : <span className="text-[11px] font-black">{i + 1}</span>)}
              {isActive && (
                <div className="absolute -bottom-1 w-1 h-1 bg-brand-gold rounded-full shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              )}
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
};


