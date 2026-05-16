import React, { useEffect, useState } from 'react';
import { 
    X, 
    Plus, 
    CheckCircle2, 
    Sparkles, 
    Target, 
    Camera 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { dbService } from '../../services/dbProvider';
import { handleFirestoreError, OperationType } from '../../lib/errorHandling';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { notifyStudentsOfNewAssignment } from '../../services/notificationService';
import { PRESET_TEMPLATES } from '../../constants/templates';

interface CreateAssignmentModalProps {
    onClose: () => void;
    onCreated: () => void;
}

export const CreateAssignmentModal = ({ onClose, onCreated }: CreateAssignmentModalProps) => {
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
            if (tmpl.testEntryFee) setTestEntryFee(tmpl.testEntryFee);
            if (tmpl.testReward) setTestReward(tmpl.testReward);
            if (tmpl.testPenalty) setTestPenalty(tmpl.testPenalty);
            if (tmpl.presEntryFee) setPresEntryFee(tmpl.presEntryFee);
            if (tmpl.presReward) setPresReward(tmpl.presReward);
            if (tmpl.presPenalty) setPresPenalty(tmpl.presPenalty);

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
        } else {
            setIsBonus(tmpl.isBonus || false);
            setIsDuoBonus(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !description) return;
        
        if (isDuoBonus) {
            if (!testStartDate || !testDueDate || !presStartDate || !presDueDate) {
                return toast.error("Please set dates for both Test and Presentation missions");
            }
            if (testRubric.length < 5 || testRubric.length > 10 || presRubric.length < 5 || presRubric.length > 10) {
                return toast.error("Duo missions require 5-10 criteria for both rubrics.");
            }
            const testWeight = testRubric.reduce((sum, r) => sum + r.weight, 0);
            const presWeight = presRubric.reduce((sum, r) => sum + r.weight, 0);
            if (Math.abs(testWeight - 100) > 0.01 || Math.abs(presWeight - 100) > 0.01) {
                return toast.error("Total weight for each rubric must be 100%");
            }
        } else {
            if (!dueDateStr || (!isBonus && !startDateStr)) {
                return toast.error("Please set the starting and deadline dates");
            }
            if (rubric.length > 0) {
                if (rubric.length < 5 || rubric.length > 10) {
                    return toast.error("Missions require 5-10 criteria for the rubric.");
                }
                const totalWeight = rubric.reduce((sum, r) => sum + (r.weight || 0), 0);
                if (Math.abs(totalWeight - 100) > 0.01) {
                    return toast.error(`Total weight must be 100% (currently ${totalWeight}%)`);
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
                assignmentsToCreate.push({
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

                assignmentsToCreate.push({
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
                return dbService.createAssignment(a as any).catch(e => handleFirestoreError(e, OperationType.WRITE, `assignments/batch` ));
            });
            
            await Promise.all(promises);

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

            if (sendEmail) {
                try {
                    await notifyStudentsOfNewAssignment(title, description, isGlobal ? undefined : assignedStudents);
                } catch (emailErr) {
                    console.error("Email notification failed during creation:", emailErr);
                    toast.error("Campaign created, but email alerts failed.");
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

    return (
        <div className="fixed inset-0 bg-text-primary/50 backdrop-blur-sm z-50 flex py-12 px-4 justify-center overflow-y-auto">
            <div className="bg-bg-surface rounded-3xl max-w-2xl w-full h-fit flex flex-col shadow-2xl">
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
                                <option value="">Start from scratch</option>
                                <optgroup label="System Templates">
                                    {PRESET_TEMPLATES.map(t => (
                                        <option key={t.id} value={t.id}>{t.label}</option>
                                    ))}
                                </optgroup>
                                {dbTemplates.length > 0 && (
                                    <optgroup label="Custom Templates">
                                        {dbTemplates.map(t => (
                                            <option key={t.id} value={t.id}>{t.label}</option>
                                        ))}
                                    </optgroup>
                                )}
                         </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                             <label className="block text-sm font-bold text-text-secondary mb-2">Subject / Course Name</label>
                             <input type="text" value={subject} onChange={e=>setSubject(e.target.value)} className="w-full px-5 py-3 border border-border-main rounded-xl focus:border-indigo-500 outline-none transition-all placeholder:text-text-secondary/80" placeholder="E.g. Advanced Physics Series" />
                        </div>
                        
                        <div className="md:col-span-2">
                             <label className="block text-sm font-bold text-text-secondary mb-2">Assignment Visibility</label>
                             <div className="grid grid-cols-2 gap-4 mb-4">
                                    <button 
                                        type="button"
                                        onClick={() => setIsGlobal(true)}
                                        className={cn(
                                            "px-6 py-4 rounded-2xl font-bold text-sm border-2 transition-all",
                                            isGlobal ? "bg-brand-gold-hover text-bg-main border-indigo-600 shadow-lg" : "bg-bg-surface text-text-secondary/80 border-border-main hover:border-brand-gold/30"
                                        )}
                                    >
                                        Global (All Students)
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setIsGlobal(false)}
                                        className={cn(
                                            "px-6 py-4 rounded-2xl font-bold text-sm border-2 transition-all",
                                            !isGlobal ? "bg-brand-gold-hover text-bg-main border-indigo-600 shadow-lg" : "bg-bg-surface text-text-secondary/80 border-border-main hover:border-brand-gold/30"
                                        )}
                                    >
                                        Selected Students
                                    </button>
                             </div>
                             
                             {!isGlobal && (
                                 <div className="space-y-4">
                                     <div className="flex items-center justify-between border-b border-border-main pb-2">
                                            <div>
                                                <label className="block text-sm font-bold text-indigo-900">Assign to specific students</label>
                                                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Only {assignedStudents.length} students will see this mission</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button type="button" onClick={() => setAssignedStudents(students.map(s => s.id))} className="text-[10px] font-black text-brand-gold bg-brand-gold-secondary-hover px-3 py-1.5 rounded-lg">Select All</button>
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
                                                     <label key={s.id} className={cn("flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all", isSelected ? "bg-bg-surface border-brand-gold/30 ring-2 ring-indigo-50 shadow-sm" : "bg-bg-surface/80 border-border-main hover:bg-bg-surface")}>
                                                         <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all", isSelected ? "border-indigo-600 bg-brand-gold-hover text-bg-main" : "border-border-main text-transparent")}>
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
                                                             <div className="text-[10px] text-text-secondary/80 font-mono">{s.email}</div>
                                                         </div>
                                                     </label>
                                                 );
                                             })
                                         }
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
                            <input type="text" required value={title} onChange={e=>setTitle(e.target.value)} className="w-full px-5 py-3 bg-bg-surface border border-border-main text-text-primary rounded-xl focus:border-indigo-500 outline-none transition-all placeholder:text-text-secondary" placeholder="E.g. Analyze Quantum States" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-text-primary mb-2">Description (Public)</label>
                            <textarea required value={description} onChange={e=>setDescription(e.target.value)} rows={2} className="w-full px-5 py-3 bg-bg-surface border border-border-main text-text-primary rounded-xl focus:border-indigo-500 outline-none transition-all resize-none placeholder:text-text-secondary" placeholder="Seen before enrolling..."></textarea>
                        </div>

                        {!isDuoBonus && (
                            <>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-text-primary mb-2">AI Guidance System (Hidden)</label>
                                    <textarea value={instructions} onChange={e=>setInstructions(e.target.value)} rows={3} className="w-full px-5 py-3 bg-bg-surface border border-border-main text-text-primary rounded-xl focus:border-indigo-500 outline-none transition-all resize-none placeholder:text-text-secondary" placeholder="E.g. Evaluate based on precise formulas..."></textarea>
                                </div>
                                
                                <div className="md:col-span-2 bg-brand-gold-secondary-hover/50 p-6 rounded-2xl border border-brand-gold/20">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-bold text-indigo-900">Grading Rubric</h3>
                                        <button type="button" onClick={() => setRubric([...rubric, {name: '', description: '', weight: 0}])} className="flex items-center gap-2 bg-brand-gold-secondary-hover text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-200 transition">
                                            <Plus className="w-4 h-4" /> Add Criterion
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {rubric.map((r, i) => (
                                            <div key={i} className="flex gap-4 items-start bg-bg-surface p-4 rounded-xl border border-indigo-50">
                                                <div className="flex-1 space-y-3">
                                                    <div className="flex gap-3">
                                                        <input type="text" value={r.name} onChange={e => { const newR = [...rubric]; newR[i].name = e.target.value; setRubric(newR); }} placeholder="Name" className="flex-1 px-3 py-2 border border-border-main rounded-lg text-sm outline-none font-bold" />
                                                        <input type="number" value={r.weight} onChange={e => { const newR = [...rubric]; newR[i].weight = Number(e.target.value); setRubric(newR); }} className="w-24 px-3 py-2 border border-border-main rounded-lg text-sm outline-none" />
                                                        <span className="text-sm font-bold text-text-secondary self-center">%</span>
                                                    </div>
                                                    <input type="text" value={r.description} onChange={e => { const newR = [...rubric]; newR[i].description = e.target.value; setRubric(newR); }} placeholder="Description..." className="w-full px-3 py-2 border border-border-main rounded-lg text-sm outline-none" />
                                                </div>
                                                <button type="button" onClick={() => setRubric(rubric.filter((_, idx) => idx !== i))} className="p-2 text-rose-400 hover:text-rose-600 rounded-lg transition">
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {isDuoBonus ? (
                            <div className="md:col-span-2 space-y-6 pt-6 border-t border-amber-100">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Test Mission Column */}
                                    <div className="bg-success-green/10/40 p-6 rounded-[2rem] border border-success-green/20 relative">
                                        <div className="flex items-center gap-3 mb-6">
                                            <Target className="w-5 h-5 text-emerald-600"/>
                                            <h3 className="font-black text-emerald-900 uppercase">Technical Test</h3>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-3">
                                                <input type="datetime-local" value={testStartDate} onChange={e=>setTestStartDate(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm" />
                                                <input type="datetime-local" value={testDueDate} onChange={e=>setTestDueDate(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm" />
                                            </div>
                                            <textarea value={testInstructions} onChange={e=>setTestInstructions(e.target.value)} rows={3} className="w-full px-4 py-2 border rounded-xl text-sm" placeholder="AI Logic..."></textarea>
                                        </div>
                                    </div>

                                    {/* Presentation Column */}
                                    <div className="bg-brand-gold-secondary-hover/40 p-6 rounded-[2rem] border border-brand-gold/20 relative">
                                        <div className="flex items-center gap-3 mb-6">
                                            <Camera className="w-5 h-5 text-brand-gold"/>
                                            <h3 className="font-black text-indigo-900 uppercase">Presentation</h3>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-3">
                                                <input type="datetime-local" value={presStartDate} onChange={e=>setPresStartDate(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm" />
                                                <input type="datetime-local" value={presDueDate} onChange={e=>setPresDueDate(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm" />
                                            </div>
                                            <textarea value={presInstructions} onChange={e=>setPresInstructions(e.target.value)} rows={3} className="w-full px-4 py-2 border rounded-xl text-sm" placeholder="Report & Theory..."></textarea>
                                        </div>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setIsDuoBonus(false)} className="text-xs font-black text-brand-gold uppercase tracking-widest underline w-full text-center mt-4">Switch to Standard</button>
                            </div>
                        ) : (
                            <>
                                 <div className="md:col-span-2">
                                     <label className="flex items-center gap-3 cursor-pointer bg-amber-50 p-4 rounded-xl border border-brand-gold/30">
                                         <input type="checkbox" checked={isBonus} onChange={e=>setIsBonus(e.target.checked)} className="w-5 h-5 text-brand-gold rounded border-border-main" />
                                         <div>
                                             <span className="block text-sm font-black text-amber-800 uppercase">Special Bonus Assignment?</span>
                                             <span className="text-xs text-brand-gold font-medium">Overrides frequency.</span>
                                         </div>
                                     </label>
                                 </div>
                                
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-text-secondary mb-2">Mission Start Date</label>
                                    <input type="datetime-local" required value={startDateStr} onChange={e=>setStartDateStr(e.target.value)} className="w-full px-5 py-3 border border-border-main rounded-xl outline-none font-medium" />
                                </div>

                                {!isBonus && (
                                    <div>
                                        <label className="block text-sm font-bold text-text-primary mb-2">Frequency</label>
                                        <select value={frequency} onChange={e=>setFrequency(e.target.value)} className="w-full px-5 py-3 bg-bg-surface border border-border-main text-text-primary rounded-xl outline-none font-medium">
                                            <option value="one_time">Single Mission</option>
                                            <option value="daily">Daily Drip</option>
                                            <option value="alternate">Alternate Days</option>
                                        </select>
                                    </div>
                                )}

                                <div className="md:col-span-1">
                                    <label className="block text-sm font-bold text-text-primary mb-2">Deadline</label>
                                    <input type="datetime-local" required value={dueDateStr} onChange={e=>setDueDateStr(e.target.value)} className="w-full px-5 py-3 bg-bg-surface border border-border-main text-text-primary rounded-xl outline-none font-medium" />
                                </div>

                                <div className="grid grid-cols-3 md:col-span-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-text-secondary mb-2">Fee</label>
                                        <input type="number" required value={entryFee} onChange={e=>setEntryFee(Number(e.target.value))} className="w-full px-5 py-3 border border-border-main rounded-xl outline-none font-bold text-indigo-700" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-text-secondary mb-2">Reward</label>
                                        <input type="number" required value={bonusReward} onChange={e=>setBonusReward(Number(e.target.value))} className="w-full px-5 py-3 border border-border-main rounded-xl outline-none font-bold text-success-green" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-text-secondary mb-2">Penalty</label>
                                        <input type="number" required value={penaltyFee} onChange={e=>setPenaltyFee(Number(e.target.value))} className="w-full px-5 py-3 border border-border-main rounded-xl outline-none font-bold text-rose-600" />
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
