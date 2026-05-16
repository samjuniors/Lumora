import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbProvider';
import { Submission, Assignment } from '../types';
import { BookOpen, CheckCircle, ChevronRight, ChevronDown, X, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';
import { handleFirestoreError, OperationType } from '../lib/errorHandling';

interface CompletedMission {
  submission: Submission;
  assignment: Assignment;
}

export const CompletedMissionsStack = () => {
  const { user } = useAuth();
  const [missions, setMissions] = useState<CompletedMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState<CompletedMission | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'student') {
      setLoading(false);
      return;
    }

    const fetchCompletedMissions = async () => {
      try {
        const missionData = await dbService.getRecentAssessedMissions(user.id, 5);
        setMissions(missionData);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompletedMissions();
  }, [user?.id, user?.gradedCount]);

  if (loading || missions.length === 0) return null;

  return (
    <div className="relative w-full mb-10">
      <div className="flex justify-between items-end px-2 mb-6">
        <div>
          <h2 className="text-xl font-display font-bold text-text-primary flex items-center gap-2">
            Completed Missions
          </h2>
          <p className="text-text-secondary text-xs mt-1 font-medium italic">Recently assessed intelligence logs</p>
        </div>
        {isOpen && (
           <button 
             onClick={() => setIsOpen(false)}
             className="text-xs font-bold text-brand-gold hover:text-white transition flex items-center gap-1 uppercase tracking-wider"
           >
             Collapse <X size={14} />
           </button>
        )}
      </div>

      <AnimatePresence>
        {!isOpen ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative h-28 cursor-pointer group w-full max-w-sm mx-auto md:max-w-none md:mx-0"
            onClick={() => setIsOpen(true)}
          >
            {missions.map((mission, index) => {
              return (
                <motion.div
                  key={mission.submission.id}
                  className="absolute inset-0 bg-navy-900 border border-navy-700 shadow-xl rounded-2xl p-5 flex items-center justify-between"
                  style={{
                    zIndex: missions.length - index
                  }}
                  animate={{
                    y: index * -8,
                    scale: 1 - (index * 0.04),
                    opacity: 1 - (index * 0.15),
                  }}
                  whileHover={{
                    y: index * -10 - 2,
                    scale: 1 - (index * 0.04) + 0.01
                  }}
                >
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-success/10 text-success rounded-lg flex items-center justify-center border border-success/20">
                        <CheckCircle size={20} />
                     </div>
                     <div>
                       <h3 className="font-bold text-sm tracking-tight text-text-primary truncate max-w-[150px] sm:max-w-[300px]">{mission.assignment.title}</h3>
                       <p className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">{new Date(mission.submission.submittedAt).toLocaleDateString()}</p>
                     </div>
                   </div>
                   <div className="flex flex-col items-end">
                      <div className="text-lg font-display font-bold text-brand-gold">
                         {mission.submission.aiScore}%
                      </div>
                      <div className="text-[9px] text-text-secondary uppercase font-bold">Accuracy</div>
                   </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.05 }
              }
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {missions.map((mission) => (
              <motion.div
                key={mission.submission.id}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  show: { opacity: 1, y: 0 }
                }}
                className="card-premium p-5 flex flex-col group relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-4 gap-4">
                   <div className="min-w-0">
                      <h3 className="font-bold text-text-primary text-base tracking-tight truncate" title={mission.assignment.title}>
                        {mission.assignment.title}
                      </h3>
                      <p className="text-[11px] text-text-secondary mt-0.5">
                        {new Date(mission.submission.submittedAt).toLocaleDateString()}
                      </p>
                   </div>
                   <div className={cn(
                     "text-lg font-display font-bold px-3 py-1 rounded-lg border",
                     mission.submission.aiScore >= 80 ? "bg-success/10 text-success border-success/20" :
                     mission.submission.aiScore >= 50 ? "bg-brand-gold/10 text-brand-gold border-brand-gold/20" :
                     "bg-error/10 text-error border-error/20"
                   )}>
                      {mission.submission.aiScore}%
                   </div>
                </div>
                
                <div className="mb-5 p-3 bg-navy-800 rounded-xl border border-navy-700/50">
                  <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 opacity-50">Strategic Feedback</div>
                  <div className="text-xs text-text-secondary line-clamp-3 leading-relaxed italic">
                     {(mission.submission.aiFeedback || "").replace(/[\*\#]/g, '')}
                  </div>
                </div>

                <div className="mt-auto">
                   <Link 
                      to={`/assignments/${mission.assignment.id}`} 
                      className="w-full py-2 bg-navy-800 hover:bg-navy-700 border border-navy-700 text-text-primary font-bold rounded-lg transition-all text-xs flex items-center justify-center gap-2"
                   >
                     Intelligence Report <ChevronRight size={14} />
                   </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>

  );
};
