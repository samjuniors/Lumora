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
          <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-500" />
            Completed Missions
          </h2>
          <p className="text-text-secondary text-sm mt-1 font-medium">Your recently assessed submissions</p>
        </div>
        {isOpen && (
           <button 
             onClick={() => setIsOpen(false)}
             className="text-sm font-bold text-text-secondary hover:text-text-primary transition flex items-center gap-1"
           >
             Close Stack <X className="w-4 h-4" />
           </button>
        )}
      </div>

      <AnimatePresence>
        {!isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative h-48 cursor-pointer group w-full max-w-sm mx-auto md:max-w-none md:mx-0"
            onClick={() => setIsOpen(true)}
          >
            {missions.map((mission, index) => {
              const reverseIndex = missions.length - 1 - index;
              return (
                <motion.div
                  key={mission.submission.id}
                  className="absolute inset-0 bg-success-green/10 border border-success-green/30 shadow-lg rounded-3xl p-6 transition-colors group-hover:bg-success-green/20 flex flex-col"
                  style={{
                    transformOrigin: 'bottom center',
                    zIndex: missions.length - index
                  }}
                  animate={{
                    y: index * -12,
                    scale: 1 - (index * 0.05),
                    opacity: 1 - (index * 0.2),
                  }}
                  whileHover={{
                    y: index * -15 - 5,
                    rotate: index % 2 === 0 ? 2 : -2,
                    scale: 1 - (index * 0.05) + 0.02
                  }}
                >
                   <div className="flex justify-between items-start mb-4">
                     <div>
                       <span className="text-[11px] font-bold text-success-green uppercase tracking-widest mb-1.5 block">
                          Mission Complete
                       </span>
                       <h3 className="font-bold text-[19px] tracking-tight text-text-primary truncate pr-4">{mission.assignment.title}</h3>
                     </div>
                     <div className="bg-success-green/10 text-success-green px-3 py-1 rounded-xl text-lg font-black shrink-0 border border-success-green/20 shadow-sm">
                        {mission.submission.aiScore}%
                     </div>
                  </div>
                  <div className="mt-auto">
                    <div className="text-[13px] text-text-secondary font-medium tracking-tight flex flex-col items-center gap-1">
                       Tap to unveil {missions.length} achievements
                       <motion.div 
                         animate={{ y: [0, 4, 0] }} 
                         transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                       >
                         <ChevronDown className="w-4 h-4 text-text-secondary/80" />
                       </motion.div>
                    </div>
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
                transition: { staggerChildren: 0.08 }
              }
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {missions.map((mission, index) => (
              <motion.div
                key={mission.submission.id}
                variants={{
                  hidden: { opacity: 0, scale: 0.9, filter: 'blur(10px)' },
                  show: {
                    opacity: 1, scale: 1, filter: 'blur(0px)',
                    transition: { type: 'spring', stiffness: 350, damping: 28 }
                  }
                }}
                className="bg-success-green/10 border border-emerald-300 ring-1 ring-emerald-400 shadow-sm rounded-[24px] p-5 flex flex-col group hover:shadow-[0_8px_24px_-8px_rgba(34,197,94,0.15)] transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-success-green/20 to-transparent -z-10 rounded-bl-full opacity-60"></div>
                <div className="flex justify-between items-start mb-4 gap-4">
                   <div className="min-w-0">
                      <h3 className="font-bold text-text-primary text-[18px] tracking-tight truncate" title={mission.assignment.title}>
                        {mission.assignment.title}
                      </h3>
                      <p className="text-[13px] text-text-secondary mt-0.5 truncate">
                        {new Date(mission.submission.submittedAt).toLocaleDateString()}
                      </p>
                   </div>
                   <div className="flex flex-col items-end shrink-0">
                      <div className={cn(
                        "text-xl font-black rounded-2xl px-4 py-2 border shadow-sm flex items-center gap-1.5 backdrop-blur-md",
                        mission.submission.aiScore >= 80 ? "bg-success-green/10 text-success-green border-success-green/30" :
                        mission.submission.aiScore >= 50 ? "bg-amber-500/10 text-amber-500 border-amber-500/30" :
                        "bg-rose-500/10 text-rose-500 border-rose-500/50"
                      )}>
                         {mission.submission.aiScore >= 80 && <Trophy className="w-4 h-4 fill-current"/>}
                         {mission.submission.aiScore}%
                      </div>
                   </div>
                </div>
                
                <div className="mt-2 mb-5">
                  <div className="text-[12px] font-bold text-text-secondary/80 uppercase tracking-widest mb-1.5">AI Feedback</div>
                  <div className="text-[14px] text-text-secondary line-clamp-3 bg-bg-surface border border-border-main p-3.5 rounded-2xl leading-relaxed">
                     {mission.submission.aiFeedback.replace(/[\*\#]/g, '')}
                  </div>
                </div>

                <div className="mt-auto">
                   <Link 
                      to={`/assignments/${mission.assignment.id}`} 
                      className="w-full py-3 bg-bg-main text-text-primary hover:bg-bg-surface border border-border-main font-bold rounded-[14px] transition-colors duration-300 flex items-center justify-center gap-2 shadow-sm"
                   >
                     View Result <ChevronRight className="w-4 h-4" />
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
