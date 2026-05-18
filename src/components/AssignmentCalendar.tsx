import React, { useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, Target } from 'lucide-react';
import { Assignment, Enrollment } from '../types';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

interface AssignmentCalendarProps {
  assignments: Assignment[];
  enrollments?: Enrollment[];
  isStudent?: boolean;
  onViewMission?: (id: string) => void;
}

export const AssignmentCalendar = React.memo(({ assignments, enrollments = [], isStudent = true }: AssignmentCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getAssignmentStatus = (a: Assignment) => {
    const now = Date.now();
    const isPastDue = now > a.dueDate;
    
    if (isStudent) {
        const enr = enrollments.find(e => e.assignmentId === a.id);
        const isFinished = enr && (enr.status === 'submitted' || enr.status === 'graded');
        if (isFinished) return 'completed';
        if (isPastDue) return 'missed';
        return 'pending';
    }
    
    return isPastDue ? 'completed' : 'pending';
  };

  const getAssignmentsForDate = (date: Date) => {
    return assignments.filter(assignment => isSameDay(new Date(assignment.dueDate), date));
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate
  });

  return (
    <div className="bg-bg-surface rounded-3xl shadow-sm border border-border-main overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-border-main flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-xl sm:text-2xl font-black text-text-primary flex items-center gap-2">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <button 
            onClick={goToToday}
            className="px-4 py-2 text-sm font-bold bg-brand-gold-secondary-hover text-indigo-700 hover:bg-brand-gold-secondary-hover rounded-xl transition-colors"
          >
            Today
          </button>
          <div className="flex border border-border-main rounded-xl overflow-hidden bg-bg-surface shrink-0">
            <button 
              onClick={prevMonth}
              className="p-2 hover:bg-border-main transition-colors text-text-secondary"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="w-px bg-border-main"></div>
            <button 
              onClick={nextMonth}
              className="p-2 hover:bg-border-main transition-colors text-text-secondary"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto w-full">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-7 bg-bg-main border-b border-border-main">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-3 text-center text-xs font-black uppercase tracking-wider text-text-secondary">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 border-l border-border-main">
            {days.map((day, dayIdx) => {
          const dayAssignments = getAssignmentsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);

          return (
            <div 
              key={day.toString()}
              className={cn(
                "min-h-[140px] p-2 border-b border-r border-border-main transition-colors",
                !isCurrentMonth && "bg-bg-main/50",
                isCurrentMonth && "bg-bg-surface",
                isCurrentDay && "ring-2 ring-indigo-500 ring-inset bg-brand-gold-secondary-hover/10"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  "w-7 h-7 flex items-center justify-center rounded-full text-sm font-black",
                  isCurrentDay ? "bg-brand-gold-hover text-bg-main shadow-md" : 
                  !isCurrentMonth ? "text-text-secondary/80" : "text-text-secondary"
                )}>
                  {format(day, 'd')}
                </span>
                {dayAssignments.length > 0 && (
                  <div className="flex items-center gap-1">
                    {/* Status Summary Dots */}
                    <div className="flex -space-x-1 mr-1">
                      {['completed', 'missed', 'pending'].map(status => {
                        const count = dayAssignments.filter(a => getAssignmentStatus(a) === status).length;
                        if (count === 0) return null;
                        return (
                          <div 
                            key={status}
                            className={cn(
                              "w-1.5 h-1.5 rounded-full border border-bg-surface",
                              status === 'completed' ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" :
                              status === 'missed' ? "bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.5)]" :
                              "bg-brand-gold shadow-[0_0_5px_rgba(212,175,55,0.5)]"
                            )}
                          />
                        );
                      })}
                    </div>
                    <span className="text-[10px] font-bold bg-brand-gold-secondary-hover text-indigo-700 px-1.5 py-0.5 rounded-md">
                      {dayAssignments.length}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                {dayAssignments.map((assignment, i) => {
                  const status = getAssignmentStatus(assignment);
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={assignment.id}
                    >
                      <Link 
                        to={`/assignments/${assignment.id}`}
                        className={cn(
                          "block px-2 py-1.5 text-xs rounded-lg border hover:shadow-sm transition-all group relative overflow-hidden",
                          status === 'completed' 
                            ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 hover:border-emerald-500/40"
                            : status === 'missed'
                            ? "bg-rose-500/5 border-rose-500/20 text-rose-600 hover:border-rose-500/40"
                            : "bg-brand-gold-secondary-hover border-brand-gold/20 text-indigo-700 hover:border-indigo-300"
                        )}
                      >
                        <div className={cn(
                          "absolute left-0 top-0 bottom-0 w-0.5 transition-opacity",
                          status === 'completed' ? "bg-emerald-500" :
                          status === 'missed' ? "bg-rose-500" : "bg-brand-gold"
                        )}></div>
                        <div className="font-bold truncate pr-3" title={assignment.title}>
                          {assignment.title}
                        </div>
                        <div className="flex items-center justify-between mt-0.5 opacity-80 text-[10px]">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(assignment.dueDate, 'h:mm a')}
                          </span>
                          {status === 'completed' && <span className="text-[8px] font-black uppercase tracking-tighter">SECURED</span>}
                          {status === 'missed' && <span className="text-[8px] font-black uppercase tracking-tighter">BREACHED</span>}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      </div>
      </div>
    </div>
  );
});
