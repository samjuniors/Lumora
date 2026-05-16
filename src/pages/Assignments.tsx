import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbProvider';
import { handleFirestoreError, OperationType } from '../lib/errorHandling';
import { Assignment, Enrollment, User } from '../types';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, Calendar as CalendarIcon, Clock, X, BookOpen, ChevronRight, ChevronDown, ChevronUp, Target, CheckCircle2, LayoutList, Sparkles, ArrowRight, Camera, Edit, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { ListSkeleton } from '../components/Skeletons';
import { notifyStudentsOfNewAssignment } from '../services/notificationService';

import { AssignmentGroupCard } from '../components/AssignmentGroupCard';
import { AssignmentCalendar } from '../components/AssignmentCalendar';
import { ExpandableText } from '../components/ExpandableText';

import { CompletedMissionsStack } from '../components/CompletedMissionsStack';

const MissionCard = ({ assignment, user, getAssignmentStatus, onEdit }: { assignment: Assignment, user: any, getAssignmentStatus: (a: Assignment) => string, onEdit?: (a: Assignment) => void }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const status = getAssignmentStatus(assignment);
  
  const statusColors = {
    active: "bg-brand-gold-secondary-hover border-indigo-300 ring-2 ring-indigo-200 shadow-md",
    upcoming: "bg-slate-50 border-slate-200 hover:bg-slate-100",
    completed: "bg-success-green/20 border-emerald-300 ring-1 ring-emerald-400 shadow-sm",
    missed: "bg-rose-500/20 border-rose-300 ring-1 ring-rose-400 shadow-sm",
  };

  const statusTags = {
    active: assignment.isBonus ? 'bg-amber-500 text-bg-main border-amber-600' : 'bg-brand-gold-hover text-bg-main border-indigo-700 shadow-md shadow-indigo-200/50',
    upcoming: 'bg-border-main text-text-secondary border-border-main',
    completed: 'bg-success-green/20 text-emerald-800 border-success-green/30 font-bold',
    missed: 'bg-rose-500/20 text-rose-800 border-rose-500/30 font-bold',
  };

  return (
    <motion.div 
      layout
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
      }}
      className={cn(
        "rounded-[2rem] p-6 lg:p-8 border shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col relative overflow-hidden group cursor-pointer", 
        assignment.isBonus ? "bg-brand-gold/20 border-amber-400 ring-2 ring-amber-200 shadow-amber-200/50" : statusColors[status as keyof typeof statusColors]
      )}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {assignment.isBonus && (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-transparent opacity-50 z-0"></div>
      )}
      
      {/* XP Corner Badge */}
      <div className="absolute -top-1 -right-1 z-30">
        <div className={cn(
          "px-4 py-2 rounded-bl-3xl shadow-lg border-b border-l font-black text-[12px] flex items-center gap-1.5",
          assignment.isBonus 
            ? "bg-amber-400 text-amber-950 border-amber-500" 
            : "bg-brand-gold-hover text-bg-main border-indigo-700"
        )}>
          <Sparkles className="w-3.5 h-3.5" />
          +{assignment.xpReward || (assignment.isBonus ? 100 : 50)} XP
        </div>
      </div>

      <div className={cn("absolute top-0 left-0 w-full h-1.5 transition-colors z-10", 
        assignment.isBonus ? "bg-amber-400 group-hover:bg-amber-500 animate-pulse" : 
        status === 'completed' ? 'bg-emerald-500' : 
        status === 'missed' ? 'bg-rose-500' : 
        status === 'active' ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-border-main'
      )}></div>
      
      <div className="flex justify-between items-start mb-4 z-10 relative">
         <span className={cn(
            "px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border shadow-sm",
            statusTags[status as keyof typeof statusTags]
         )}>
            {status} {assignment.isBonus && (
              assignment.isDuoBonus ? `• DUO BONUS` : `• BONUS`
            )} {assignment.bonusType === 'presentation' ? 'PRESENTATION' : 'TEST'} M{assignment.missionNumber || 1}
            {assignment.isGlobal && <span className="ml-2 font-black text-indigo-200">🌎 GLOBAL</span>}
         </span>
         <div className="flex items-center gap-3">
           <span className="text-[11px] font-bold text-text-secondary/80 flex items-center gap-1 bg-bg-surface/60 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm pr-12"><Clock className="w-3.5 h-3.5"/> {format(assignment.dueDate, 'MMM d, h:mm a')}</span>
         </div>
      </div>
      
      <div className="flex justify-between items-center gap-2 mb-2 z-10 relative">
        <h3 className={cn("font-black text-xl lg:text-2xl leading-tight tracking-tight flex-1", assignment.isBonus ? "text-amber-900" : "text-text-primary")}>
          {assignment.title}
        </h3>
        {isExpanded ? <ChevronUp className="w-5 h-5 text-text-secondary/80 shrink-0" /> : <ChevronDown className="w-5 h-5 text-text-secondary/80 shrink-0" />}
      </div>
      
      {(user?.role === 'admin' || user?.role === 'superadmin') && (
        <div className="absolute top-4 right-4 z-20 flex gap-2">
           <button 
            onClick={(e) => { e.stopPropagation(); onEdit?.(assignment); }}
            className="flex items-center gap-2 px-3 py-2 bg-brand-gold-hover text-bg-main rounded-xl hover:bg-indigo-700 transition-all shadow-lg scale-100 hover:scale-105 active:scale-95"
            title="Edit Deployed Mission"
           >
             <Edit size={14} />
             <span className="text-[10px] font-black uppercase tracking-wider">Edit Mission</span>
           </button>
        </div>
      )}
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden z-10 relative mb-6"
          >
            <div className="pt-2 text-sm md:text-base font-medium text-text-secondary leading-relaxed">
              {assignment.description}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="mt-auto pt-4 z-10 relative">
        <button 
          onClick={(e) => { e.stopPropagation(); navigate(`/assignments/${assignment.id}`); }} 
          className={cn(
            "w-full py-3.5 lg:py-4 font-bold rounded-2xl transition-colors duration-300 flex items-center justify-center gap-2 text-sm group/btn shadow-sm border", 
            assignment.isBonus ? "bg-brand-gold/20 hover:bg-amber-500 hover:text-bg-main text-amber-900 border-brand-gold/30" : 
            status === 'completed' ? "bg-success-green/10 hover:bg-emerald-600 text-emerald-800 hover:text-bg-main border-success-green/30" :
            status === 'active' ? "bg-brand-gold-hover hover:bg-indigo-700 text-bg-main border-indigo-700 shadow-md shadow-indigo-200/50" :
            status === 'missed' ? "bg-rose-500/10 hover:bg-rose-600 text-rose-800 hover:text-bg-main border-rose-500/30" :
            "bg-bg-surface hover:bg-text-primary hover:text-bg-main hover:text-bg-main text-text-primary border-border-main"
          )}
        >
           {user?.role === 'student' ? (status === 'completed' ? 'View Results' : 'Start Mission') : 'Manage Mission'} 
           <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform"/>
        </button>
      </div>
    </motion.div>
  );
};

let cachedAllAssignments: Assignment[] | null = null;
let cachedAllEnrollments: Enrollment[] | null = null;
let lastAssignmentsUserId: string | null = null;

