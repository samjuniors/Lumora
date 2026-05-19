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
import { Card, Button } from '../CommonUI';
import { useAuth } from '../../context/AuthContext';

interface MissionCardProps {
    assignment: Assignment;
    user: any;
    enrollments?: any[];
    onEdit?: (a: Assignment) => void;
}

export const MissionCard = ({ assignment, user, enrollments = [], onEdit }: MissionCardProps) => {
    const navigate = useNavigate();
    const { isAdmin, isStudent } = useAuth();
    const status = getAssignmentStatus(assignment, enrollments, isStudent, user?.id);
    const config = getStatusConfig(status, assignment.isBonus);
    
    return (
        <motion.div 
            layout
            variants={{
                hidden: { opacity: 0, y: 10 },
                show: { opacity: 1, y: 0 }
            }}
            whileHover={{ y: -4 }}
            className="group h-full cursor-pointer"
            onClick={() => navigate(`/assignments/${assignment.id}`)}
        >
            <Card 
                variant="flat" 
                className={cn(
                    "flex flex-col h-full p-4 md:p-6 transition-all duration-300 border-white/[0.03] group-hover:border-white/10 group-hover:bg-white/[0.04]", 
                    assignment.isBonus && "border-brand-gold/30 bg-brand-gold/[0.02]"
                )}
            >
                {/* XP Badge */}
                <div className="absolute top-0 right-0">
                    <div className={cn(
                        "px-4 py-2 rounded-bl-2xl font-black text-[10px] flex items-center gap-1.5 shadow-lg border-b border-l",
                        assignment.isBonus 
                            ? "bg-brand-gold text-bg-main border-brand-gold/30 shadow-brand-gold/10" 
                            : "bg-white/[0.03] text-brand-gold border-white/5"
                    )}>
                        <Sparkles className="w-3.5 h-3.5" />
                        +{assignment.xpReward || 50} XP
                    </div>
                </div>

                <div className="flex items-center gap-3 mb-6">
                     <span className={cn(
                            "px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.2em] rounded-md border",
                            config.tag
                     )}>
                        {config.label}
                     </span>
                     <div className="flex items-center gap-2 text-[10px] font-black text-text-muted uppercase tracking-widest">
                        <Clock className="w-3.5 h-3.5 text-brand-gold/50"/> {format(assignment.dueDate, 'MMM d, p')}
                     </div>
                </div>
                
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <BookOpen size={16} className="text-brand-gold/40" />
                            <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">{assignment.subject || 'Strategic Objective'}</span>
                        </div>
                        <h3 className={cn(
                            "text-xl md:text-2xl font-black tracking-tight leading-tight line-clamp-2",
                            assignment.isBonus ? "text-brand-gold text-glow-gold" : "text-text-primary"
                        )}>
                            {assignment.title}
                        </h3>
                    </div>
                </div>
                
                <div className="mt-auto pt-6 border-t border-white/[0.03] flex items-center justify-between gap-4">
                    <p className="text-[11px] text-text-muted font-bold tracking-tight line-clamp-1 flex-1 opacity-70 group-hover:opacity-100 transition-opacity">{assignment.description}</p>
                    <div className="flex items-center gap-3">
                        {isAdmin && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onEdit?.(assignment); }}
                                className="p-2.5 bg-white/[0.03] hover:bg-white/[0.1] text-text-muted hover:text-brand-gold rounded-xl transition-all border border-white/5"
                                title="Mission Parameters"
                            >
                                <Edit size={16} />
                            </button>
                        )}
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] group/btn">
                           <span className="group-hover/btn:mr-1 transition-all">Proceed</span> 
                           <ChevronRight size={16} className="group-hover/btn:translate-x-0.5 transition-transform" />
                        </div>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
};

