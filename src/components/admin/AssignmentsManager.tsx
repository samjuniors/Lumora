import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminService, assignmentService, submissionService, userService } from '../../services/dbProvider';
import { Assignment, Submission, Enrollment, User } from '../../types';
import { ShieldAlert, Plus, Edit2, Trash2, Target, Bell, X, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { motion } from 'motion/react';
import { CreateAssignmentModal } from '../assignments/CreateAssignmentModal';
import { EditAssignmentModal } from '../assignments/EditAssignmentModal';
import { notifyStudentOfDeadline } from '../../services/notificationService';
import { ConfirmModal } from '../ui/ConfirmModal';

export const AssignmentsManager = () => {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [students, setStudents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
    const [isSweeping, setIsSweeping] = useState(false);
    const [showRetestAssignmentId, setShowRetestAssignmentId] = useState<string | null>(null);

    // Confirmation UI State
    const [confirmAction, setConfirmAction] = useState<{
        title: string;
        message: string;
        onConfirm: () => void;
        variant?: 'danger' | 'warning' | 'primary';
    } | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const runGlobalPenaltySweep = async () => {
        setConfirmAction({
            title: 'CRITICAL: Global Sweep',
            message: 'This will sweep all students for missed assignments and apply penalty fees. This action is irreversible and affects the entire system economy.',
            variant: 'danger',
            onConfirm: async () => {
                setIsSweeping(true);
                try {
                    await adminService.runPenaltySweep();
                    toast.success(`Sweep complete! Applied penalties to entries.`);
                    await fetchData();
                } catch (err) {
                    console.error("Penalty sweep failed:", err);
                    toast.error("Penalty sweep failed");
                } finally {
                    setIsSweeping(false);
                    setConfirmAction(null);
                }
            }
        });
    }

    const fetchData = async () => {
        setLoading(true);
        try {
            const [al, sl, el, ul] = await Promise.all([
                assignmentService.getAllAssignments(),
                submissionService.getAllSubmissions(),
                assignmentService.getAllEnrollments(),
                userService.getAllUsers()
            ]);
            setAssignments(al.sort((a,b) => b.dueDate - a.dueDate));
            setSubmissions(sl);
            setEnrollments(el);
            setStudents(ul.filter(u => u.role === 'student'));
        } catch (err: any) {
            console.error(err);
            toast.error("Intelligence failure: Check uplink.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        setConfirmAction({
            title: 'Delete Mission',
            message: 'Are you sure? This will delete the mission for ALL students. Submissions will be orphaned.',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await assignmentService.deleteAssignment(id);
                    toast.success("Mission deleted");
                    await fetchData();
                } catch(err) {
                    toast.error("Failed to delete mission");
                } finally {
                    setConfirmAction(null);
                }
            }
        });
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end pr-4 gap-3">
                <button 
                  onClick={runGlobalPenaltySweep} 
                  disabled={isSweeping || loading}
                  className="flex items-center justify-center gap-2 bg-rose-500/10 text-rose-600 border border-rose-500/20 px-6 py-3 rounded-[16px] font-bold hover:bg-rose-500/20 disabled:opacity-50 transition transform duration-200"
                >
                  <ShieldAlert className="w-5 h-5" />
                  {isSweeping ? 'Sweeping...' : 'Penalty Sweep'}
                </button>
                <button 
                  onClick={() => setShowModal(true)} 
                  className="flex items-center justify-center gap-2 bg-brand-gold-hover text-bg-main px-6 py-3 rounded-[16px] font-bold hover:bg-indigo-700 hover:-translate-y-1 transition transform duration-200 shadow-xl shadow-indigo-200"
                >
                  <Plus className="w-5 h-5" />
                  Deploy Mission
                </button>
            </div>
            <div className="bg-bg-surface rounded-[32px] border border-border-main shadow-sm overflow-hidden">
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-border-main">
                    <thead className="bg-bg-main/50">
                        <tr>
                            <th className="px-8 py-4 text-left text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Mission Title</th>
                            <th className="px-8 py-4 text-left text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Submissions</th>
                            <th className="px-8 py-4 text-left text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Deadline</th>
                            <th className="px-8 py-4 text-left text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Fee / Bonus</th>
                            <th className="px-8 py-4 text-right text-[10px] font-black text-text-secondary/80 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-bg-surface divide-y divide-border-main">
                        {assignments.map(a => {
                            const subCount = submissions.filter(s => s.assignmentId === a.id).length;
                            const missedCount = enrollments.filter(e => e.assignmentId === a.id && e.status === 'missed').length;
                            const retestCount = enrollments.filter(e => e.assignmentId === a.id && e.status === 'active' && e.graceDeadline && e.graceDeadline > Date.now()).length;
                            
                            return (
                                <tr key={a.id} className="hover:bg-bg-main/50 transition-colors">
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <div className="text-sm font-bold text-text-primary tracking-tight">{a.title}</div>
                                        <div className="text-[11px] text-text-secondary/80 font-medium truncate max-w-xs">{a.description}</div>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-12 h-1.5 bg-border-main rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, subCount * 10)}%` }}></div>
                                                </div>
                                                <span className="text-[10px] font-bold text-text-secondary">{subCount} Done</span>
                                            </div>
                                            {missedCount > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-12 h-1.5 bg-rose-500/10 rounded-full overflow-hidden">
                                                        <div className="h-full bg-rose-500" style={{ width: `${Math.min(100, missedCount * 10)}%` }}></div>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-rose-600">{missedCount} Missed</span>
                                                </div>
                                            )}
                                            {retestCount > 0 && (
                                                <button 
                                                    onClick={() => setShowRetestAssignmentId(a.id)}
                                                    className="flex items-center gap-2 hover:bg-brand-gold/10 p-1 rounded transition-colors group/retest"
                                                >
                                                        <div className="w-12 h-1.5 bg-brand-gold/10 rounded-full overflow-hidden">
                                                            <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, retestCount * 10)}%` }}></div>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-brand-gold group-hover/retest:underline">{retestCount} Retest</span>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap text-xs text-text-secondary font-medium">
                                        {format(a.dueDate, 'MMM dd, p')}
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <div className="text-[11px] font-bold text-rose-500">-{a.entryFee}</div>
                                        <div className="text-[11px] font-bold text-emerald-500">+{a.bonusReward}</div>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap text-right space-x-2">
                                        <button 
                                          onClick={() => {
                                            setConfirmAction({
                                                title: 'Targeted Penalty',
                                                message: 'Apply penalties to ALL students who missed this specific mission?',
                                                variant: 'warning',
                                                onConfirm: async () => {
                                                    setLoading(true);
                                                    try {
                                                        const { penalizedCount } = await adminService.runPenaltySweep(a.id);
                                                        toast.success(`Applied penalties to ${penalizedCount} students`);
                                                        await fetchData();
                                                    } catch (err) {
                                                        console.error(err);
                                                        toast.error("Process failed");
                                                    } finally {
                                                        setLoading(false);
                                                        setConfirmAction(null);
                                                    }
                                                }
                                            });
                                          }}
                                          className="p-2 text-text-secondary/60 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl transition-all"
                                          title="Penalize All Missed"
                                        >
                                          <Target className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={async () => {
                                            const allSubmissions = await submissionService.getAllSubmissions();
                                            const submittedUserIds = allSubmissions.filter(s => s.assignmentId === a.id).map(s => s.studentId);
                                            
                                            const allUsers = await userService.getAllUsers();
                                            const missingStudents = allUsers
                                              .filter(s => s.role === 'student')
                                              .filter(s => !submittedUserIds.includes(s.id))
                                              .filter(s => a.isGlobal || a.allowedStudents?.includes(s.id));

                                            if (missingStudents.length === 0) {
                                              toast.success("Everyone has already submitted!");
                                              return;
                                            }

                                            setConfirmAction({
                                                title: 'Blast Reminders',
                                                message: `Send deadline reminder emails to ${missingStudents.length} students?`,
                                                variant: 'primary',
                                                onConfirm: async () => {
                                                    try {
                                                      const emailPromises = missingStudents.map(s => {
                                                        if (!s.email) return Promise.resolve();
                                                        return notifyStudentOfDeadline(s.email, s.name, a.title, a.dueDate);
                                                      });
                                                      await Promise.all(emailPromises);
                                                      toast.success("Reminders queued successfully!");
                                                    } catch (e) {
                                                      toast.error("Failed to queue reminders");
                                                    } finally {
                                                        setConfirmAction(null);
                                                    }
                                                }
                                            });
                                          }}
                                          className="p-2 text-text-secondary/60 hover:text-amber-500 hover:bg-brand-gold/10 rounded-xl transition-all"
                                          title="Send Email Reminder"
                                        >
                                          <Bell className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={() => setEditingAssignment(a)}
                                          className="p-2 text-text-secondary/60 hover:text-brand-gold hover:bg-brand-gold-secondary-hover rounded-xl transition-all"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={() => handleDelete(a.id)}
                                          className="p-2 text-text-secondary/60 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                    </table>
                </div>

                {/* Mobile view */}
                <div className="md:hidden divide-y divide-border-main/30">
                    {assignments.map(a => {
                        const subCount = submissions.filter(s => s.assignmentId === a.id).length;
                        return (
                            <div key={a.id} className="p-4 bg-bg-surface active:bg-bg-main transition-colors">
                                <div className="flex justify-between items-start gap-4 mb-3">
                                    <div className="overflow-hidden">
                                        <h4 className="font-black text-text-primary truncate">{a.title}</h4>
                                        <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">{format(a.dueDate, 'MMM dd, p')}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => setEditingAssignment(a)} className="p-2 text-brand-gold bg-brand-gold-secondary-hover rounded-xl"><Edit2 size={16}/></button>
                                        <button onClick={() => handleDelete(a.id)} className="p-2 text-rose-500 bg-rose-500/10 rounded-xl"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-text-secondary/80 uppercase mb-0.5">Progress</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-12 h-1.5 bg-border-main rounded-full overflow-hidden">
                                                    <div className="h-full bg-brand-gold" style={{ width: `${Math.min(100, subCount * 10)}%` }}></div>
                                                </div>
                                                <span className="text-[10px] font-black text-text-secondary">{subCount}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-rose-400 uppercase">Fee</p>
                                            <p className="text-xs font-black text-rose-500 italic">-{a.entryFee}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-emerald-400 uppercase">Bonus</p>
                                            <p className="text-xs font-black text-emerald-500">+{a.bonusReward}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {assignments.length === 0 && !loading && (
                    <div className="p-12 text-center text-text-secondary/80 font-bold italic">No missions deployed.</div>
                )}
            </div>

            {showModal && <CreateAssignmentModal onClose={() => setShowModal(false)} onCreated={fetchData} />}
            {editingAssignment && (
                <EditAssignmentModal 
                  assignment={editingAssignment} 
                  onClose={() => setEditingAssignment(null)} 
                  onUpdated={fetchData} 
                />
            )}

            {showRetestAssignmentId && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 bg-text-primary/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                >
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-bg-surface rounded-[2.5rem] shadow-2xl p-8 w-full max-w-lg relative"
                    >
                        <button 
                            onClick={() => setShowRetestAssignmentId(null)} 
                            className="absolute top-6 right-6 p-2 text-text-secondary/80 hover:text-text-secondary bg-bg-main hover:bg-border-main rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="mb-6">
                            <div className="w-12 h-12 bg-brand-gold/20 text-brand-gold rounded-2xl flex items-center justify-center mb-4">
                                <Zap className="w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-black text-text-primary tracking-tight">Retest Period Students</h2>
                            <p className="text-text-secondary font-medium text-sm mt-1">Students allowed to resubmit missions.</p>
                        </div>

                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {enrollments
                                .filter(e => e.assignmentId === showRetestAssignmentId && e.status === 'active' && e.graceDeadline && e.graceDeadline > Date.now())
                                .map(e => {
                                    const student = students.find(s => s.id === e.studentId);
                                    return (
                                        <div key={e.id} className="flex items-center justify-between p-4 bg-bg-main/50 rounded-2xl border border-border-main/50 group hover:bg-bg-surface hover:border-brand-gold/30 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-brand-gold-secondary-hover rounded-xl flex items-center justify-center text-lg shadow-sm">
                                                    {student?.avatar?.startsWith('http') || student?.avatar?.startsWith('data:') ? (
                                                        <img src={student.avatar} alt="" className="w-full h-full object-cover rounded-xl" />
                                                    ) : (student?.avatar || '👤')}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-text-primary group-hover:text-brand-gold transition-colors uppercase tracking-tight text-sm">{student?.name || 'Unknown Student'}</p>
                                                    <p className="text-[10px] text-text-secondary uppercase tracking-widest font-black">ID: {student?.id.substring(0, 8)}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-tighter mb-0.5">Expires</p>
                                                <div className="text-xs font-black text-text-secondary bg-bg-surface px-2 py-1 rounded-lg border border-border-main italic">
                                                    {format(e.graceDeadline!, 'MMM dd, p')}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            {enrollments.filter(e => e.assignmentId === showRetestAssignmentId && e.status === 'active' && e.graceDeadline && e.graceDeadline > Date.now()).length === 0 && (
                                <div className="text-center py-12 bg-bg-main rounded-3xl border border-dashed border-border-main">
                                    <Zap className="w-10 h-10 text-text-secondary/60 mx-auto mb-3" />
                                    <p className="text-text-secondary/80 font-bold italic text-sm">No students in grace period.</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-8">
                            <button 
                                onClick={() => setShowRetestAssignmentId(null)}
                                className="w-full bg-text-primary text-bg-main font-black py-4 rounded-[20px] shadow-xl shadow-black/5 hover:bg-text-secondary/80 hover:text-bg-main transition-all active:scale-95"
                            >
                                Dismiss
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            <ConfirmModal 
                isOpen={!!confirmAction}
                onClose={() => setConfirmAction(null)}
                onConfirm={confirmAction?.onConfirm || (() => {})}
                title={confirmAction?.title || ''}
                message={confirmAction?.message || ''}
                variant={confirmAction?.variant}
            />
        </div>
    );
}
