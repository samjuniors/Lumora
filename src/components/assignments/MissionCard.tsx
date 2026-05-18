import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
    Clock, 
    ChevronRight, 
    Sparkles, 
    Edit,
    BookOpen
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { Assignment } from '../../types';
import { getAssignmentStatus, getStatusConfig } from '../../lib/assignmentUtils';

interface MissionCardProps {
    assignment: Assignment;
    user: any;
    enrollments?: any[];
    onEdit?: (a: Assignment) => void;
}

export const MissionCard = ({ assignment, user, enrollments = [], onEdit }: MissionCardProps) => {
    const navigate = useNavigate();
    const status = getAssignmentStatus(assignment, enrollments, user?.role, user?.id);
    const config = getStatusConfig(status, assignment.isBonus);
    
    return (
        <motion.div 
            layout
            variants={{
                hidden: { opacity: 0, y: 10 },
                show: { opacity: 1, y: 0 }
            }}
            whileHover={{ y: -2 }}
            className={cn(
                "card-premium p-5 flex flex-col relative overflow-hidden transition-all duration-300", 
                config.color
            )}
            onClick={() => navigate(`/assignments/${assignment.id}`)}
        >
            {/* XP Badge */}
            <div className="absolute top-0 right-0">
                <div className={cn(
                    "px-3 py-1.5 rounded-bl-xl font-black text-[10px] flex items-center gap-1 shadow-sm border-b border-l",
                    assignment.isBonus 
                        ? "bg-brand-gold text-navy-950 border-brand-gold" 
                        : "bg-navy-800 text-brand-gold border-navy-700"
                )}>
                    <Sparkles className="w-3 h-3" />
                    +{assignment.xpReward || 50} XP
                </div>
            </div>

            <div className="flex items-center gap-3 mb-4">
                 <span className={cn(
                        "px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded border",
                        config.tag
                 )}>
                    {config.label}
                 </span>
                 <div className="flex items-center gap-1.5 text-[9px] font-bold text-text-secondary uppercase tracking-tight">
                    <Clock className="w-3 h-3"/> {format(assignment.dueDate, 'MMM d')}
                 </div>
            </div>
            
            <div className="flex items-start justify-between gap-4 mb-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <BookOpen size={14} className="text-brand-gold opacity-50" />
                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{assignment.subject || 'Core Objective'}</span>
                    </div>
                    <h3 className="font-display font-bold text-lg md:text-xl text-text-primary leading-tight truncate">
                        {assignment.title}
                    </h3>
                </div>
            </div>
            
            <div className="mt-auto flex items-center justify-between gap-4">
                <p className="text-xs text-text-secondary font-medium line-clamp-1 flex-1">{assignment.description}</p>
                <div className="flex items-center gap-2">
                    {(user?.role === 'admin' || user?.role === 'superadmin') && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onEdit?.(assignment); }}
                            className="p-2 bg-navy-800 hover:bg-navy-700 text-text-secondary hover:text-brand-gold rounded-lg transition-colors border border-navy-700"
                            title="Configure Mission"
                        >
                            <Edit size={14} />
                        </button>
                    )}
                    <div className="flex items-center gap-1 text-[10px] font-black text-brand-gold uppercase tracking-widest group">
                        Enter <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

