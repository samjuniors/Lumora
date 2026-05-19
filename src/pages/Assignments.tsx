import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    Plus, 
    Calendar as CalendarIcon, 
    LayoutList, 
    ChevronRight,
    Search,
    Compass,
    Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useAssignments, useStudentEnrollments, assignmentKeys } from '../hooks/queries/useAssignments';
import { queryClient } from '../lib/queryClient';
import { handleFirestoreError, OperationType } from '../lib/errorHandling';
import { Assignment, Enrollment } from '../types';
import { cn } from '../lib/utils';
import { ListSkeleton, AssignmentDetailSkeleton } from '../components/Skeletons';

// Extracted Components
import { MissionCard } from '../components/assignments/MissionCard';
import { CreateAssignmentModal } from '../components/assignments/CreateAssignmentModal';
import { EditAssignmentModal } from '../components/assignments/EditAssignmentModal';
import { AssignmentGroupCard } from '../components/AssignmentGroupCard';
import { AssignmentCalendar } from '../components/AssignmentCalendar';
import { CompletedMissionsStack } from '../components/CompletedMissionsStack';

export const Assignments = () => {
    const { user, isStudent, isAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const { data: assignments = [], isLoading: isAssignmentsLoading } = useAssignments();
    const { data: studentEnrollments = [], isLoading: isEnrollmentsLoading } = useStudentEnrollments(user?.id);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('campaign');

    const isLoading = isAssignmentsLoading || (isStudent && isEnrollmentsLoading);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const filter = params.get('filter');
        if (filter) setFilterStatus(filter);
    }, [location.search]);

    useEffect(() => {
        const state = window.history.state?.usr;
        if (state?.editId && assignments.length > 0) {
            const toEdit = assignments.find(a => a.id === state.editId);
            if (toEdit) setEditingAssignment(toEdit);
        }
    }, [assignments]);

    // Student global filtering logic
    const visibleAssignments = useMemo(() => {
        if (!isStudent) return assignments;
        
        return assignments.filter(a => {
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
    }, [assignments, user]);

    const getAssignmentStatus = (a: Assignment) => {
        const now = Date.now();
        const isPastDue = now > a.dueDate;
        const start = a.startDate || 0;
        const hasStarted = now >= start;

        if (isStudent) {
            const enr = studentEnrollments.find(e => e.assignmentId === a.id);
            const isFinished = enr && (enr.status === 'submitted' || enr.status === 'graded');
            if (isFinished) return 'completed';
        } else if (isPastDue) {
            return 'completed';
        }

        if (isPastDue) return 'missed';
        if (hasStarted) return 'active';
        return 'upcoming';
    };

    const filteredAssignments = useMemo(() => {
        if (filterStatus === 'all') return visibleAssignments;
        return visibleAssignments.filter(a => {
            const status = getAssignmentStatus(a);
            if (filterStatus === 'retest') {
                const enr = studentEnrollments.find(e => e.assignmentId === a.id);
                return status === 'active' && enr?.graceDeadline && enr.graceDeadline > Date.now();
            }
            return status === filterStatus;
        });
    }, [visibleAssignments, filterStatus, studentEnrollments]);

    const groupedAssignments = useMemo(() => {
        const groups: Record<string, { sKey: string, items: Assignment[] }> = {};
        filteredAssignments.forEach(a => {
            if (a.isDuoBonus && a.duoId) {
                const groupKey = `duo___${a.duoId}`;
                if (!groups[groupKey]) groups[groupKey] = { sKey: `Duo Bonus: ${a.title.replace(/ \((Test|Presentation)\)$/, '')}`, items: [] };
                groups[groupKey].items.push(a);
                return;
            }

            let sKey = a.subject || a.title.replace(/ \((Session|Day) \d+\)$/, '') || 'General Tasks';
            const groupKey = `${sKey}___${a.campaignId || a.id}`;
            if (!groups[groupKey]) groups[groupKey] = { sKey, items: [] };
            groups[groupKey].items.push(a);
        });
        
        Object.keys(groups).forEach(k => {
            groups[k].items.sort((a, b) => (a.startDate || a.dueDate) - (b.startDate || b.dueDate));
        });

        return Object.entries(groups).map(([id, group]) => ({ id, name: group.sKey, items: group.items }));
    }, [filteredAssignments]);

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
    };

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-0 pt-4 md:pt-8 pb-8">
            <motion.div 
               initial={{ opacity: 0, y: -20 }}
               animate={{ opacity: 1, y: 0 }}
               className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16"
            >
                <div>
                   <div className="flex items-center gap-3 mb-4">
                      <span className="h-[1px] w-12 bg-brand-gold/30"></span>
                      <span className="text-[10px] font-black text-brand-gold uppercase tracking-[0.4em]">Active Operations</span>
                   </div>
                    <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase leading-none">
                        Mission <span className="text-brand-gold text-glow-gold">Hub</span>
                    </h1>
                    <p className="text-text-muted mt-4 font-medium text-lg max-w-xl italic opacity-80 leading-relaxed">
                        Strategize, execute, and dominate. High-stakes assignments for elite operatives only.
                    </p>
                </div>
                
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex bg-white/[0.03] backdrop-blur-md p-1 rounded-2xl border border-white/5 shadow-premium">
                        <button 
                            onClick={() => setViewMode('list')}
                            className={cn("px-4 py-2.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2", viewMode === 'list' ? "bg-brand-gold text-bg-main shadow-lg shadow-brand-gold/20" : "text-text-muted hover:text-white")}
                        >
                            <LayoutList className="w-4 h-4" /> Grid
                        </button>
                        <button 
                            onClick={() => setViewMode('calendar')}
                            className={cn("px-4 py-2.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2", viewMode === 'calendar' ? "bg-brand-gold text-bg-main shadow-lg shadow-brand-gold/20" : "text-text-muted hover:text-white")}
                        >
                            <CalendarIcon className="w-4 h-4" /> Schedule
                        </button>
                    </div>

                    {isAdmin && (
                        <button 
                            onClick={() => setShowCreateModal(true)}
                            className="bg-white text-bg-main px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-white/5 hover:scale-105 transition-all flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Authorized Deploy
                        </button>
                    )}
                </div>
            </motion.div>

            <AnimatePresence mode="wait">
                {isLoading ? (
                    <motion.div 
                        key="skeleton" 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="mt-12"
                    >
                        <ListSkeleton />
                    </motion.div>
                ) : (
                    <motion.div 
                        key="content"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-12"
                    >
                    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
                        {['all', 'active', 'upcoming', 'completed', 'missed', 'retest'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={cn(
                                    "px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all border whitespace-nowrap shrink-0",
                                    filterStatus === s 
                                        ? "bg-brand-gold text-bg-main border-brand-gold shadow-glow-gold" 
                                        : "bg-white/[0.02] text-text-muted border-white/5 hover:border-brand-gold/30 hover:text-brand-gold shadow-premium"
                                )}
                            >
                                {s === 'all' ? 'Inventory (All)' : s}
                            </button>
                        ))}
                    </div>

                    {viewMode === 'calendar' ? (
                        <AssignmentCalendar 
                            assignments={assignments} 
                            enrollments={studentEnrollments}
                            isStudent={isStudent}
                            onViewMission={(id) => navigate(`/assignments/${id}`)} 
                        />
                    ) : groupedAssignments.length === 0 ? (
                        <div className="bg-white/[0.01] rounded-[3rem] py-32 text-center border border-white/5 border-dashed shadow-inner">
                            <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ repeat: Infinity, duration: 4 }}
                            >
                                <Sparkles className="w-16 h-16 text-brand-gold/20 mx-auto mb-8" />
                            </motion.div>
                            <p className="text-[11px] text-text-muted uppercase font-black tracking-[0.4em]">No objectives detected in this sector</p>
                            <p className="text-text-muted/60 mt-2 text-xs">Maintain vigilance. New directives incoming.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 md:gap-8">
                            {groupedAssignments.map((group) => (
                                <AssignmentGroupCard 
                                    key={group.id}
                                    group={group}
                                    enrollments={studentEnrollments}
                                    isStudent={isStudent}
                                    userId={user?.id}
                                    onEdit={setEditingAssignment}
                                />
                            ))}
                        </div>
                    )}

                    {isStudent && <CompletedMissionsStack />}
                </motion.div>
            )}
            </AnimatePresence>


            {showCreateModal && (
                <CreateAssignmentModal 
                    onClose={() => setShowCreateModal(false)} 
                    onCreated={handleRefresh}
                />
            )}

            {editingAssignment && (
                <EditAssignmentModal 
                    assignment={editingAssignment}
                    onClose={() => setEditingAssignment(null)}
                    onUpdated={handleRefresh}
                />
            )}
        </div>
    );
};

export default Assignments;
