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
import { Assignment } from '../types';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

interface AssignmentCalendarProps {
  assignments: Assignment[];
  onViewMission?: (id: string) => void;
}

export const AssignmentCalendar: React.FC<AssignmentCalendarProps> = ({ assignments }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

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
                  <span className="text-[10px] font-bold bg-brand-gold-secondary-hover text-indigo-700 px-1.5 py-0.5 rounded-md">
                    {dayAssignments.length}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                {dayAssignments.map((assignment, i) => (
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
                        assignment.dueDate < Date.now() 
                          ? "bg-bg-main border-border-main text-text-secondary hover:border-border-main"
                          : "bg-brand-gold-secondary-hover border-brand-gold/20 text-indigo-700 hover:border-indigo-300 hover:bg-brand-gold-secondary-hover"
                      )}
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-brand-gold opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="font-bold truncate" title={assignment.title}>
                        {assignment.title}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 opacity-80 text-[10px]">
                        <Clock className="w-3 h-3" />
                        {format(assignment.dueDate, 'h:mm a')}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      </div>
      </div>
    </div>
  );
};