export const Assignments = () => {
  const { user } = useAuth();
  
  if (user && lastAssignmentsUserId !== user.id) {
     cachedAllAssignments = null;
     cachedAllEnrollments = null;
     lastAssignmentsUserId = user.id;
  }

  const navigate = useNavigate();
  const location = useLocation();
  const [assignments, setAssignments] = useState<Assignment[]>(cachedAllAssignments || []);
  const [studentEnrollments, setStudentEnrollments] = useState<Enrollment[]>(cachedAllEnrollments || []);
  const [showModal, setShowModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    // Read filter from query params
    const params = new URLSearchParams(location.search);
    const filter = params.get('filter');
    if (filter) {
      setFilterStatus(filter);
    }
  }, [location.search]);

  useEffect(() => {
    const state = window.history.state?.usr;
    if (state?.editId && assignments.length > 0) {
      const toEdit = assignments.find(a => a.id === state.editId);
      if (toEdit) setEditingAssignment(toEdit);
    }
  }, [assignments]);

  useEffect(() => {
    fetchAssignments();
  }, [user?.id, user?.role, user?.email]);

  const [sortBy, setSortBy] = useState<string>('campaign');
  const [isLoading, setIsLoading] = useState(!cachedAllAssignments);

  const fetchAssignments = async () => {
    if (assignments.length === 0 && !cachedAllAssignments) setIsLoading(true);
    try {
      let allAssignments = await dbService.getAllAssignments();
      
      if (user?.role === 'student') {
        // Filter out assignments not meant for this student
        allAssignments = allAssignments.filter(a => {
          // If explicitly global, show to everyone
          if (a.isGlobal === true) return true;
          // If explicitly restricted, check if user is allowed
          if (a.isGlobal === false) {
             return a.allowedStudents?.includes(user.id) || (user.email && a.allowedStudents?.includes(user.email.toLowerCase())) || false;
          }
          // Legacy check: if no isGlobal field, default to public
          if (a.isGlobal === undefined) {
             if (!a.allowedStudents || a.allowedStudents.length === 0) return true;
             return a.allowedStudents.includes(user.id) || (user.email && a.allowedStudents.includes(user.email.toLowerCase()));
          }
          return false;
        });

        const enrollments = await dbService.getEnrollmentsByStudent(user.id);
        setStudentEnrollments(enrollments);
        cachedAllEnrollments = enrollments;
      }
      
      setAssignments(allAssignments);
      cachedAllAssignments = allAssignments;
    } catch (error: any) {
      handleFirestoreError(error, OperationType.LIST, 'assignments');
    } finally {
      setIsLoading(false);
    }
  };

  // Group assignments by subject and campaign
  const filteredAssignments = useMemo(() => {
    if (filterStatus === 'all') return assignments;
    return assignments.filter(a => {
        const status = getAssignmentStatus(a);
        if (filterStatus === 'retest') {
            const enr = studentEnrollments.find(e => e.assignmentId === a.id);
            return status === 'active' && enr?.graceDeadline && enr.graceDeadline > Date.now();
        }
        return status === filterStatus;
    });
  }, [assignments, filterStatus, studentEnrollments, user]);

  const groupedAssignments = useMemo(() => {
    const groups: Record<string, { sKey: string, items: Assignment[] }> = {};
    filteredAssignments.forEach(a => {
      // Priority 1: Duo Mission Grouping
      if (a.isDuoBonus && a.duoId) {
        const groupKey = `duo___${a.duoId}`;
        if (!groups[groupKey]) groups[groupKey] = { sKey: `Duo Bonus: ${a.title.replace(/ \((Test|Presentation)\)$/, '')}`, items: [] };
        groups[groupKey].items.push(a);
        return;
      }

      // Priority 2: Subject/Campaign Grouping
      let sKey = a.subject;
      if (!sKey) {
        sKey = a.title.replace(/ \((Session|Day) \d+\)$/, '');
      }
      if (!sKey) sKey = 'General Tasks';
      
      const groupKey = `${sKey}___${a.campaignId || a.id}`;
      if (!groups[groupKey]) groups[groupKey] = { sKey, items: [] };
      groups[groupKey].items.push(a);
    });
    
    // Sort assignments inside each group by startDate or dueDate
    Object.keys(groups).forEach(k => {
      groups[k].items.sort((a, b) => {
        const tA = a.startDate || a.dueDate;
        const tB = b.startDate || b.dueDate;
        return tA - tB;
      });
    });

    return Object.entries(groups).map(([id, group]) => ({ id, name: group.sKey, items: group.items }));
  }, [assignments]);

  const getAssignmentStatus = (a: Assignment) => {
    const now = Date.now();
    const isPastDue = now > a.dueDate;
    const start = a.startDate || 0;
    const hasStarted = now >= start;

    if (user?.role === 'student') {
      const enr = studentEnrollments.find(e => e.assignmentId === a.id);
      const isFinished = enr && (enr.status === 'submitted' || enr.status === 'graded');
      if (isFinished) return 'completed';
    } else {
       if (isPastDue) return 'completed';
    }

    if (isPastDue) return 'missed';
    if (hasStarted) return 'active';
    return 'upcoming';
  };

  const sortedFlatAssignments = useMemo(() => {
    if (sortBy === 'campaign') return [];
    
    let sorted = [...filteredAssignments];
    
    if (sortBy === 'dueDateAsc') {
       sorted.sort((a, b) => a.dueDate - b.dueDate);
    } else if (sortBy === 'dueDateDesc') {
       sorted.sort((a, b) => b.dueDate - a.dueDate);
    } else if (sortBy === 'titleAsc') {
       sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortBy === 'titleDesc') {
       sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
    } else if (sortBy === 'status') {
       const statusWeight = { active: 1, upcoming: 2, missed: 3, completed: 4 };
       sorted.sort((a, b) => {
          const sA = getAssignmentStatus(a);
          const sB = getAssignmentStatus(b);
          if (statusWeight[sA as keyof typeof statusWeight] === statusWeight[sB as keyof typeof statusWeight]) {
             return a.dueDate - b.dueDate;
          }
          return (statusWeight[sA as keyof typeof statusWeight]) - (statusWeight[sB as keyof typeof statusWeight]);
       });
    }
    return sorted;
  }, [assignments, sortBy, studentEnrollments, user]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  // if (isLoading && assignments.length === 0) return <div className="max-w-6xl mx-auto"><ListSkeleton /></div>;

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key="assignments-page"
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.3 }}
        className="max-w-6xl mx-auto px-4 space-y-4 md:space-y-8 pb-8"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 md:mb-8 gap-4 md:gap-6 border-b border-border-main pb-4 md:pb-6">
        <div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl md:text-5xl font-black text-text-primary tracking-tight flex items-center gap-4"
          >
            Missions
            {isLoading && assignments.length === 0 && <span className="w-6 h-6 border-4 border-brand-gold border-t-transparent rounded-full animate-spin opacity-50 shadow-[0_0_10px_rgba(212,175,55,0.5)]" />}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-text-secondary mt-1 md:mt-3 font-medium text-sm md:text-lg"
          >
            Master your subjects one assignment at a time.
          </motion.p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
          <div className="bg-bg-main p-1 rounded-xl border border-border-main flex items-center gap-1 w-full md:w-auto">
            <button 
              onClick={() => { setFilterStatus('all'); navigate('/assignments'); }}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", filterStatus === 'all' ? "bg-bg-surface text-text-primary shadow-sm border border-border-main" : "text-text-secondary hover:text-text-primary")}
            >
              All
            </button>
            <button 
              onClick={() => setFilterStatus('active')}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", filterStatus === 'active' ? "bg-brand-gold-hover text-bg-main shadow-md" : "text-text-secondary hover:text-text-primary")}
            >
              Active
            </button>
            <button 
              onClick={() => setFilterStatus('completed')}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", filterStatus === 'completed' ? "bg-emerald-600 text-bg-main shadow-md" : "text-text-secondary hover:text-text-primary")}
            >
              Completed
            </button>
            <button 
              onClick={() => setFilterStatus('missed')}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", filterStatus === 'missed' ? "bg-rose-600 text-bg-main shadow-md" : "text-text-secondary hover:text-text-primary")}
            >
              Missed
            </button>
            <button 
              onClick={() => setFilterStatus('retest')}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", filterStatus === 'retest' ? "bg-amber-500 text-bg-main shadow-md" : "text-text-secondary hover:text-text-primary")}
            >
              Retest
            </button>
          </div>
          
          <div className="bg-bg-main p-1 rounded-xl border border-border-main flex items-center gap-1 w-full md:w-auto">
            <button 
              onClick={() => setViewMode('list')}
              className={cn("flex-1 md:flex-none justify-center px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-colors flex items-center gap-2", viewMode === 'list' ? "bg-bg-surface text-text-primary shadow-sm border border-border-main" : "text-text-secondary hover:text-text-primary hover:bg-bg-main")}
            >
              <LayoutList className="w-3.5 h-3.5 md:w-4 md:h-4" />
              List
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={cn("flex-1 md:flex-none justify-center px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-colors flex items-center gap-2", viewMode === 'calendar' ? "bg-bg-surface text-text-primary shadow-sm border border-border-main" : "text-text-secondary hover:text-text-primary hover:bg-bg-main")}
            >
              <CalendarIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Calendar
            </button>
          </div>
          
          {viewMode === 'list' && (
              <div className="bg-bg-main px-3 md:px-4 py-2 rounded-xl border border-border-main flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                <span className="text-xs md:text-sm font-bold text-text-secondary uppercase tracking-wider shrink-0">Sort</span>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs md:text-sm font-bold text-text-primary ml-1 cursor-pointer focus:ring-0 w-full md:w-auto"
                >
                    <option value="campaign" className="bg-bg-surface text-text-primary">By Campaign</option>
                    <option value="dueDateAsc" className="bg-bg-surface text-text-primary">Due: Soonest</option>
                    <option value="dueDateDesc" className="bg-bg-surface text-text-primary">Due: Furthest</option>
                    <option value="status" className="bg-bg-surface text-text-primary">By Status</option>
                </select>
              </div>
          )}
        </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {viewMode === 'calendar' ? (
          <motion.div variants={itemVariants} className="pt-2">
            <AssignmentCalendar assignments={assignments} />
          </motion.div>
        ) : sortBy === 'campaign' ? (
          <>
            {groupedAssignments.map((group) => (
              <motion.div variants={itemVariants} key={group.id}>
                <AssignmentGroupCard 
                  group={group} 
                  enrollments={studentEnrollments}
                  userRole={user?.role}
                  onEdit={a => setEditingAssignment(a)}
                />
              </motion.div>
            ))}
            {groupedAssignments.length === 0 && (
              <motion.div variants={itemVariants} className="py-20 flex flex-col items-center justify-center text-center text-text-secondary/80 bg-bg-surface rounded-3xl border border-dashed border-border-main shadow-sm">
                <div className="w-20 h-20 bg-bg-main rounded-full flex items-center justify-center mb-4">
                  <Sparkles className="w-10 h-10 text-text-secondary/60" />
                </div>
                <h3 className="text-xl font-black text-text-primary mb-2">You're All Caught Up!</h3>
                <p className="text-text-secondary max-w-sm text-sm">No missions available yet. Take a break or check back later.</p>
              </motion.div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {sortedFlatAssignments.map((assignment) => (
                <MissionCard 
                  key={assignment.id} 
                  assignment={assignment} 
                  user={user} 
                  getAssignmentStatus={getAssignmentStatus} 
                  onEdit={(a) => setEditingAssignment(a)}
                />
             ))}
             {sortedFlatAssignments.length === 0 && (
               <div className="col-span-full py-20 flex flex-col items-center justify-center text-center text-text-secondary/80 bg-bg-surface rounded-3xl border border-dashed border-border-main shadow-sm">
                  <div className="w-20 h-20 bg-bg-main rounded-full flex items-center justify-center mb-4">
                    <Sparkles className="w-10 h-10 text-text-secondary/60" />
                  </div>
                  <h3 className="text-xl font-black text-text-primary mb-2">You're All Caught Up!</h3>
                  <p className="text-text-secondary max-w-sm text-sm">No missions found. Take a break or check back later.</p>
               </div>
             )}
          </div>
        )}
      </motion.div>

      {user?.role === 'student' && (
        <div className="pt-8">
          <CompletedMissionsStack />
        </div>
      )}

      {showModal && <CreateAssignmentModal onClose={() => setShowModal(false)} onCreated={fetchAssignments} />}
      {editingAssignment && <EditAssignmentModal assignment={editingAssignment} onClose={() => setEditingAssignment(null)} onUpdated={fetchAssignments} />}
    </motion.div>
    </AnimatePresence>
  );
};



