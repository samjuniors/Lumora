import React, { useState, useEffect } from 'react';
import { 
    Search, 
    Filter, 
    Eye, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    ShieldAlert, 
    Bot, 
    Trash2, 
    Maximize2,
    X,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    Search as SearchIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { submissionService, userService, adminService, assignmentService } from '../../services/dbProvider';
import { toast } from 'react-hot-toast';
import { Submission, User, AssignmentTemplate } from '../../types';
import { cn } from '../../lib/utils';
import ReactMarkdown from 'react-markdown';

export const ReviewsManager = () => {
    const { user } = useAuth();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [users, setUsers] = useState<Record<string, User>>({});
    const [templates, setTemplates] = useState<Record<string, AssignmentTemplate>>({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<Submission['status'] | 'all'>('pending');
    
    // Inspect interaction
    const [inspectingSub, setInspectingSub] = useState<Submission | null>(null);
    const [isAssessing, setIsAssessing] = useState(false);
    const [fullViewImage, setFullViewImage] = useState<string | null>(null);

    useEffect(() => {
        fetchSubmissions();
    }, []);

    const fetchSubmissions = async () => {
        setLoading(true);
        try {
            const [subs, allUsers, tmpls] = await Promise.all([
                submissionService.getAllSubmissions(),
                userService.getAllUsers(),
                assignmentService.getAssignmentTemplates()
            ]);
            
            subs.sort((a,b) => b.submittedAt - a.submittedAt);
            setSubmissions(subs);

            const uMap: Record<string, User> = {};
            allUsers.forEach(u => uMap[u.id] = u);
            setUsers(uMap);

            const tMap: Record<string, AssignmentTemplate> = {};
            tmpls.forEach(t => tMap[t.id] = t);
            setTemplates(tMap);
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to load platform reviews");
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async (sub: Submission) => {
        if (!confirm("Permanently incinerate this attempt? No coins returned. Student must re-submit.")) return;
        try {
            await submissionService.updateSubmission(sub.id, { 
                status: 'rejected',
                reviewedAt: Date.now(),
                reviewedBy: user!.id
            });
            toast.success("Submission incinerated");
            await fetchSubmissions();
            setInspectingSub(null);
        } catch(err) {
            toast.error("Incineration failed");
        }
    };

    const handleAssess = async (sub: Submission) => {
        setIsAssessing(true);
        const toastId = toast.loading("AI Oracle is analyzing submission...");
        try {
            const tmpl = templates[sub.assignmentId];
            if (!tmpl) throw new Error("Template missing");

            const student = users[sub.studentId];
            if (!student) throw new Error("Student data missing");

            const response = await fetch('/api/ai/assess', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    submission: sub,
                    template: tmpl,
                    student
                })
            });

            const result = await response.json();
            if (result.error) throw new Error(result.error);

            // Update submission status
            await submissionService.updateSubmission(sub.id, {
                status: 'assessed',
                aiScore: result.score,
                aiFeedback: result.feedback,
                reviewedAt: Date.now(),
                reviewedBy: user!.id
            });

            // Reward calculation logic (handled via cloud function or service)
            await adminService.processAssessmentRewards(sub.id, result.score);

            toast.success("AI Assessment Complete. Rewards Distributed.", { id: toastId });
            await fetchSubmissions();
            setInspectingSub(null);
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Assessment failed", { id: toastId });
        } finally {
            setIsAssessing(false);
        }
    };

    const filtered = submissions.filter(s => {
        const student = users[s.studentId];
        const tmpl = templates[s.assignmentId];
        const matchesSearch = 
            student?.name?.toLowerCase().includes(search.toLowerCase()) ||
            tmpl?.title?.toLowerCase().includes(search.toLowerCase()) ||
            s.content?.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary/80 w-5 h-5" />
                    <input 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Inspect submissions..." 
                        className="w-full pl-12 pr-6 py-3.5 bg-bg-surface border border-border-main rounded-[24px] shadow-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1">
                    {(['pending', 'assessed', 'rejected', 'all'] as any[]).map((st) => (
                        <button
                            key={st}
                            onClick={() => setStatusFilter(st)}
                            className={cn(
                                "whitespace-nowrap px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                                statusFilter === st 
                                    ? "bg-brand-gold-hover text-bg-main shadow-lg shadow-indigo-100" 
                                    : "bg-bg-surface text-text-secondary border border-border-main hover:border-brand-gold/20"
                            )}
                        >
                            {st === 'all' ? 'Everywhere' : st}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(s => {
                    const student = users[s.studentId];
                    const tmpl = templates[s.assignmentId];
                    const riskLevel = (s.tabSwitches || 0) > 3 || (s.pasteCount || 0) > 10;

                    return (
                        <motion.div 
                            key={s.id}
                            layoutId={s.id}
                            onClick={() => setInspectingSub(s)}
                            className="bg-bg-surface rounded-[32px] p-6 border border-border-main shadow-sm hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group relative overflow-hidden"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-bg-main rounded-2xl border border-border-main group-hover:scale-110 group-hover:-rotate-3 transition-transform">
                                    <Bot className={cn("w-6 h-6", s.status === 'assessed' ? 'text-brand-gold' : 'text-text-secondary/60')} />
                                </div>
                                <div className={cn(
                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                    s.status === 'assessed' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                    s.status === 'rejected' ? "bg-rose-500/10 text-rose-600 border-rose-500/20" :
                                    "bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse"
                                )}>
                                    {s.status}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-black text-text-primary text-lg tracking-tight group-hover:text-brand-gold transition-colors">{tmpl?.title || 'Unknown Mission'}</h3>
                                    <p className="text-sm font-bold text-text-secondary flex items-center gap-2">
                                        by {student?.name || 'Unknown Student'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 py-4 border-y border-border-main/50">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-text-secondary/40 tracking-widest mb-1 leading-none">Integrity</p>
                                        <div className={cn("text-xs font-black", riskLevel ? "text-rose-500" : "text-emerald-500")}>
                                            {riskLevel ? "High Risk" : "Secure"}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-text-secondary/40 tracking-widest mb-1 leading-none">Tokens</p>
                                        <div className="text-xs font-black text-brand-gold">
                                            {s.aiScore ? `${Math.round(s.aiScore)}% Perf.` : "Pending..."}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-text-secondary/60">
                                    <div className="flex items-center gap-1.5 font-bold">
                                        <Clock className="w-3.5 h-3.5" />
                                        {format(s.submittedAt, 'MMM dd, HH:mm')}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        View Details <Eye className="w-3 h-3" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {filtered.length === 0 && !loading && (
                <div className="py-20 text-center bg-bg-surface rounded-3xl border border-dashed border-border-main">
                    <p className="text-text-secondary/80 font-bold italic">No pending mission reports discovered.</p>
                </div>
            )}

            {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                    {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-bg-surface rounded-[32px] border border-border-main"></div>)}
                </div>
            )}

            {/* Inspection Overlay */}
            <AnimatePresence>
                {inspectingSub && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-text-primary/60 backdrop-blur-md z-[500] flex items-end md:items-center justify-center p-0 md:p-6"
                    >
                        <motion.div 
                            initial={{ y: 200, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 200, opacity: 0 }}
                            className="bg-bg-surface w-full max-w-5xl h-[95vh] md:h-auto md:max-h-[90vh] rounded-t-[40px] md:rounded-[40px] shadow-2xl flex flex-col overflow-hidden"
                        >
                            <div className="p-6 md:p-8 bg-bg-main border-b border-border-main flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-brand-gold text-bg-main flex items-center justify-center font-black shadow-lg">
                                        <Bot size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-text-primary tracking-tight">Oracle Inspection</h2>
                                        <p className="text-xs text-text-secondary/80 font-bold uppercase tracking-widest">
                                            {templates[inspectingSub.assignmentId]?.title} • {users[inspectingSub.studentId]?.name}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setInspectingSub(null)} className="p-3 hover:bg-border-main rounded-2xl transition-all text-text-secondary">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-grow overflow-y-auto p-6 md:p-8 no-scrollbar">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 space-y-8">
                                        <div className="bg-bg-main/50 rounded-[32px] p-8 border border-border-main shadow-inner">
                                            <h3 className="text-[10px] font-black text-text-secondary/50 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                                <Eye className="w-3 h-3 text-brand-gold" /> Raw Submission Payload
                                            </h3>
                                            <div className="prose prose-slate max-w-none prose-sm font-medium leading-relaxed text-text-primary/90 whitespace-pre-wrap">
                                                {inspectingSub.content}
                                            </div>
                                        </div>
                                        
                                        {inspectingSub.attachments && inspectingSub.attachments.length > 0 && (
                                            <div className="space-y-4">
                                                <h3 className="text-[10px] font-black text-text-secondary/50 uppercase tracking-[0.2em] flex items-center gap-2">
                                                    <Maximize2 className="w-3 h-3 text-brand-gold" /> Evidence Attachments ({inspectingSub.attachments.length})
                                                </h3>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                    {inspectingSub.attachments.map((att, i) => (
                                                        <div 
                                                            key={i} 
                                                            onClick={() => setFullViewImage(att.url)}
                                                            className="relative aspect-video rounded-2xl overflow-hidden border border-border-main bg-bg-main group cursor-zoom-in"
                                                        >
                                                            <img src={att.url} alt={`Evidence ${i}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                            <div className="absolute inset-0 bg-text-primary/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <Maximize2 className="text-white w-6 h-6" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-6">
                                        <div className="bg-bg-surface rounded-3xl p-6 border border-border-main shadow-xl space-y-6">
                                            <h3 className="text-[10px] font-black text-text-primary uppercase tracking-widest text-center">In-System Security Audit</h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className={cn(
                                                    "p-4 rounded-2xl border text-center",
                                                    (inspectingSub.tabSwitches || 0) > 2 ? "bg-rose-500/5 border-rose-500/20" : "bg-bg-main border-border-main"
                                                )}>
                                                    <p className="text-[8px] font-black text-text-secondary/50 uppercase mb-1">Focus Jumps</p>
                                                    <p className={cn("text-xl font-black", (inspectingSub.tabSwitches || 0) > 2 ? "text-rose-500" : "text-text-primary")}>{inspectingSub.tabSwitches || 0}</p>
                                                </div>
                                                <div className="p-4 bg-bg-main rounded-2xl border border-border-main text-center">
                                                    <p className="text-[8px] font-black text-text-secondary/50 uppercase mb-1">Paste Events</p>
                                                    <p className="text-xl font-black text-text-primary">{inspectingSub.pasteCount || 0}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <p className="text-[10px] font-black text-text-secondary/80 uppercase tracking-widest pl-1">Oracle Judgement</p>
                                                {inspectingSub.status === 'assessed' ? (
                                                    <div className="p-5 bg-brand-gold/10 border border-brand-gold/20 rounded-2xl">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <span className="text-xs font-black text-brand-gold uppercase tracking-widest">Perf. Score</span>
                                                            <span className="text-2xl font-black text-brand-gold">{Math.round(inspectingSub.aiScore || 0)}%</span>
                                                        </div>
                                                        <div className="text-xs text-brand-gold/90 font-medium leading-relaxed prose prose-invert max-w-none">
                                                            <ReactMarkdown>{inspectingSub.aiFeedback || ''}</ReactMarkdown>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="p-5 bg-bg-main border border-border-main rounded-2xl flex flex-col items-center gap-4 text-center">
                                                        <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center">
                                                            <Bot className="w-6 h-6 text-amber-500" />
                                                        </div>
                                                        <p className="text-xs font-bold text-text-secondary leading-relaxed px-4">The AI Oracle is ready to evaluate structure, tone, and technical accuracy.</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-3 pt-6 border-t border-border-main/50">
                                                {inspectingSub.status === 'pending' && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleAssess(inspectingSub)}
                                                            disabled={isAssessing}
                                                            className="w-full bg-brand-gold-hover text-bg-main py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                                                        >
                                                            {isAssessing ? "Oracle analyzing..." : "Confirm AI Assessment"}
                                                        </button>
                                                        <button 
                                                            onClick={() => handleReject(inspectingSub)}
                                                            className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 transition-all border border-rose-500/10"
                                                        >
                                                            Reject & Archive
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Lightbox */}
            <AnimatePresence>
                {fullViewImage && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setFullViewImage(null)}
                        className="fixed inset-0 bg-text-primary/95 backdrop-blur-2xl z-[1000] p-4 md:p-20 flex items-center justify-center cursor-zoom-out"
                    >
                        <button onClick={() => setFullViewImage(null)} className="absolute top-10 right-10 p-4 text-white/50 hover:text-white transition-all hover:bg-white/10 rounded-full">
                            <X size={40} />
                        </button>
                        <motion.img 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            src={fullViewImage} 
                            alt="Full Analysis" 
                            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" 
                            onClick={e => e.stopPropagation()}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

