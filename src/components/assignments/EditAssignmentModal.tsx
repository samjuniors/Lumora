import React, { useEffect, useState } from 'react';
import { 
    X, 
    Trash2, 
    Plus, 
    CheckCircle2, 
    Sparkles 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { userService, adminService, assignmentService } from '../../services/dbProvider';
import { handleFirestoreError, OperationType } from '../../lib/errorHandling';
import { Assignment, Role } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { notifyStudentsOfNewAssignment } from '../../services/notificationService';

interface EditAssignmentModalProps {
    assignment: Assignment;
    onClose: () => void;
    onUpdated: () => void;
}

export const EditAssignmentModal = ({ assignment, onClose, onUpdated }: EditAssignmentModalProps) => {
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
    const [isGlobal, setIsGlobal] = useState(assignment.isGlobal !== false);
    const [sendEmail, setSendEmail] = useState(false);
    const [students, setStudents] = useState<{id: string, name: string, email: string}[]>([]);
    const [studentSearch, setStudentSearch] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchStudentsAndPreReg = async () => {
            try {
                const registered = await userService.getUsersByRole('student');
                const preRegPending = await adminService.getPreRegisteredUsers();
                
                const registeredLite = registered.map(d => ({ id: d.id, name: d.name, email: d.email }));
                const preRegLite = preRegPending
                        .filter(d => d.status === 'pending')
                        .map(d => ({ id: d.email, name: d.name + ' (Pending Login)', email: d.email }));
                
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
            
            await assignmentService.updateAssignment(assignment.id, updatedData);

            if (sendEmail) {
                try {
                    await notifyStudentsOfNewAssignment(title, description, isGlobal ? undefined : assignedStudents);
                } catch (emailErr) {
                    console.error("Email notification failed during update:", emailErr);
                    toast.error("Mission updated, but email alerts failed.");
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
            await assignmentService.updateAssignment(assignment.id, { status: 'archived', updatedAt: Date.now() });
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
        <div className="fixed inset-0 bg-text-primary/50 backdrop-blur-sm z-50 flex py-12 px-4 justify-center overflow-y-auto">
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
                                            isGlobal ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.1)]" : "bg-bg-surface text-text-secondary/80 border-border-main hover:border-white/30"
                                        )}
                                    >
                                        Global (All Students)
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setIsGlobal(false)}
                                        className={cn(
                                            "px-6 py-4 rounded-2xl font-bold text-sm border-2 transition-all",
                                            !isGlobal ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.1)]" : "bg-bg-surface text-text-secondary/80 border-border-main hover:border-white/30"
                                        )}
                                    >
                                        Selected Students
                                    </button>
                                </div>
                                
                                <div className="flex items-center gap-3 bg-brand-gold-secondary-hover/50 p-4 rounded-2xl border border-brand-gold/20 mb-6 group cursor-pointer" onClick={() => setSendEmail(!sendEmail)}>
                                    <div className={cn(
                                        "w-12 h-6 rounded-full transition-colors relative",
                                        sendEmail ? "bg-white" : "bg-bg-main border border-border-main"
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
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between border-b border-border-main pb-2">
                                                <div>
                                                    <label className="block text-sm font-bold text-indigo-900">Assign to specific students</label>
                                                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Only {assignedStudents.length} students will see this mission</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={() => setAssignedStudents(students.map(s => s.id))} className="text-[10px] font-black text-brand-gold hover:text-indigo-800 transition-colors bg-brand-gold-secondary-hover px-3 py-1.5 rounded-lg">Select All</button>
                                                    <button type="button" onClick={() => setAssignedStudents([])} className="text-[10px] font-black text-text-secondary bg-border-main px-3 py-1.5 rounded-lg">Clear</button>
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
                                            {students
                                                .filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase()))
                                                .map(s => {
                                                    const isSelected = assignedStudents.includes(s.id);
                                                    return (
                                                        <label key={s.id} className={cn("flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all", isSelected ? "bg-bg-surface border-brand-gold/30 ring-2 ring-indigo-50" : "bg-bg-surface/80 border-border-main hover:bg-bg-surface")}>
                                                            <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all", isSelected ? "border-white bg-white text-black" : "border-border-main text-transparent")}>
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                            </div>
                                                            <input 
                                                                type="checkbox" 
                                                                className="hidden"
                                                                checked={isSelected} 
                                                                onChange={() => isSelected ? setAssignedStudents(assignedStudents.filter(id => id !== s.id)) : setAssignedStudents([...assignedStudents, s.id])} 
                                                            />
                                                            <div className="flex-1">
                                                                <div className="font-bold text-text-primary text-sm">{s.name}</div>
                                                                <div className="text-[10px] text-text-secondary font-mono">{s.email}</div>
                                                            </div>
                                                        </label>
                                                    );
                                                })
                                            }
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
                        <button type="submit" disabled={loading} className="w-full bg-white text-black font-black py-4 rounded-xl hover:bg-gray-200 transition shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-50">
                            {loading ? 'Saving Changes...' : 'Save Mission Updates'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
