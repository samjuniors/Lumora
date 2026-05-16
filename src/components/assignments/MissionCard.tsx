import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
    Clock, 
    X, 
    ChevronRight, 
    ChevronDown, 
    ChevronUp, 
    Target, 
    Sparkles, 
    Edit 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { Assignment } from '../../types';

interface MissionCardProps {
    assignment: Assignment;
    user: any;
    getAssignmentStatus: (a: Assignment) => string;
    onEdit?: (a: Assignment) => void;
}

export const MissionCard = ({ assignment, user, getAssignmentStatus, onEdit }: MissionCardProps) => {
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
                        "bg-bg-surface hover:bg-text-primary hover:text-bg-main text-text-primary border-border-main"
                    )}
                >
                     {user?.role === 'student' ? (status === 'completed' ? 'View Results' : 'Start Mission') : 'Manage Mission'} 
                     <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform"/>
                </button>
            </div>
        </motion.div>
    );
};
