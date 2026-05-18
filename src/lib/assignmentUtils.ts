import { Assignment, Enrollment } from '../types';

export type MissionStatus = 'active' | 'upcoming' | 'completed' | 'missed' | 'retest';

export interface MissionState {
  status: MissionStatus;
  locked: boolean;
  isPastDue: boolean;
}

export const getAssignmentStatus = (
  assignment: Assignment,
  enrollments: Enrollment[],
  isStudent?: boolean,
  userId?: string
): MissionStatus => {
  const now = Date.now();
  const isPastDue = now > assignment.dueDate;
  const start = assignment.startDate || 0;
  const hasStarted = now >= start;

  if (isStudent && userId) {
    const enr = enrollments.find(e => e.assignmentId === assignment.id && e.studentId === userId);
    const isFinished = enr && (enr.status === 'submitted' || enr.status === 'graded');
    if (isFinished) return 'completed';
    
    if (enr && enr.status === 'active' && enr.graceDeadline && now <= enr.graceDeadline) {
      return 'retest';
    }
  }

  if (isPastDue) return 'missed';
  if (hasStarted) return 'active';
  return 'upcoming';
};

export const getStatusConfig = (status: MissionStatus, isBonus?: boolean) => {
  const configs = {
    active: {
      color: isBonus ? "bg-brand-gold/10 border-brand-gold shadow-glow-gold" : "bg-navy-900 border-navy-700 hover:border-brand-gold/30 shadow-soft",
      tag: isBonus ? "bg-brand-gold text-navy-950 border-brand-gold" : "bg-brand-gold/10 text-brand-gold border-brand-gold/20",
      label: "Active Mission",
    },
    upcoming: {
      color: "bg-navy-900/50 border-navy-700/50 opacity-80",
      tag: "bg-navy-800 text-text-muted border-navy-700",
      label: "Coming Soon",
    },
    completed: {
      color: "bg-navy-950/50 border-emerald-500/10 grayscale-[0.3]",
      tag: "bg-success/10 text-success border-success/20",
      label: "Mission Accomplished",
    },
    missed: {
      color: "bg-navy-950/50 border-error/10 grayscale-[0.5]",
      tag: "bg-error/10 text-error border-error/20",
      label: "Deadline Expired",
    },
    retest: {
      color: "bg-brand-gold/5 border-brand-gold/20 shadow-glow-gold",
      tag: "bg-brand-gold text-navy-950 border-brand-gold",
      label: "Clearance Granted",
    }
  };

  return configs[status] || configs.upcoming;
};