export const EditAssignmentModal = ({ assignment, onClose, onUpdated }: { assignment: Assignment, onClose: () => void, onUpdated: () => void }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState(assignment.title);
  const [description, setDescription] = useState(assignment.description);
  const [instructions, setInstructions] = useState(assignment.instructions || '');
  const [subject, setSubject] = useState(assignment.subject || '');
  const toLocalISOString = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [startDateStr, setStartDateStr] = useState(assignment.startDate ? toLocalISOString(new Date(assignment.startDate)) : '');
  const [dueDateStr, setDueDateStr] = useState(toLocalISOString(new Date(assignment.dueDate)));
  const [xpReward, setXpReward] = useState<number>(assignment.xpReward || 50);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(assignment.timeLimitMinutes || 0);
  const [entryFee, setEntryFee] = useState<number>(assignment.entryFee);
  const [bonusReward, setBonusReward] = useState<number>(assignment.bonusReward);
  const [penaltyFee, setPenaltyFee] = useState<number>(assignment.penaltyFee);
  const [rubric, setRubric] = useState<{name: string; description: string; weight: number}[]>(assignment.rubric || []);
  const [assignedStudents, setAssignedStudents] = useState<string[]>(assignment.allowedStudents || []);
  const [isGlobal, setIsGlobal] = useState(assignment.isGlobal !== false); // Default to true unless explicitly false
  const [sendEmail, setSendEmail] = useState(false);
  const [students, setStudents] = useState<{id: string, name: string, email: string}[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStudentsAndPreReg = async () => {
      try {
        const registered = await dbService.getUsersByRole('student');
        const preRegPending = await dbService.getPreRegisteredUsers();
        
        const registeredLite = registered.map(d => ({ id: d.id, name: d.name, email: d.email }));
        const preRegLite = preRegPending
            .filter(d => d.status === 'pending')
            .map(d => ({ id: d.email, name: d.name + ' (Pending Login)', email: d.email }));
        
        // Combine and unique by email
        const combined = [...registeredLite];
        preRegLite.forEach(p => {
          if (!combined.find(c => c.email.toLowerCase() === p.email.toLowerCase())) {
            combined.push(p);
          }
        });
        
        setStudents(combined);
      } catch (err: any) {
        handleFirestoreError(err, OperationType.GET, 'edit-modal/students');
      }
    };
    fetchStudentsAndPreReg();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Validation for rubric
      if (rubric.length > 0) {
        if (rubric.length < 5 || rubric.length > 10) {
          toast.error("Please set between 5 and 10 grading criteria.");
          setLoading(false);
          return;
        }
        const totalWeight = rubric.reduce((sum, r) => sum + r.weight, 0);
        if (Math.abs(totalWeight - 100) > 0.01) {
          toast.error(`Total weight must be 100% (currently ${totalWeight}%)`);
          setLoading(false);
          return;
        }
      }

      const updatedData = {
        title,
        description,
        instructions,
        subject,
        startDate: startDateStr ? new Date(startDateStr).getTime() : assignment.startDate,
        dueDate: new Date(dueDateStr).getTime(),
        xpReward,
        timeLimitMinutes,
        entryFee,
        bonusReward,
        penaltyFee,
        rubric,
        isGlobal,
        sendEmailNotification: sendEmail,
        allowedStudents: isGlobal ? [] : assignedStudents,
        updatedAt: Date.now()
      };
      
      await dbService.updateAssignment(assignment.id, updatedData);

      // Trigger Email Notification if requested
      if (sendEmail) {
        try {
          await notifyStudentsOfNewAssignment(title, description, isGlobal ? undefined : assignedStudents);
        } catch (emailErr) {
          console.error("Email notification failed during update:", emailErr);
          toast.error("Mission updated, but email alerts failed. Check your API settings.");
        }
      }

      toast.success("Mission updated successfully!");
      onUpdated();
      onClose();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `assignments/${assignment.id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this mission? This cannot be undone.")) return;
    setLoading(true);
    try {
      await dbService.updateAssignment(assignment.id, { status: 'archived', updatedAt: Date.now() });
      toast.success("Mission archived");
      onUpdated();
      onClose();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `assignments/${assignment.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-text-primary/50 backdrop-blur-sm z-50 flex py-12 px-4 justify-center overflow-y-auto translate-z-0">
      <div className="bg-bg-surface rounded-3xl max-w-2xl w-full h-fit flex flex-col shadow-2xl relative">
        <div className="flex justify-between items-center p-6 border-b border-border-main">
          <h2 className="text-2xl font-bold tracking-tight">Edit Mission</h2>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleDelete} className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-full transition-colors" title="Delete/Archive">
              <Trash2 className="w-5 h-5" />
            </button>
            <button type="button" onClick={onClose} className="p-2 hover:bg-border-main rounded-full transition-colors text-text-secondary">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
               <label className="block text-sm font-bold text-text-secondary mb-2">Subject</label>
               <input type="text" value={subject} onChange={e=>setSubject(e.target.value)} className="w-full px-4 py-2 border rounded-xl" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-text-secondary mb-2">Mission Title</label>
              <input type="text" required value={title} onChange={e=>setTitle(e.target.value)} className="w-full px-4 py-2 border rounded-xl" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-text-secondary mb-2">Description</label>
              <textarea required value={description} onChange={e=>setDescription(e.target.value)} rows={2} className="w-full px-4 py-2 border rounded-xl resize-none"></textarea>
            </div>
            <div className="md:col-span-2">
               <label className="block text-sm font-bold text-text-secondary mb-2">Visibility</label>
               <div className="grid grid-cols-2 gap-4 mb-4">
                  <button 
                    type="button"
                    onClick={() => setIsGlobal(true)}
                    className={cn(
                      "px-6 py-4 rounded-2xl font-bold text-sm border-2 transition-all",
                      isGlobal ? "bg-brand-gold-hover text-bg-main border-indigo-600 shadow-lg shadow-indigo-100" : "bg-bg-surface text-text-secondary/80 border-border-main hover:border-brand-gold/30"
                    )}
                  >
                    Global (All Students)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsGlobal(false)}
                    className={cn(
                      "px-6 py-4 rounded-2xl font-bold text-sm border-2 transition-all",
                      !isGlobal ? "bg-brand-gold-hover text-bg-main border-indigo-600 shadow-lg shadow-indigo-100" : "bg-bg-surface text-text-secondary/80 border-border-main hover:border-brand-gold/30"
                    )}
                  >
                    Selected Students
                  </button>
               </div>
               
               <div className="flex items-center gap-3 bg-brand-gold-secondary-hover/50 p-4 rounded-2xl border border-brand-gold/20 mb-6 group cursor-pointer" onClick={() => setSendEmail(!sendEmail)}>
                 <div className={cn(
                   "w-12 h-6 rounded-full transition-colors relative",
                   sendEmail ? "bg-brand-gold-hover" : "bg-slate-200"
                 )}>
                   <div className={cn(
                     "absolute top-1 left-1 w-4 h-4 bg-bg-surface rounded-full transition-transform",
                     sendEmail ? "translate-x-6" : "translate-x-0"
                   )} />
                 </div>
                 <div>
                   <p className="text-sm font-bold text-indigo-900 leading-none mb-1">Email Alert</p>
                   <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Send confirmation mail to participants</p>
                 </div>
               </div>
               
                {!isGlobal && (
                  <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between border-b border-border-main pb-2">
                       <div>
                         <label className="block text-sm font-bold text-indigo-900">Assign to specific students</label>
                         <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Only {assignedStudents.length} {assignedStudents.length === 1 ? 'student' : 'students'} will see this mission</p>
                       </div>
                       <div className="flex gap-2">
                         <button type="button" onClick={() => setAssignedStudents(students.map(s => s.id))} className="text-[10px] font-black text-brand-gold hover:text-indigo-800 transition-colors bg-brand-gold-secondary-hover px-3 py-1.5 rounded-lg active:scale-95">Select All</button>
                         <button type="button" onClick={() => setAssignedStudents([])} className="text-[10px] font-black text-text-secondary hover:text-text-secondary transition-colors bg-border-main px-3 py-1.5 rounded-lg active:scale-95">Clear</button>
                       </div>
                    </div>

                    <div className="flex items-center gap-3 bg-brand-gold-secondary-hover/50 p-4 rounded-2xl border border-brand-gold/20 mb-2 group cursor-pointer" onClick={() => setSendEmail(!sendEmail)}>
                      <div className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        sendEmail ? "bg-brand-gold-hover" : "bg-slate-200"
                      )}>
                        <div className={cn(
                          "absolute top-1 left-1 w-4 h-4 bg-bg-surface rounded-full transition-transform",
                          sendEmail ? "translate-x-6" : "translate-x-0"
                        )} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-indigo-900 leading-none mb-1">Email Alert</p>
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Send notification mail to participants</p>
                      </div>
                    </div>

                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Search by name or email..." 
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                        className="w-full px-5 py-3 bg-bg-surface border border-border-main rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-text-secondary/60"
                      />
                    </div>

                    <div className="bg-bg-main/50 border border-border-main p-2 rounded-[2rem] max-h-64 overflow-y-auto space-y-1.5 shadow-inner">
                      {/* Selected Students First */}
                      {assignedStudents.length > 0 && !studentSearch && (
                        <div className="px-2 pt-2 pb-1">
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-bg-surface/50 px-2 py-1 rounded-md border border-border-main">Selected ({assignedStudents.length})</span>
                        </div>
                      )}
                      
                      {students
                        .filter(s => assignedStudents.includes(s.id))
                        .map(s => (
                          <label key={s.id} className="flex items-center gap-3 bg-bg-surface p-3 rounded-2xl border border-brand-gold/30 cursor-pointer hover:bg-brand-gold-secondary-hover/30 transition-all group ring-2 ring-indigo-50 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                            <div className="w-5 h-5 rounded-md border-2 border-indigo-600 bg-brand-gold-hover flex items-center justify-center text-bg-main scale-110">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                            <input 
                              type="checkbox" 
                              className="hidden"
                              checked={true} 
                              onChange={() => setAssignedStudents(assignedStudents.filter(id => id !== s.id))} 
                            />
                            <div className="flex-1">
                              <div className="font-bold text-indigo-950 text-sm">{s.name}</div>
                              <div className="text-[10px] text-indigo-400 font-mono flex items-center gap-1.5">
                                <Sparkles className="w-2.5 h-2.5" /> {s.email}
                              </div>
                            </div>
                          </label>
                        ))
                      }

                      {/* Search Results / Unselected */}
                      {(assignedStudents.length > 0 && !studentSearch) && <div className="h-px bg-border-main my-2 mx-4" />}
                      
                      {students
                        .filter(s => !assignedStudents.includes(s.id))
                        .filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase()))
                        .map(s => (
                          <label key={s.id} className="flex items-center gap-3 bg-bg-surface/80 p-3 rounded-2xl border border-border-main cursor-pointer hover:border-indigo-300 hover:bg-bg-surface transition-all group">
                            <div className="w-5 h-5 rounded-md border-2 border-border-main flex items-center justify-center group-hover:border-indigo-400 text-transparent transition-all">
                              <CheckCircle2 className="w-3.5 h-3.5 group-hover:text-indigo-200" />
                            </div>
                            <input 
                              type="checkbox" 
                              className="hidden"
                              checked={false} 
                              onChange={() => setAssignedStudents([...assignedStudents, s.id])} 
                            />
                            <div className="flex-1">
                              <div className="font-bold text-text-primary text-sm">{s.name}</div>
                              <div className="text-[10px] text-text-secondary/80 font-mono">{s.email}</div>
                            </div>
                          </label>
                        ))
                      }

                      {students.length === 0 && (
                        <div className="p-8 text-center bg-bg-surface rounded-2xl border border-dashed border-border-main">
                          <p className="text-sm text-text-secondary/80 font-medium italic">No students available in system</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-text-secondary mb-2">AI Guidance</label>
              <textarea value={instructions} onChange={e=>setInstructions(e.target.value)} rows={3} className="w-full px-4 py-2 border rounded-xl resize-none"></textarea>
            </div>

            <div>
              <label className="block text-sm font-bold text-text-secondary mb-2">Start Date</label>
              <input type="datetime-local" value={startDateStr} onChange={e=>setStartDateStr(e.target.value)} className="w-full px-4 py-2 border rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-bold text-text-secondary mb-2">Deadline</label>
              <input type="datetime-local" required value={dueDateStr} onChange={e=>setDueDateStr(e.target.value)} className="w-full px-4 py-2 border rounded-xl" />
            </div>

            <div>
              <label className="block text-sm font-bold text-text-secondary mb-2 text-brand-gold">XP Reward</label>
              <input type="number" required value={xpReward} onChange={e=>setXpReward(Number(e.target.value))} className="w-full px-4 py-2 border rounded-xl border-brand-gold/30" />
            </div>

            <div className="md:col-span-1">
               <label className="block text-sm font-bold text-text-secondary mb-2">Time Limit (Min)</label>
               <input type="number" value={timeLimitMinutes} onChange={e=>setTimeLimitMinutes(Number(e.target.value))} className="w-full px-4 py-2 border rounded-xl" />
            </div>

            <div className="grid grid-cols-3 md:col-span-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">Fee</label>
                <input type="number" value={entryFee} onChange={e=>setEntryFee(Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl text-brand-gold font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">Reward</label>
                <input type="number" value={bonusReward} onChange={e=>setBonusReward(Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl text-emerald-600 font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">Penalty</label>
                <input type="number" value={penaltyFee} onChange={e=>setPenaltyFee(Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl text-rose-600 font-bold" />
              </div>
            </div>
          </div>

          <div className="md:col-span-2 bg-brand-gold-secondary-hover/50 p-6 rounded-2xl border border-brand-gold/20">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-indigo-900">Grading Rubric</h3>
                <p className="text-xs text-indigo-700 font-medium italic">At least 5 criteria (max 10). Total weight must be exactly 100%.</p>
              </div>
              <button type="button" onClick={() => setRubric([...rubric, {name: '', description: '', weight: 0}])} className="flex items-center gap-2 bg-brand-gold-secondary-hover text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-200 transition">
                <Plus className="w-4 h-4" /> Add Criterion ({rubric.length}/10)
              </button>
            </div>
            
            {rubric.length > 0 && (
              <div className="mb-4 flex items-center gap-3">
                <div className="flex-1 h-2 bg-bg-surface rounded-full overflow-hidden border border-brand-gold/20">
                  <div 
                    className={cn(
                      "h-full transition-all duration-300",
                      rubric.reduce((s, r) => s + r.weight, 0) === 100 ? "bg-emerald-500" : "bg-amber-500"
                    )} 
                    style={{ width: `${Math.min(100, rubric.reduce((s, r) => s + r.weight, 0))}%` }}
                  />
                </div>
                <span className={cn(
                  "text-xs font-black",
                  rubric.reduce((s, r) => s + r.weight, 0) === 100 ? "text-emerald-600" : "text-brand-gold"
                )}>
                  {rubric.reduce((s, r) => s + r.weight, 0)}% / 100%
                </span>
              </div>
            )}
            
            <div className="space-y-4">
              {rubric.map((r, i) => (
                <div key={i} className="flex gap-4 items-start bg-bg-surface p-4 rounded-xl border border-indigo-50">
                  <div className="flex-1 space-y-3">
                    <div className="flex gap-3">
                      <input type="text" value={r.name} onChange={e => { const newR = [...rubric]; newR[i].name = e.target.value; setRubric(newR); }} placeholder="Criterion Name" className="flex-1 px-3 py-2 border border-border-main rounded-lg text-sm outline-none focus:border-indigo-500 font-bold" />
                      <div className="flex items-center gap-2">
                        <input type="number" value={r.weight} onChange={e => { const newR = [...rubric]; newR[i].weight = Number(e.target.value); setRubric(newR); }} placeholder="%" className="w-20 px-3 py-2 border border-border-main rounded-lg text-sm outline-none focus:border-indigo-500" />
                        <span className="text-sm font-bold text-text-secondary">%</span>
                      </div>
                    </div>
                    <input type="text" value={r.description} onChange={e => { const newR = [...rubric]; newR[i].description = e.target.value; setRubric(newR); }} placeholder="Description..." className="w-full px-3 py-2 border border-border-main rounded-lg text-sm outline-none focus:border-indigo-500" />
                  </div>
                  <button type="button" onClick={() => setRubric(rubric.filter((_, idx) => idx !== i))} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-6">
            <button type="submit" disabled={loading} className="w-full bg-brand-gold-hover text-bg-main font-black py-4 rounded-xl hover:bg-indigo-700 transition shadow-lg disabled:opacity-50">
              {loading ? 'Saving Changes...' : 'Save Mission Updates'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PRESET_TEMPLATES = [
  {
    id: "ielts_writing_t1",
    label: "IELTS Academic Writing Task 1",
    title: "IELTS Academic Writing Task 1",
    subject: "IELTS Writing",
    description: "Summarize, describe or explain the information in your own words.",
    instructions: "Write at least 150 words. You should spend about 20 minutes on this task.",
    timeLimitMinutes: 20,
    rubric: [
      { name: "Task Achievement", description: "Addressing the requirements of the task.", weight: 20 },
      { name: "Coherence and Cohesion", description: "Logical organization and clear progression.", weight: 20 },
      { name: "Lexical Resource", description: "Range of vocabulary and accuracy.", weight: 20 },
      { name: "Grammatical Range", description: "Use of complex sentences and error-free structures.", weight: 20 },
      { name: "Spelling & Punctuation", description: "Accuracy in technical mechanics of writing.", weight: 20 }
    ]
  },
  {
    id: "ielts_writing_t2",
    label: "IELTS Academic Writing Task 2",
    title: "IELTS Academic Writing Task 2",
    subject: "IELTS Writing",
    description: "Write an essay in response to a point of view, argument or problem.",
    instructions: "Write at least 250 words. You should spend about 40 minutes on this task.",
    timeLimitMinutes: 40,
    rubric: [
      { name: "Task Response", description: "Fully addressing all parts of the task.", weight: 20 },
      { name: "Coherence and Cohesion", description: "Logical organization and clear progression.", weight: 20 },
      { name: "Lexical Resource", description: "Range of vocabulary and accuracy.", weight: 20 },
      { name: "Grammatical Range", description: "Use of complex sentences and error-free structures.", weight: 20 },
      { name: "Argument Strength", description: "Depth of logical reasoning and support for ideas.", weight: 20 }
    ]
  },
  {
    id: "book_review_1",
    label: "Advanced Book Review",
    title: "Critical Book Analysis",
    subject: "Literature",
    description: "Write a comprehensive review and critical analysis of a recent book you've read.",
    instructions: "Discuss themes, character development, and narrative structure.",
    timeLimitMinutes: 60,
    rubric: [
      { name: "Analysis Depth", description: "Quality of thematic analysis.", weight: 20 },
      { name: "Writing Style", description: "Clarity, tone, and engagement.", weight: 20 },
      { name: "Structure", description: "Introduction, body, and conclusion.", weight: 20 },
      { name: "Critical Perspective", description: "Originality and strength of unique arguments.", weight: 20 },
      { name: "Evidence & Usage", description: "Effective use of quotes and examples from text.", weight: 20 }
    ]
  },
  {
    id: "maya_duo_master",
    label: "Maya 3D Master (Duo Mission)",
    title: "Maya 3D Modeling Masterclass",
    subject: "3D Maya Modeling",
    description: "A comprehensive dual-phase mission: Technical Mesh Assessment followed by a Theoretical PDF Breakdown of production pipelines.",
    instructions: "Complete both the technical modeling test and the theoretical process presentation.",
    isBonus: true,
    isDuoBonus: true,
    testInstructions: "Technical Mesh Assessment: Submit high-res screenshots of your project in (1) Grayscale Shaded view to show silhouette clarity, and (2) Wireframe (Quads) view to show topology flow. Focus on Medium-Poly detail for assets/weapons.",
    testEntryFee: 30,
    testReward: 100,
    testPenalty: 50,
    testRubric: [
      { name: "Topology Flow", description: "Check for clean edge-loops, all-quads construction, and absence of N-gons.", weight: 20 },
      { name: "Silhouette & Form", description: "Evaluate the fidelity of the asset against standard product proportions.", weight: 20 },
      { name: "Poly-Efficiency", description: "Optimal use of geometry for a medium-detail asset without wasted spans.", weight: 15 },
      { name: "UV Mapping Foundation", description: "Logical UV shells, consistent texel density, and no major overlaps.", weight: 15 },
      { name: "Surface Normals", description: "Proper use of soft/hard edges and absence of shading artifacts.", weight: 15 },
      { name: "Technical Cleanup", description: "Freeze transforms, delete history, and correct pivot placement for engine export.", weight: 15 }
    ],
    presInstructions: "Modeling Theory & Pipeline PDF: Import a PDF containing your process breakdown. Must cover: Modular Kit theory, Environment scaling logic, and your asset pipeline from block-out to final mesh.",
    presEntryFee: 20,
    presReward: 70,
    presPenalty: 30,
    presRubric: [
      { name: "Concept Theory", description: "Depth of knowledge in Maya-specific modeling logic and modularity.", weight: 20 },
      { name: "Pipeline Clarity", description: "Clear explanation of the production steps and problem-solving.", weight: 20 },
      { name: "Documentation Quality", description: "Professional layout and clarity of the submitted PDF report.", weight: 15 },
      { name: "Comparative Analysis", description: "Critique of different modeling techniques used (e.g. Sub-D vs Boolean).", weight: 15 },
      { name: "Optimization Strategy", description: "Clear explanation of how geometry was managed for performance.", weight: 15 },
      { name: "Problem-Solving Log", description: "Detailed record of technical challenges overcome during the mission.", weight: 15 }
    ],
    timeLimitMinutes: 120,
    rubric: []
  }
];

export const CreateAssignmentModal = ({ onClose, onCreated }: { onClose: () => void, onCreated: () => void }) => {
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [subject, setSubject] = useState('');
  const [frequency, setFrequency] = useState('one_time');
  const [xpReward, setXpReward] = useState<number>(60);
  const [startDateStr, setStartDateStr] = useState('');
  const [dueDateStr, setDueDateStr] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(0);
  const [entryFee, setEntryFee] = useState<number>(15);
  const [bonusReward, setBonusReward] = useState<number>(30);
  const [penaltyFee, setPenaltyFee] = useState<number>(25);
  const [isBonus, setIsBonus] = useState<boolean>(false);
  const [isDuoBonus, setIsDuoBonus] = useState<boolean>(false);
  const [bonusType, setBonusType] = useState<'presentation' | 'test'>('test');
  const [missionNumber, setMissionNumber] = useState<number>(1);
  const [rubric, setRubric] = useState<{name: string; description: string; weight: number}[]>([]);
  const [testInstructions, setTestInstructions] = useState('');
  const [testRubric, setTestRubric] = useState<{name: string; description: string; weight: number}[]>([]);
  const [testStartDate, setTestStartDate] = useState('');
  const [testDueDate, setTestDueDate] = useState('');
  const [testEntryFee, setTestEntryFee] = useState(20);
  const [testReward, setTestReward] = useState(100);
  const [testPenalty, setTestPenalty] = useState(30);

  const [presInstructions, setPresInstructions] = useState('');
  const [presRubric, setPresRubric] = useState<{name: string; description: string; weight: number}[]>([]);
  const [presStartDate, setPresStartDate] = useState('');
  const [presDueDate, setPresDueDate] = useState('');
  const [presEntryFee, setPresEntryFee] = useState(20);
  const [presReward, setPresReward] = useState(100);
  const [presPenalty, setPresPenalty] = useState(30);
  const [assignedStudents, setAssignedStudents] = useState<string[]>([]);
  const [isGlobal, setIsGlobal] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [students, setStudents] = useState<{id: string, name: string, email: string}[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [dbTemplates, setDbTemplates] = useState<{id: string, label: string, title: string, subject: string, description: string, instructions: string, timeLimitMinutes: number, rubric: any[]}[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStudentsAndTemplates = async () => {
      try {
        const registered = await dbService.getUsersByRole('student');
        const preRegPending = await dbService.getPreRegisteredUsers();
        
        const registeredLite = registered.map(d => ({ id: d.id, name: d.name, email: d.email }));
        const preRegLite = preRegPending
            .filter(d => d.status === 'pending')
            .map(d => ({ id: d.email, name: d.name + ' (Pending Login)', email: d.email }));
        
        // Combine and unique by email
        const combined = [...registeredLite];
        preRegLite.forEach(p => {
          if (!combined.find(c => c.email.toLowerCase() === p.email.toLowerCase())) {
            combined.push(p);
          }
        });
        
        setStudents(combined);

        const dbTmpls = await dbService.getAssignmentTemplates();
        setDbTemplates(dbTmpls as any);
      } catch (err: any) {
        handleFirestoreError(err, OperationType.LIST, 'users/templates');
      }
    };
    fetchStudentsAndTemplates();
  }, []);

  const handleTemplateSelect = (val: string) => {
    setSelectedTemplate(val);
    const tmpl: any = [...PRESET_TEMPLATES, ...dbTemplates].find(t => t.id === val);
    if (!tmpl) return;

    setTitle(tmpl.title || '');
    setDescription(tmpl.description || '');
    setInstructions(tmpl.instructions || '');
    setSubject(tmpl.subject || '');
    setXpReward(tmpl.xpReward || (tmpl.isBonus ? 100 : 50));
    setTimeLimitMinutes(tmpl.timeLimitMinutes || 0);
    setRubric(tmpl.rubric ? [...tmpl.rubric] : []);

    if (tmpl.isDuoBonus) {
      setIsBonus(true);
      setIsDuoBonus(true);
      setTestInstructions(tmpl.testInstructions || '');
      setTestRubric(tmpl.testRubric || []);
      setPresInstructions(tmpl.presInstructions || '');
      setPresRubric(tmpl.presRubric || []);
      // Pre-fill fees if available in template
      if (tmpl.testEntryFee) setTestEntryFee(tmpl.testEntryFee);
      if (tmpl.testReward) setTestReward(tmpl.testReward);
      if (tmpl.testPenalty) setTestPenalty(tmpl.testPenalty);
      if (tmpl.presEntryFee) setPresEntryFee(tmpl.presEntryFee);
      if (tmpl.presReward) setPresReward(tmpl.presReward);
      if (tmpl.presPenalty) setPresPenalty(tmpl.presPenalty);

      // Set default dates if not provided
      const now = new Date();
      const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
      const inOneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const inTwoDays = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      const toLocalISO = (d: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };
      
      setTestStartDate(toLocalISO(now));
      setTestDueDate(toLocalISO(inOneDay));
      setPresStartDate(toLocalISO(inOneDay));
      setPresDueDate(toLocalISO(inTwoDays));
    } else {
      setIsBonus(tmpl.isBonus || false);
      setIsDuoBonus(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;
    
    // Validation for dates
    if (isDuoBonus) {
      if (!testStartDate || !testDueDate || !presStartDate || !presDueDate) {
        toast.error("Please set dates for both Test and Presentation missions");
        return;
      }
      // Rubric validation for Duo
      if (testRubric.length < 5 || testRubric.length > 10 || presRubric.length < 5 || presRubric.length > 10) {
        toast.error("Duo missions require 5-10 criteria for both Test and Presentation rubrics.");
        return;
      }
      const testWeight = testRubric.reduce((sum, r) => sum + r.weight, 0);
      const presWeight = presRubric.reduce((sum, r) => sum + r.weight, 0);
      if (Math.abs(testWeight - 100) > 0.01 || Math.abs(presWeight - 100) > 0.01) {
        toast.error("Total weight for each rubric must be 100%");
        return;
      }
    } else {
      if (!dueDateStr || (!isBonus && !startDateStr)) {
        toast.error("Please set the starting and deadline dates");
        return;
      }
      if (rubric.length > 0) {
        if (rubric.length < 5 || rubric.length > 10) {
          toast.error("Missions require 5-10 criteria for the rubric.");
          return;
        }
        const totalWeight = rubric.reduce((sum, r) => sum + (r.weight || 0), 0);
        if (Math.abs(totalWeight - 100) > 0.01) {
          toast.error(`Total weight must be 100% (currently ${totalWeight}%)`);
          return;
        }
      }
    }
    
    setLoading(true);
    try {
      const baseStart = isBonus ? new Date(dueDateStr).getTime() : new Date(startDateStr).getTime();
      const end = new Date(dueDateStr).getTime();
      
      const freq = isBonus ? 'one_time' : frequency;
      const step = freq === 'daily' ? 24 * 60 * 60 * 1000 : freq === 'alternate' ? 48 * 60 * 60 * 1000 : 0;
      
      const duoId = `duo-${Date.now()}`;
      const campaignId = Date.now().toString();
      
      const assignmentsToCreate = [];
      
      if (isBonus && isDuoBonus) {
        // Create Test Mission
        assignmentsToCreate.push({
          id: `test-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          title: `${title} (Test)`,
          description,
          instructions: testInstructions || instructions,
          rubric: testRubric.length > 0 ? testRubric : rubric,
          subject,
          frequency: 'one_time',
          entryFee: Number(testEntryFee),
          bonusReward: Number(testReward),
          penaltyFee: Number(testPenalty),
          isBonus: true,
          isDuoBonus: true,
          duoId,
          bonusType: 'test',
          missionNumber: Number(missionNumber),
          xpReward: Number(xpReward),
          campaignId,
          isGlobal,
          creatorId: user!.id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          startDate: new Date(testStartDate).getTime() || baseStart,
          dueDate: new Date(testDueDate).getTime() || end,
          ...(timeLimitMinutes ? { timeLimitMinutes } : {}),
          ...(isGlobal ? {} : assignedStudents.length > 0 ? { allowedStudents: assignedStudents } : {})
        });

        // Create Presentation Mission
        assignmentsToCreate.push({
          id: `pres-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          title: `${title} (Presentation)`,
          description,
          instructions: presInstructions || instructions,
          rubric: presRubric.length > 0 ? presRubric : rubric,
          subject,
          frequency: 'one_time',
          entryFee: Number(presEntryFee),
          bonusReward: Number(presReward),
          penaltyFee: Number(presPenalty),
          isBonus: true,
          isDuoBonus: true,
          duoId,
          bonusType: 'presentation',
          missionNumber: Number(missionNumber),
          xpReward: Number(xpReward),
          campaignId,
          isGlobal,
          creatorId: user!.id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          startDate: new Date(presStartDate).getTime() || baseStart,
          dueDate: new Date(presDueDate).getTime() || end,
          ...(timeLimitMinutes ? { timeLimitMinutes } : {}),
          ...(isGlobal ? {} : assignedStudents.length > 0 ? { allowedStudents: assignedStudents } : {})
        });
      } else {
        let currentStart = baseStart;
        let iteration = 1;
        const basePayload: any = {
           description,
           instructions,
           subject,
           isGlobal,
           frequency: freq,
           entryFee: Number(entryFee),
           bonusReward: Number(bonusReward),
           penaltyFee: Number(penaltyFee),
           xpReward: Number(xpReward),
           isBonus,
           isDuoBonus: isBonus ? isDuoBonus : false,
           campaignId,
           creatorId: user!.id,
           createdAt: Date.now(),
           updatedAt: Date.now()
        };
        
        if (isBonus && isDuoBonus) basePayload.duoId = `duo-${Date.now()}`;
        if (isBonus && bonusType) basePayload.bonusType = bonusType;
        if (isBonus && missionNumber) basePayload.missionNumber = Number(missionNumber);
        
        if (timeLimitMinutes) basePayload.timeLimitMinutes = timeLimitMinutes;
        if (!isGlobal && assignedStudents.length > 0) basePayload.allowedStudents = assignedStudents;
        
        if (freq === 'one_time') {
           const newAssignment: any = {
              id: Date.now().toString() + Math.random().toString(36).substring(7),
              title,
              startDate: currentStart,
              dueDate: end,
              ...basePayload
           };
           if (rubric.length > 0) newAssignment.rubric = rubric;
           assignmentsToCreate.push(newAssignment);
        } else {
           while (currentStart <= end) {
              let currentEnd = currentStart + (24 * 60 * 60 * 1000) - 1; 
              if (currentEnd > end) currentEnd = end;
              
              const newAssignment: any = {
                 id: Date.now().toString() + iteration + Math.random().toString(36).substring(7),
                 title: title + (freq === 'alternate' ? ` (Session ${iteration})` : ` (Day ${iteration})`),
                 startDate: currentStart,
                 dueDate: currentEnd,
                 ...basePayload
              };
              if (rubric.length > 0) newAssignment.rubric = rubric;
              assignmentsToCreate.push(newAssignment);
              
              currentStart += step;
              iteration++;
           }
        }
      }
      
      const promises = assignmentsToCreate.map(a => {
        const { id, ...data } = a;
        // If it was already set with a manual ID in the object, we should probably respect it or let createAssignment handle it
        // The previous code used setDoc(doc(db, 'assignments', id), data)
        // IDatabaseService only has createAssignment(assignment: Omit<Assignment, 'id'>)
        // If we want to keep the specific IDs generated, we might need to add a method to IDatabaseService or just use createAssignment and let it return an ID
        // But since these are often referenced elsewhere (like duoId), we should maybe keep them.
        // Actually, dbService.createAssignment doesn't take an ID.
        // I'll check if I can pass ID to createAssignment by casting or if I should just use the data.
        return dbService.createAssignment(data as any).catch(e => handleFirestoreError(e, OperationType.WRITE, `assignments/${id}`));
      });
      
      await Promise.all(promises);

      // Notify students via system notifications
      const studentSnap = await dbService.getUsersByRole('student');
      const notificationPromises = studentSnap.map(studentDoc => {
        return dbService.createNotification({
          userId: studentDoc.id,
          title: "New Mission Blast! 🚀",
          message: `A new mission "${title}" has been launched. Check it out!`,
          type: 'info',
          read: false,
          createdAt: Date.now()
        });
      });
      Promise.all(notificationPromises).catch(e => console.error("Batch notification failed:", e));

      // Trigger Email Notification if requested
      if (sendEmail) {
        try {
          await notifyStudentsOfNewAssignment(title, description, isGlobal ? undefined : assignedStudents);
        } catch (emailErr) {
          console.error("Email notification failed during creation:", emailErr);
          toast.error("Campaign created, but email alerts failed. Check your API settings.");
        }
      }

      onCreated();
      onClose();
    } catch(err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'assignments/campaign');
    } finally {
      setLoading(false);
    }
  };

  const toggleStudent = (sId: string) => {
     if (assignedStudents.includes(sId)) {
        setAssignedStudents(assignedStudents.filter(id => id !== sId));
     } else {
        setAssignedStudents([...assignedStudents, sId]);
     }
  };

  return (
    <div className="fixed inset-0 bg-text-primary/50 backdrop-blur-sm z-50 flex py-12 px-4 justify-center overflow-y-auto">
      <div className="bg-bg-surface rounded-3xl max-w-2xl w-full h-fit flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-border-main">
          <h2 className="text-2xl font-bold tracking-tight">New Campaign</h2>
          <button onClick={onClose} className="p-2 hover:bg-border-main rounded-full transition-colors text-text-secondary">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="bg-bg-main p-4 rounded-xl border border-border-main flex flex-col gap-2">
             <label className="text-xs font-bold uppercase tracking-widest text-text-secondary">Quick Start (Templates)</label>
             <select 
                value={selectedTemplate}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="px-4 py-2 bg-bg-surface rounded-lg border border-border-main outline-none text-sm font-medium text-text-primary"
             >
                <option value="" className="bg-bg-surface text-text-primary">Start from scratch</option>
                <optgroup label="System Templates" className="bg-bg-surface text-text-primary">
                  {PRESET_TEMPLATES.map(t => (
                    <option key={t.id} value={t.id} className="bg-bg-surface text-text-primary">{t.label}</option>
                  ))}
                </optgroup>
                {dbTemplates.length > 0 && (
                  <optgroup label="Custom Templates" className="bg-bg-surface text-text-primary">
                    {dbTemplates.map(t => (
                      <option key={t.id} value={t.id} className="bg-bg-surface text-text-primary">{t.label}</option>
                    ))}
                  </optgroup>
                )}
             </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
               <label className="block text-sm font-bold text-text-secondary mb-2">Subject / Course Name</label>
               <input type="text" value={subject} onChange={e=>setSubject(e.target.value)} className="w-full px-5 py-3 border border-border-main rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-text-secondary/80" placeholder="E.g. Advanced Physics Series" />
            </div>
            
            <div className="md:col-span-2">
               <label className="block text-sm font-bold text-text-secondary mb-2">Assignment Visibility</label>
               <div className="grid grid-cols-2 gap-4 mb-4">
                  <button 
                    type="button"
                    onClick={() => setIsGlobal(true)}
                    className={cn(
                      "px-6 py-4 rounded-2xl font-bold text-sm border-2 transition-all",
                      isGlobal ? "bg-brand-gold-hover text-bg-main border-indigo-600 shadow-lg shadow-indigo-100" : "bg-bg-surface text-text-secondary/80 border-border-main hover:border-brand-gold/30"
                    )}
                  >
                    Global (All Students)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsGlobal(false)}
                    className={cn(
                      "px-6 py-4 rounded-2xl font-bold text-sm border-2 transition-all",
                      !isGlobal ? "bg-brand-gold-hover text-bg-main border-indigo-600 shadow-lg shadow-indigo-100" : "bg-bg-surface text-text-secondary/80 border-border-main hover:border-brand-gold/30"
                    )}
                  >
                    Selected Students
                  </button>
               </div>
               
               {!isGlobal && (
                 <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                   <div className="flex items-center justify-between border-b border-border-main pb-2">
                      <div>
                        <label className="block text-sm font-bold text-indigo-900">Assign to specific students</label>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Only {assignedStudents.length} {assignedStudents.length === 1 ? 'student' : 'students'} will see this mission</p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setAssignedStudents(students.map(s => s.id))} className="text-[10px] font-black text-brand-gold hover:text-indigo-800 transition-colors bg-brand-gold-secondary-hover px-3 py-1.5 rounded-lg active:scale-95">Select All</button>
                        <button type="button" onClick={() => setAssignedStudents([])} className="text-[10px] font-black text-text-secondary hover:text-text-secondary transition-colors bg-border-main px-3 py-1.5 rounded-lg active:scale-95">Clear</button>
                      </div>
                   </div>

                   <div className="relative">
                     <input 
                       type="text" 
                       placeholder="Search by name or email..." 
                       value={studentSearch}
                       onChange={e => setStudentSearch(e.target.value)}
                       className="w-full px-5 py-3 bg-bg-surface border border-border-main rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-text-secondary/60"
                     />
                   </div>

                   <div className="bg-bg-main/50 border border-border-main p-2 rounded-[2rem] max-h-64 overflow-y-auto space-y-1.5 shadow-inner">
                     {/* Selected Students First */}
                     {assignedStudents.length > 0 && !studentSearch && (
                        <div className="px-2 pt-2 pb-1">
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-bg-surface/50 px-2 py-1 rounded-md border border-border-main">Selected ({assignedStudents.length})</span>
                        </div>
                     )}
                     
                     {students
                       .filter(s => assignedStudents.includes(s.id))
                       .map(s => (
                         <label key={s.id} className="flex items-center gap-3 bg-bg-surface p-3 rounded-2xl border border-brand-gold/30 cursor-pointer hover:bg-brand-gold-secondary-hover/30 transition-all group ring-2 ring-indigo-50 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                           <div className="w-5 h-5 rounded-md border-2 border-indigo-600 bg-brand-gold-hover flex items-center justify-center text-bg-main scale-110 shadow-lg shadow-indigo-100">
                             <CheckCircle2 className="w-3.5 h-3.5" />
                           </div>
                           <input 
                             type="checkbox" 
                             className="hidden"
                             checked={true} 
                             onChange={() => setAssignedStudents(assignedStudents.filter(id => id !== s.id))} 
                           />
                           <div className="flex-1">
                             <div className="font-bold text-indigo-950 text-sm">{s.name}</div>
                             <div className="text-[10px] text-indigo-400 font-mono flex items-center gap-1.5">
                               <Sparkles className="w-2.5 h-2.5" /> {s.email}
                             </div>
                           </div>
                         </label>
                       ))
                     }

                     {/* Search Results / Unselected */}
                     {(assignedStudents.length > 0 && !studentSearch) && <div className="h-px bg-border-main my-2 mx-4" />}
                     
                     {students
                       .filter(s => !assignedStudents.includes(s.id))
                       .filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase()))
                       .map(s => (
                         <label key={s.id} className="flex items-center gap-3 bg-bg-surface/80 p-3 rounded-2xl border border-border-main cursor-pointer hover:border-indigo-300 hover:bg-bg-surface transition-all group shadow-sm bg-bg-surface">
                           <div className="w-5 h-5 rounded-md border-2 border-border-main flex items-center justify-center group-hover:border-indigo-400 text-transparent transition-all">
                             <CheckCircle2 className="w-3.5 h-3.5 group-hover:text-indigo-200" />
                           </div>
                           <input 
                             type="checkbox" 
                             className="hidden"
                             checked={false} 
                             onChange={() => setAssignedStudents([...assignedStudents, s.id])} 
                           />
                           <div className="flex-1">
                             <div className="font-bold text-text-primary text-sm">{s.name}</div>
                             <div className="text-[10px] text-text-secondary/80 font-mono">{s.email}</div>
                           </div>
                         </label>
                       ))
                     }

                     {students.length === 0 && (
                        <div className="p-8 text-center bg-bg-surface rounded-2xl border border-dashed border-border-main">
                          <p className="text-sm text-text-secondary/80 font-medium italic">No students available in system</p>
                        </div>
                     )}
                   </div>
                 </div>
               )}

               <div className="flex items-center gap-3 bg-brand-gold-secondary-hover/50 p-4 rounded-2xl border border-brand-gold/20 mb-2 mt-6 group cursor-pointer" onClick={() => setSendEmail(!sendEmail)}>
                 <div className={cn(
                   "w-12 h-6 rounded-full transition-colors relative",
                   sendEmail ? "bg-brand-gold-hover" : "bg-slate-200"
                 )}>
                   <div className={cn(
                     "absolute top-1 left-1 w-4 h-4 bg-bg-surface rounded-full transition-transform",
                     sendEmail ? "translate-x-6" : "translate-x-0"
                   )} />
                 </div>
                 <div>
                   <p className="text-sm font-bold text-indigo-900 leading-none mb-1">Email Alert</p>
                   <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Send notification mail to participants</p>
                 </div>
               </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-text-primary mb-2">Mission Title</label>
              <input type="text" required value={title} onChange={e=>setTitle(e.target.value)} className="w-full px-5 py-3 bg-bg-surface border border-border-main text-text-primary rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-text-secondary" placeholder="E.g. Analyze Quantum States" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-text-primary mb-2">Description (Public)</label>
              <textarea required value={description} onChange={e=>setDescription(e.target.value)} rows={2} className="w-full px-5 py-3 bg-bg-surface border border-border-main text-text-primary rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none placeholder:text-text-secondary" placeholder="Seen before enrolling..."></textarea>
            </div>

            {!isDuoBonus && (
              <>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-text-primary mb-2">AI Guidance System (Hidden)</label>
                  <textarea value={instructions} onChange={e=>setInstructions(e.target.value)} rows={3} className="w-full px-5 py-3 bg-bg-surface border border-border-main text-text-primary rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none placeholder:text-text-secondary" placeholder="E.g. Evaluate based on precise formulas and thorough explanations..."></textarea>
                </div>
                
                <div className="md:col-span-2 bg-brand-gold-secondary-hover/50 p-6 rounded-2xl border border-brand-gold/20">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-indigo-900">Grading Rubric</h3>
                      <p className="text-xs text-indigo-700 font-medium italic">At least 5 criteria (max 10). Total weight must be exactly 100%.</p>
                    </div>
                    <button type="button" onClick={() => setRubric([...rubric, {name: '', description: '', weight: 0}])} className="flex items-center gap-2 bg-brand-gold-secondary-hover text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-200 transition">
                      <Plus className="w-4 h-4" /> Add Criterion ({rubric.length}/10)
                    </button>
                  </div>
                  
                  {rubric.length > 0 && (
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex-1 h-2 bg-bg-surface rounded-full overflow-hidden border border-brand-gold/20">
                        <div 
                          className={cn(
                            "h-full transition-all duration-300",
                            rubric.reduce((s, r) => s + r.weight, 0) === 100 ? "bg-emerald-500" : "bg-amber-500"
                          )} 
                          style={{ width: `${Math.min(100, rubric.reduce((s, r) => s + r.weight, 0))}%` }}
                        />
                      </div>
                      <span className={cn(
                        "text-xs font-black",
                        rubric.reduce((s, r) => s + r.weight, 0) === 100 ? "text-emerald-600" : "text-brand-gold"
                      )}>
                        {rubric.reduce((s, r) => s + r.weight, 0)}% / 100%
                      </span>
                    </div>
                  )}

                  {rubric.length === 0 ? (
                    <p className="text-sm text-indigo-400 font-medium italic">No custom rubric. AI will use generic assessment if left empty.</p>
                  ) : (
                    <div className="space-y-4">
                      {rubric.map((r, i) => (
                        <div key={i} className="flex gap-4 items-start bg-bg-surface p-4 rounded-xl border border-indigo-50">
                          <div className="flex-1 space-y-3">
                            <div className="flex gap-3">
                              <input type="text" value={r.name} onChange={e => { const newR = [...rubric]; newR[i].name = e.target.value; setRubric(newR); }} placeholder="Criterion Name (e.g. Accuracy)" className="flex-1 px-3 py-2 border border-border-main rounded-lg text-sm outline-none focus:border-indigo-500 font-bold" />
                              <div className="flex items-center gap-2">
                                <input type="number" value={r.weight} onChange={e => { const newR = [...rubric]; newR[i].weight = Number(e.target.value); setRubric(newR); }} placeholder="Weight (%)" className="w-24 px-3 py-2 border border-border-main rounded-lg text-sm outline-none focus:border-indigo-500" />
                                <span className="text-sm font-bold text-text-secondary">%</span>
                              </div>
                            </div>
                            <input type="text" value={r.description} onChange={e => { const newR = [...rubric]; newR[i].description = e.target.value; setRubric(newR); }} placeholder="Description of what to look for..." className="w-full px-3 py-2 border border-border-main rounded-lg text-sm outline-none focus:border-indigo-500" />
                          </div>
                          <button type="button" onClick={() => setRubric(rubric.filter((_, idx) => idx !== i))} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {isDuoBonus ? (
              <div className="md:col-span-2 space-y-6 pt-6 border-t border-amber-100">
                <div className="flex items-center justify-between bg-brand-gold/10 p-4 rounded-2xl border border-amber-100 mb-2">
                  <div>
                    <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest">Duo Mission Mode Active</h3>
                    <p className="text-[10px] text-brand-gold font-medium">Configuring linked Test & Presentation missions.</p>
                  </div>
                  <div className="flex items-center gap-3 bg-bg-surface px-4 py-2 rounded-xl border border-brand-gold/30 shadow-sm">
                    <label className="text-[10px] font-black text-brand-gold uppercase">Mission Series</label>
                    <select value={missionNumber} onChange={e=>setMissionNumber(Number(e.target.value))} className="bg-transparent border-none p-0 text-amber-900 font-bold text-xs focus:ring-0 outline-none">
                      <option value={1} className="bg-bg-surface text-amber-900 font-bold">Mission 1</option>
                      <option value={2} className="bg-bg-surface text-amber-900 font-bold">Mission 2</option>
                      <option value={3} className="bg-bg-surface text-amber-900 font-bold">Mission 3</option>
                      <option value={4} className="bg-bg-surface text-amber-900 font-bold">Mission 4</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Test Mission Column */}
                  <div className="bg-success-green/10/40 p-6 rounded-[2rem] border border-success-green/20/50 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3">
                      <span className="text-[8px] font-black bg-emerald-500 text-bg-main px-2 py-0.5 rounded shadow-sm">PART A</span>
                    </div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-success-green/20 text-emerald-600 rounded-xl flex items-center justify-center">
                        <Target className="w-5 h-5"/>
                      </div>
                      <h3 className="font-black text-emerald-900 uppercase tracking-tight">Technical Test</h3>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-black text-emerald-600 uppercase mb-1.5 ml-1">Start Date</label>
                          <input type="datetime-local" value={testStartDate} onChange={e=>setTestStartDate(e.target.value)} className="w-full px-3 py-2 border border-success-green/20 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-emerald-600 uppercase mb-1.5 ml-1">Deadline</label>
                          <input type="datetime-local" value={testDueDate} onChange={e=>setTestDueDate(e.target.value)} className="w-full px-3 py-2 border border-success-green/20 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-black text-emerald-600 uppercase mb-1.5 ml-1">Fee</label>
                          <input type="number" value={testEntryFee} onChange={e=>setTestEntryFee(Number(e.target.value))} className="w-full px-3 py-2 border border-success-green/20 rounded-xl text-sm" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-emerald-600 uppercase mb-1.5 ml-1">Reward</label>
                          <input type="number" value={testReward} onChange={e=>setTestReward(Number(e.target.value))} className="w-full px-3 py-2 border border-success-green/20 rounded-xl text-sm" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-emerald-600 uppercase mb-1.5 ml-1">Penalty</label>
                          <input type="number" value={testPenalty} onChange={e=>setTestPenalty(Number(e.target.value))} className="w-full px-3 py-2 border border-success-green/20 rounded-xl text-sm" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-emerald-600 uppercase mb-1.5 ml-1">AI Logic & Requirements</label>
                        <textarea value={testInstructions} onChange={e=>setTestInstructions(e.target.value)} rows={3} className="w-full px-4 py-2 border border-success-green/20 rounded-xl text-sm placeholder:text-emerald-200" placeholder="E.g. Grayscale silhouette + Wireframe analysis..."></textarea>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black text-emerald-600 uppercase">Test Rubric ({testRubric.length}/10)</span>
                          <button type="button" onClick={() => setTestRubric([...testRubric, {name: '', description: '', weight: 0}])} className="text-[10px] font-black bg-success-green/20 text-success-green px-2 py-1 rounded-md">Add Criteria</button>
                        </div>
                        {testRubric.length > 0 && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1 h-1 bg-bg-surface rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500" 
                                style={{ width: `${Math.min(100, testRubric.reduce((s, r) => s + r.weight, 0))}%` }}
                              />
                            </div>
                            <span className="text-[8px] font-black text-emerald-600">{testRubric.reduce((s, r) => s + r.weight, 0)}%</span>
                          </div>
                        )}
                        {testRubric.map((r, i) => (
                          <div key={i} className="flex gap-2 items-center bg-bg-surface/50 p-2 rounded-lg border border-emerald-50">
                            <input type="text" value={r.name} onChange={e => { const newR = [...testRubric]; newR[i].name = e.target.value; setTestRubric(newR); }} placeholder="Name" className="flex-1 px-2 py-1 border border-success-green/20 rounded text-[10px]" />
                            <input type="number" value={r.weight} onChange={e => { const newR = [...testRubric]; newR[i].weight = Number(e.target.value); setTestRubric(newR); }} className="w-12 px-1 py-1 border border-success-green/20 rounded text-[10px]" />
                            <button type="button" onClick={() => setTestRubric(testRubric.filter((_, idx) => idx !== i))}><X className="w-3 h-3 text-emerald-400"/></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Presentation Column */}
                  <div className="bg-brand-gold-secondary-hover/40 p-6 rounded-[2rem] border border-brand-gold/20/50 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3">
                      <span className="text-[8px] font-black bg-brand-gold text-bg-main px-2 py-0.5 rounded shadow-sm">PART B</span>
                    </div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-brand-gold-secondary-hover text-brand-gold rounded-xl flex items-center justify-center">
                        <Camera className="w-5 h-5"/>
                      </div>
                      <h3 className="font-black text-indigo-900 uppercase tracking-tight">Presentation</h3>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-black text-brand-gold uppercase mb-1.5 ml-1">Start Date</label>
                          <input type="datetime-local" value={presStartDate} onChange={e=>setPresStartDate(e.target.value)} className="w-full px-3 py-2 border border-brand-gold/20 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-brand-gold uppercase mb-1.5 ml-1">Deadline</label>
                          <input type="datetime-local" value={presDueDate} onChange={e=>setPresDueDate(e.target.value)} className="w-full px-3 py-2 border border-brand-gold/20 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-black text-brand-gold uppercase mb-1.5 ml-1">Fee</label>
                          <input type="number" value={presEntryFee} onChange={e=>setPresEntryFee(Number(e.target.value))} className="w-full px-3 py-2 border border-brand-gold/20 rounded-xl text-sm" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-brand-gold uppercase mb-1.5 ml-1">Reward</label>
                          <input type="number" value={presReward} onChange={e=>setPresReward(Number(e.target.value))} className="w-full px-3 py-2 border border-brand-gold/20 rounded-xl text-sm" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-brand-gold uppercase mb-1.5 ml-1">Penalty</label>
                          <input type="number" value={presPenalty} onChange={e=>setPresPenalty(Number(e.target.value))} className="w-full px-3 py-2 border border-brand-gold/20 rounded-xl text-sm" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-brand-gold uppercase mb-1.5 ml-1">Report & Theory Guide</label>
                        <textarea value={presInstructions} onChange={e=>setPresInstructions(e.target.value)} rows={3} className="w-full px-4 py-2 border border-brand-gold/20 rounded-xl text-sm placeholder:text-indigo-200" placeholder="E.g. Assessment of Modeling Pipelines and PDF layout..."></textarea>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black text-brand-gold uppercase">Presentation Rubric ({presRubric.length}/10)</span>
                          <button type="button" onClick={() => setPresRubric([...presRubric, {name: '', description: '', weight: 0}])} className="text-[10px] font-black bg-brand-gold-secondary-hover text-indigo-700 px-2 py-1 rounded-md">Add Criteria</button>
                        </div>
                        {presRubric.length > 0 && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1 h-1 bg-bg-surface rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-brand-gold" 
                                style={{ width: `${Math.min(100, presRubric.reduce((s, r) => s + r.weight, 0))}%` }}
                              />
                            </div>
                            <span className="text-[8px] font-black text-brand-gold">{presRubric.reduce((s, r) => s + r.weight, 0)}%</span>
                          </div>
                        )}
                        {presRubric.map((r, i) => (
                          <div key={i} className="flex gap-2 items-center bg-bg-surface/50 p-2 rounded-lg border border-indigo-50">
                            <input type="text" value={r.name} onChange={e => { const newR = [...presRubric]; newR[i].name = e.target.value; setPresRubric(newR); }} placeholder="Name" className="flex-1 px-2 py-1 border border-brand-gold/20 rounded text-[10px]" />
                            <input type="number" value={r.weight} onChange={e => { const newR = [...presRubric]; newR[i].weight = Number(e.target.value); setPresRubric(newR); }} className="w-12 px-1 py-1 border border-brand-gold/20 rounded text-[10px]" />
                            <button type="button" onClick={() => setPresRubric(presRubric.filter((_, idx) => idx !== i))}><X className="w-3 h-3 text-indigo-400"/></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center pt-4">
                  <button type="button" onClick={() => setIsDuoBonus(false)} className="text-xs font-black text-brand-gold uppercase tracking-widest hover:text-amber-900 underline underline-offset-4">Switch back to Standard Mode</button>
                </div>
              </div>
            ) : (
              <>
                 <div className="md:col-span-2">
                   <label className="flex items-center gap-3 cursor-pointer bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl border border-brand-gold/30">
                     <input type="checkbox" checked={isBonus} onChange={e=>setIsBonus(e.target.checked)} className="w-5 h-5 text-brand-gold rounded border-border-main focus:ring-indigo-500" />
                     <div>
                       <span className="block text-sm font-black text-amber-800 uppercase tracking-wide">Special Bonus Assignment?</span>
                       <span className="text-xs text-brand-gold font-medium">One time event, overrides frequency.</span>
                     </div>
                   </label>
                 </div>

                 {isBonus && (
                   <div className="md:col-span-2 space-y-4">
                     <label className="flex items-center gap-3 cursor-pointer bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl border border-brand-gold/30 shadow-sm">
                        <input type="checkbox" checked={isDuoBonus} onChange={e=>{
                           const checked = e.target.checked;
                           setIsDuoBonus(checked);
                           if (checked && !testStartDate) {
                             const now = new Date();
                             const inOneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                             const inTwoDays = new Date(now.getTime() + 48 * 60 * 60 * 1000);
                             const toLocalISO = (d: Date) => {
                               const pad = (n: number) => n.toString().padStart(2, '0');
                               return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                             };
                             setTestStartDate(toLocalISO(now));
                             setTestDueDate(toLocalISO(inOneDay));
                             setPresStartDate(toLocalISO(inOneDay));
                             setPresDueDate(toLocalISO(inTwoDays));
                           }
                        }} className="w-5 h-5 text-brand-gold rounded border-border-main focus:ring-indigo-500" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="block text-sm font-black text-amber-800 uppercase tracking-wide">Launch Duo Bonus Mission?</span>
                            <span className="bg-amber-500 text-bg-main text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Adv. Workflow</span>
                          </div>
                          <span className="text-xs text-brand-gold font-medium tracking-tight">Creates a linked Test + Presentation path with dual grading logic.</span>
                        </div>
                     </label>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                         <label className="block text-sm font-bold text-text-primary mb-2">Bonus Type</label>
                         <select value={bonusType} onChange={e=>setBonusType(e.target.value as any)} className="w-full px-5 py-3 bg-bg-surface border border-border-main text-text-primary rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all font-medium">
                           <option value="test">Test Mission</option>
                           <option value="presentation">Presentation Mission</option>
                         </select>
                       </div>
                       <div>
                         <label className="block text-sm font-bold text-text-primary mb-2">Mission Number</label>
                         <select value={missionNumber} onChange={e=>setMissionNumber(Number(e.target.value))} className="w-full px-5 py-3 bg-bg-surface border border-border-main text-text-primary rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all font-medium">
                           <option value={1}>Mission 1</option>
                           <option value={2}>Mission 2</option>
                           <option value={3}>Mission 3</option>
                         </select>
                       </div>
                     </div>
                   </div>
                 )}
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-text-secondary mb-2">Mission Start Date</label>
                  <input type="datetime-local" required value={startDateStr} onChange={e=>setStartDateStr(e.target.value)} className="w-full px-5 py-3 border border-border-main rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium" />
                </div>

                {!isBonus && (
                  <div>
                    <label className="block text-sm font-bold text-text-primary mb-2">Spawning Frequency</label>
                    <select value={frequency} onChange={e=>setFrequency(e.target.value)} className="w-full px-5 py-3 bg-bg-surface border border-border-main text-text-primary rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium">
                      <option value="one_time" className="bg-bg-surface text-text-primary">Single Mission</option>
                      <option value="daily" className="bg-bg-surface text-text-primary">Daily Drip</option>
                      <option value="alternate" className="bg-bg-surface text-text-primary">Alternate Days Checkpoints</option>
                    </select>
                  </div>
                )}

                <div className="md:col-span-1">
                  <label className="block text-sm font-bold text-text-primary mb-2">Final Deadline</label>
                  <input type="datetime-local" required value={dueDateStr} onChange={e=>setDueDateStr(e.target.value)} className="w-full px-5 py-3 bg-bg-surface border border-border-main text-text-primary rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium" />
                </div>

                <div>
                   <label className="block text-sm font-bold text-brand-gold mb-2">XP Reward</label>
                   <input type="number" min="0" required value={xpReward} onChange={e=>setXpReward(Number(e.target.value))} className="w-full px-5 py-3 border border-brand-gold/30 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-indigo-700" />
                </div>
                
                <div>
                   <label className="block text-sm font-bold text-text-secondary mb-2">Time Limit (Min)</label>
                   <input type="number" min="0" value={timeLimitMinutes} onChange={e=>setTimeLimitMinutes(Number(e.target.value))} className="w-full px-5 py-3 border border-border-main rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="0 = infinite" />
                </div>

                <div className="grid grid-cols-3 md:col-span-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-text-secondary mb-2">Entry Fee</label>
                    <input type="number" min="0" required value={entryFee} onChange={e=>setEntryFee(Number(e.target.value))} className="w-full px-5 py-3 border border-border-main rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-indigo-700" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-secondary mb-2">Reward</label>
                    <input type="number" min="0" required value={bonusReward} onChange={e=>setBonusReward(Number(e.target.value))} className="w-full px-5 py-3 border border-border-main rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold text-success-green" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-secondary mb-2">Penalty</label>
                    <input type="number" min="0" required value={penaltyFee} onChange={e=>setPenaltyFee(Number(e.target.value))} className="w-full px-5 py-3 border border-border-main rounded-xl focus:ring-4 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all font-bold text-rose-600" />
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="pt-6">
            <button type="submit" disabled={loading} className="w-full bg-brand-gold-hover text-bg-main font-bold py-4 rounded-xl hover:bg-indigo-700 transition shadow-lg disabled:opacity-50 text-lg">
              {loading ? 'Initializing Campaign...' : 'Deploy Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
