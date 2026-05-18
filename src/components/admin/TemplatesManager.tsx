import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adminService, assignmentService } from '../../services/dbProvider';
import { toast } from 'react-hot-toast';
import { AssignmentTemplate } from '../../types';

export const TemplatesManager = () => {
    const { user } = useAuth();
    const [templates, setTemplates] = useState<AssignmentTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Form fields
    const [label, setLabel] = useState('');
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [instructions, setInstructions] = useState('');
    const [timeLimit, setTimeLimit] = useState(20);
    const [rubric, setRubric] = useState<{name: string, description: string, weight: number}[]>([
        { name: 'Criteria 1', description: 'desc', weight: 100 }
    ]);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const tmpls = await assignmentService.getAssignmentTemplates();
            setTemplates(tmpls);
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to load templates");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete template?")) return;
        try {
            await assignmentService.deleteAssignmentTemplate(id);
            toast.success("Template deleted");
            await fetchTemplates();
        } catch(err) {
            toast.error("Failed to delete template");
        }
    }

    const handleSeedTemplates = async () => {
        if (!user) return;
        const seedTemplates: AssignmentTemplate[] = [
            {
                id: 'zbrush_sculpt',
                label: 'Zbrush Sculpting Hero',
                title: 'High-Poly Character Sculpt',
                subject: '3D Modeling',
                description: 'Sculpt a highly detailed character bust mimicking industry AAA standards using Zbrush.',
                instructions: 'Use Dynamesh for initial forms, ZRemesher for topology, and carefully apply subdivision levels. Focus on primary forms before jumping into micro-details. Export final renders as ZPR and ZTL files, along with clay renders.',
                timeLimitMinutes: 180,
                rubric: [
                    { name: 'Anatomy & Proportions', description: 'Accurate structural foundations and silhouette', weight: 40 },
                    { name: 'Surface Details', description: 'Realism in pores, wrinkles, and secondary forms', weight: 30 },
                    { name: 'Topology & Optimization', description: 'Efficient subdivision loops and clean mesh flow', weight: 30 }
                ],
                creatorId: user.id,
                createdAt: Date.now()
            },
            {
                id: 'maya_anim',
                label: 'Maya Combat Animation',
                title: 'Weight & Impact Animation',
                subject: 'Animation',
                description: 'Create a 3-5 second combat attack animation emphasizing weight, timing, and impact using Maya.',
                instructions: 'Start with strong key poses. Use the Graph Editor to refine arcs and ease-in/ease-out. Pay attention to anticipation, follow-through, and overlapping action. Ensure the rig constraints are optimally used.',
                timeLimitMinutes: 120,
                rubric: [
                    { name: 'Timing & Spacing', description: 'Proper weight distribution and kinetic energy', weight: 40 },
                    { name: 'Posing & Silhouette', description: 'Clear readability of action frames', weight: 40 },
                    { name: 'Graph Editor Polish', description: 'Smooth arcs, no IK pops or jitter', weight: 20 }
                ],
                creatorId: user.id,
                createdAt: Date.now()
            },
            {
                id: 'unreal_cine',
                label: 'Unreal Cinematics',
                title: 'In-Engine Lighting & Camera',
                subject: 'Game Dev',
                description: 'Setup a dramatic lighting scenario and camera movement in Unreal Engine 5 using Lumen and Sequencer.',
                instructions: 'Use the rule of thirds. Setup a 3-point lighting or a dramatic single-source key light setup. Use Sequencer to animate a slow tracking camera. Enable Lumen for Global Illumination and reflections. Ensure post-process volumes enhance the mood safely without blowing out highlights.',
                timeLimitMinutes: 90,
                rubric: [
                    { name: 'Lighting & Mood', description: 'Effective use of shadows, contrast, and color temperature', weight: 50 },
                    { name: 'Camera Composition', description: 'Depth of field, safe zones, rule of thirds', weight: 30 },
                    { name: 'Engine Optimization', description: 'Clean actor hierarchy and proper Lumen constraints', weight: 20 }
                ],
                creatorId: user.id,
                createdAt: Date.now()
            }
        ];

        try {
            for (const t of seedTemplates) {
                await adminService.saveAssignmentTemplate(t.id, t);
            }
            toast.success("Industry templates seeded successfully!");
            await fetchTemplates();
        } catch (err) {
            toast.error("Failed to seed templates");
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        try {
            const code = label.toLowerCase().replace(/\s+/g, '_');
            const newTmpl: AssignmentTemplate = {
                id: code,
                label, title, subject, description, instructions, timeLimitMinutes: timeLimit, rubric,
                creatorId: user.id,
                createdAt: Date.now()
            };
            await adminService.saveAssignmentTemplate(code, newTmpl);
            toast.success("Template created!");
            setLabel(''); setTitle(''); setSubject(''); setDescription(''); setInstructions('');
            await fetchTemplates();
        } catch(err) {
            toast.error("Failed to create template");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-bg-surface p-6 rounded-[32px] border border-gray-50 shadow-sm">
                <div>
                   <h3 className="text-xl font-black text-text-primary mb-1">Templates Library</h3>
                   <p className="text-text-secondary text-sm font-medium">Manage assignment structures and AI grading rubrics</p>
                </div>
                <button 
                  onClick={handleSeedTemplates}
                  className="bg-brand-gold-hover hover:bg-indigo-700 text-bg-main font-bold py-2.5 px-6 rounded-xl transition-colors shadow-md shadow-indigo-600/20"
                >
                  Seed Industry Templates
                </button>
            </div>

            <div className="bg-bg-surface p-8 rounded-[32px] border border-gray-50 shadow-sm">
                <h3 className="text-xl font-black text-text-primary mb-6">Create New Template</h3>
                <form onSubmit={handleCreate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-text-secondary/80 uppercase mb-2">Internal Label (e.g., Physics Essay)</label>
                            <input required value={label} onChange={e=>setLabel(e.target.value)} className="w-full px-5 py-3.5 bg-bg-main border border-transparent rounded-[18px] focus:bg-bg-surface focus:border-indigo-500 font-bold" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary/80 uppercase mb-2">Mission Title</label>
                            <input required value={title} onChange={e=>setTitle(e.target.value)} className="w-full px-5 py-3.5 bg-bg-main border border-transparent rounded-[18px] focus:bg-bg-surface focus:border-indigo-500 font-bold" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary/80 uppercase mb-2">Subject</label>
                            <input required value={subject} onChange={e=>setSubject(e.target.value)} className="w-full px-5 py-3.5 bg-bg-main border border-transparent rounded-[18px] focus:bg-bg-surface focus:border-indigo-500 font-bold" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary/80 uppercase mb-2">Time Limit (mins)</label>
                            <input type="number" required value={timeLimit} onChange={e=>setTimeLimit(Number(e.target.value))} className="w-full px-5 py-3.5 bg-bg-main border border-transparent rounded-[18px] focus:bg-bg-surface focus:border-indigo-500 font-bold" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-text-secondary/80 uppercase mb-2">Description</label>
                        <textarea required value={description} onChange={e=>setDescription(e.target.value)} className="w-full px-5 py-3.5 bg-bg-main border border-transparent rounded-[18px] focus:bg-bg-surface focus:border-indigo-500 font-bold h-24" />
                    </div>
                    <button type="submit" className="px-8 py-4 bg-brand-gold-hover text-bg-main rounded-[16px] font-bold hover:bg-indigo-700 transition">Save Template</button>
                </form>
            </div>

            <div className="bg-bg-surface rounded-[32px] border border-gray-50 shadow-sm overflow-hidden p-6">
                <h3 className="text-xl font-black text-text-primary mb-6">Existing Templates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map(t => (
                        <div key={t.id} className="p-4 border border-border-main rounded-2xl bg-bg-main/50">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-bold text-text-primary">{t.label}</h4>
                                    <p className="text-xs text-text-secondary font-medium">{t.subject}</p>
                                </div>
                                <button onClick={() => handleDelete(t.id)} className="text-rose-500 hover:bg-rose-500/10 p-2 rounded-xl transition">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-sm font-medium text-text-secondary mt-2 line-clamp-2">{t.description}</p>
                        </div>
                    ))}
                    {templates.length === 0 && <div className="text-sm text-text-secondary/80 font-medium col-span-2">No templates yet.</div>}
                </div>
            </div>
        </div>
    );
};

