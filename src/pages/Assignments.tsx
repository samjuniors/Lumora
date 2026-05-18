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
import { ListSkeleton } from '../components/Skeletons';

// Extracted Components
import { MissionCard } from '../components/assignments/MissionCard';
import { CreateAssignmentModal } from '../components/assignments/CreateAssignmentModal';
import { EditAssignmentModal } from '../components/assignments/EditAssignmentModal';
import { AssignmentGroupCard } from '../components/AssignmentGroupCard';
import { AssignmentCalendar } from '../components/AssignmentCalendar';
import { CompletedMissionsStack } from '../components/CompletedMissionsStack';

export const Assignments = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const { data: assignments = [], isLoading: isAssignmentsLoading } = useAssignments();
    const { data: studentEnrollments = [], isLoading: isEnrollmentsLoading } = useStudentEnrollments(user?.id);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('campaign');

    const isLoading = isAssignmentsLoading || (user?.role === 'student' && isEnrollmentsLoading);

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
        if (user?.role !== 'student') return assignments;
        
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

        if (user?.role === 'student') {
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
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 md:mb-10">
                <div>
                    <h1 className="text-2xl md:text-5xl font-display font-bold text-text-primary tracking-tight">Missions Hub</h1>
                    <p className="text-[10px] md:text-base text-text-secondary mt-1 md:mt-2 font-bold uppercase tracking-widest opacity-70">Strategic Command & Operations</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex bg-navy-900 p-1 rounded-xl border border-navy-700/50 shadow-soft">
                        <button 
                            onClick={() => setViewMode('list')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-brand-gold text-navy-950 shadow-sm" : "text-text-secondary hover:text-text-primary")}
                        >
                            <LayoutList size={16} />
                        </button>
                        <button 
                            onClick={() => setViewMode('calendar')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'calendar' ? "bg-brand-gold text-navy-950 shadow-sm" : "text-text-secondary hover:text-text-primary")}
                        >
                            <CalendarIcon size={16} />
                        </button>
                    </div>

                    {(user?.role === 'admin' || user?.role === 'superadmin') && (
                        <button 
                            onClick={() => setShowCreateModal(true)}
                            className="bg-brand-gold text-navy-950 px-4 md:px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center gap-2 shadow-glow-gold hover:translate-y-[-1px] active:translate-y-[0px] transition-all"
                        >
                            <Plus size={14} /> <span className="hidden sm:inline">New Operation</span><span className="sm:hidden">New</span>
                        </button>
                    )}
                </div>
            </div>

            {isLoading ? (
                <ListSkeleton />
            ) : viewMode === 'calendar' ? (
                <AssignmentCalendar 
                    assignments={assignments} 
                    onViewMission={(id) => navigate(`/assignments/${id}`)} 
                />
            ) : (
                <div className="space-y-8 md:space-y-12">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth">
                        {['all', 'active', 'upcoming', 'completed', 'missed', 'retest'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border whitespace-nowrap shrink-0",
                                    filterStatus === s 
                                        ? "bg-brand-gold text-navy-950 border-brand-gold shadow-glow-gold" 
                                        : "bg-navy-900 text-text-secondary border-navy-700 hover:border-brand-gold/30"
                                )}
                            >
                                {s === 'all' ? 'All Missions' : s}
                            </button>
                        ))}
                    </div>

                    {groupedAssignments.length === 0 ? (
                        <div className="bg-navy-900/50 rounded-3xl p-12 md:p-20 text-center border border-navy-700 border-dashed">
                            <Sparkles className="w-10 h-10 text-brand-gold/20 mx-auto mb-4" />
                            <p className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">No matching objectives found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 md:gap-10">
                            {groupedAssignments.map((group) => (
                                <AssignmentGroupCard 
                                    key={group.id}
                                    group={group}
                                    enrollments={studentEnrollments}
                                    userRole={user?.role}
                                    userId={user?.id}
                                    onEdit={setEditingAssignment}
                                />
                            ))}
                        </div>
                    )}


                    {user?.role === 'student' && <CompletedMissionsStack />}
                </div>
            )}


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
