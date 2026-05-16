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
import { dbService } from '../services/dbProvider';
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

let cachedAllAssignments: Assignment[] | null = null;
let cachedAllEnrollments: Enrollment[] | null = null;
let lastAssignmentsUserId: string | null = null;

export const Assignments = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    if (user && lastAssignmentsUserId !== user.id) {
        cachedAllAssignments = null;
        cachedAllEnrollments = null;
        lastAssignmentsUserId = user.id;
    }

    const [assignments, setAssignments] = useState<Assignment[]>(cachedAllAssignments || []);
    const [studentEnrollments, setStudentEnrollments] = useState<Enrollment[]>(cachedAllEnrollments || []);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(!cachedAllAssignments);
    const [sortBy, setSortBy] = useState<string>('campaign');

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

    const fetchAssignments = async () => {
        if (assignments.length === 0 && !cachedAllAssignments) setIsLoading(true);
        try {
            let allAssignments = await dbService.getAllAssignments();
            
            if (user?.role === 'student') {
                allAssignments = allAssignments.filter(a => {
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

    useEffect(() => {
        if (user?.id) fetchAssignments();
    }, [user?.id, user?.role, user?.email]);

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
        if (filterStatus === 'all') return assignments;
        return assignments.filter(a => {
            const status = getAssignmentStatus(a);
            if (filterStatus === 'retest') {
                const enr = studentEnrollments.find(e => e.assignmentId === a.id);
                return status === 'active' && enr?.graceDeadline && enr.graceDeadline > Date.now();
            }
            return status === filterStatus;
        });
    }, [assignments, filterStatus, studentEnrollments]);

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

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 md:mb-10">
                <div>
                    <h1 className="text-3xl md:text-5xl font-display font-bold text-text-primary tracking-tight">Missions Hub</h1>
                    <p className="text-sm md:text-base text-text-secondary mt-1 md:mt-2 font-medium">Complete assignments to secure rewards and level up.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex bg-navy-900 p-1 rounded-xl border border-navy-700/50 shadow-soft">
                        <button 
                            onClick={() => setViewMode('list')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-brand-gold text-navy-950 shadow-sm" : "text-text-secondary hover:text-text-primary")}
                        >
                            <LayoutList size={18} />
                        </button>
                        <button 
                            onClick={() => setViewMode('calendar')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'calendar' ? "bg-brand-gold text-navy-950 shadow-sm" : "text-text-secondary hover:text-text-primary")}
                        >
                            <CalendarIcon size={18} />
                        </button>
                    </div>

                    {(user?.role === 'admin' || user?.role === 'superadmin') && (
                        <button 
                            onClick={() => setShowCreateModal(true)}
                            className="bg-brand-gold text-navy-950 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-glow-gold hover:translate-y-[-1px] active:translate-y-[0px] transition-all"
                        >
                            <Plus size={16} /> New Campaign
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
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        {['all', 'active', 'upcoming', 'completed', 'missed', 'retest'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all border",
                                    filterStatus === s 
                                        ? "bg-brand-gold text-navy-950 border-brand-gold shadow-sm" 
                                        : "bg-navy-900 text-text-secondary border-navy-700 hover:border-brand-gold/30"
                                )}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    {groupedAssignments.length === 0 ? (
                        <div className="bg-navy-900 rounded-3xl p-12 md:p-20 text-center border border-navy-700 border-dashed">
                            <Sparkles className="w-10 h-10 text-brand-gold/20 mx-auto mb-4" />
                            <p className="text-text-secondary font-medium text-sm md:text-lg">No missions found matching your filter selection.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 md:gap-10">
                            {groupedAssignments.map((group) => (
                                <AssignmentGroupCard 
                                    key={group.id}
                                    group={group}
                                    enrollments={studentEnrollments}
                                    userRole={user?.role}
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
                    onCreated={fetchAssignments}
                />
            )}

            {editingAssignment && (
                <EditAssignmentModal 
                    assignment={editingAssignment}
                    onClose={() => setEditingAssignment(null)}
                    onUpdated={fetchAssignments}
                />
            )}
        </div>
    );
};

export default Assignments;
