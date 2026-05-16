import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbProvider';
import { handleFirestoreError, OperationType } from '../lib/errorHandling';
import { Assignment, Submission, User } from '../types';
import { ArrowLeft, Award, BookOpen, Target, Activity, LayoutGrid, ChevronDown, ChevronUp, Clock, AlertTriangle, CheckCircle, Trophy } from 'lucide-react';
import { cn, getShortId } from '../lib/utils';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

import { ScoreChart } from '../components/ScoreChart';

const ScorecardAssessmentItem = ({ item }: { item: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isPastDue = item.status === 'missed';
  const isCompleted = item.status === 'completed';
  const isPending = item.status === 'pending';
  const isEvaluating = item.status === 'evaluating';

  return (
    <div className={cn(
      "p-6 flex flex-col gap-4 border-l-4 transition-all hover:bg-bg-main/50 cursor-pointer group",
      isCompleted ? "border-emerald-500" : isPastDue ? "border-rose-500" : isEvaluating ? "border-amber-500" : "border-blue-500"
    )}
    onClick={() => setIsExpanded(!isExpanded)}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
             {isCompleted && <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-md shadow-sm border border-emerald-500/20 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Completed</span>}
             {isPastDue && <span className="px-3 py-1 bg-rose-500/10 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-md shadow-sm border border-rose-500/20 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Missed (0 PTS)</span>}
             {isPending && <span className="px-3 py-1 bg-blue-500/10 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-md shadow-sm border border-blue-500/20 flex items-center gap-1"><Clock className="w-3 h-3"/> Active</span>}
             {isEvaluating && <span className="px-3 py-1 bg-amber-500/10 text-amber-600 text-[10px] font-black uppercase tracking-widest rounded-md shadow-sm border border-amber-500/20">Evaluating</span>}
          </div>
          <h4 className="text-lg md:text-xl font-bold text-text-primary mb-1 group-hover:text-brand-gold transition-colors">{item.assignment.title}</h4>
          <p className="text-xs text-text-secondary font-medium flex items-center gap-1">
             <Clock className="w-3.5 h-3.5" /> Due: {format(item.assignment.dueDate, 'MMM dd, yyyy h:mm a')}
          </p>
        </div>
        
        <div className="w-full md:w-auto shrink-0 flex items-center justify-between md:justify-end gap-3 sm:gap-4 mt-2 md:mt-0">
           {(isCompleted || isPastDue) ? (
              <div className="flex items-center justify-between w-full md:w-auto gap-3 sm:gap-4">
                 <div className="bg-bg-main px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-border-main shadow-inner flex-1 md:flex-none text-center md:text-right">
                   <span className="block text-xl sm:text-2xl font-black text-text-primary">
                      {item.score} <span className="text-text-secondary/60 text-base sm:text-lg">/ {item.maxPossible}</span>
                   </span>
                 </div>
                 {isExpanded ? <ChevronUp className="w-8 h-8 sm:w-10 sm:h-10 text-text-secondary flex items-center justify-center bg-bg-surface rounded-full shadow-sm border border-border-main/50" /> : <ChevronDown className="w-8 h-8 sm:w-10 sm:h-10 text-text-secondary flex items-center justify-center bg-bg-surface rounded-full shadow-sm border border-border-main/50" />}
              </div>
           ) : (
              <div className="flex items-center justify-between w-full md:w-auto gap-3 sm:gap-4">
                 <div className="bg-bg-main px-3 sm:px-4 py-2 rounded-xl border border-border-main shadow-inner text-text-secondary/80 text-xs sm:text-sm font-medium italic flex-1 md:flex-none text-center">
                    Not Graded Yet
                 </div>
                 {isExpanded ? <ChevronUp className="w-8 h-8 sm:w-10 sm:h-10 text-text-secondary flex items-center justify-center bg-bg-surface rounded-full shadow-sm border border-border-main/50" /> : <ChevronDown className="w-8 h-8 sm:w-10 sm:h-10 text-text-secondary flex items-center justify-center bg-bg-surface rounded-full shadow-sm border border-border-main/50" />}
              </div>
           )}
        </div>
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 border-t border-border-main/60 text-sm text-text-secondary space-y-4">
              {item.status === 'completed' && item.submission?.aiFeedback && (
                 <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-blue-400"></div>
                    <h5 className="font-bold text-blue-900 mb-2 uppercase tracking-widest text-[10px] flex items-center gap-1">
                      <Target className="w-3 h-3" /> Teacher Feedback
                    </h5>
                    <p className="leading-relaxed text-blue-900/80">{item.submission.aiFeedback.replace(/[\*\#]/g, '')}</p>
                 </div>
              )}
              
              {!item.submission && item.assignment.description && (
                 <div className="bg-bg-main p-5 rounded-2xl border border-border-main shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-text-secondary/20"></div>
                    <h5 className="font-bold text-text-secondary mb-2 uppercase tracking-widest text-[10px] flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> Mission Description
                    </h5>
                    <p className="leading-relaxed whitespace-pre-wrap">{item.assignment.description}</p>
                 </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const Scorecard = () => {
  const { studentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [targetStudent, setTargetStudent] = useState<User | null>(null);
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true); // default open

  const viewingUserId = studentId || user?.id;

  useEffect(() => {
    if (!viewingUserId) {
      // Don't set loading to false yet if we're waiting for user object to arrive, 
      // but if user is loaded and no viewingUserId, it's an error.
      return; 
    }

    if (!studentId && user?.role !== 'student') {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 10000); // 10s timeout
      });

      try {
        await Promise.race([
          (async () => {
            const studentData = await dbService.getUser(viewingUserId);
            setTargetStudent(studentData);

            if (!studentData) {
              setLoading(false);
              return;
            }

            const allAssignments = await dbService.getAllAssignments();
            
            const relevantAssignments = allAssignments.filter(a => {
               if (studentData.createdAt && a.dueDate < studentData.createdAt) return false;
               if (!a.allowedStudents || a.allowedStudents.length === 0) return true;
               return a.allowedStudents.includes(viewingUserId) || (studentData.email && a.allowedStudents.includes(studentData.email.toLowerCase()));
            });
            setAssignments(relevantAssignments);

            const studentSubmissions = await dbService.getSubmissionsByStudent(viewingUserId);
            setSubmissions(studentSubmissions);

            try {
              // Rank calculation might be slow, try to fetch but don't blow up scorecard if it fails
              const allStudents = await dbService.getUsersByRole('student');
              const sorted = allStudents.sort((a, b) => (b.lifetimeDiamonds || 0) - (a.lifetimeDiamonds || 0));
              const rank = sorted.findIndex(s => s.id === viewingUserId) + 1;
              setGlobalRank(rank > 0 ? rank : null);
            } catch (rankErr) {
              console.warn("Failed to calculate global rank:", rankErr);
            }
          })(),
          timeoutPromise
        ]);
        
      } catch (err: any) {
        if (err.message !== 'timeout') {
          handleFirestoreError(err, OperationType.GET, 'scorecard/data');
        } else {
          console.error("Scorecard fetch timed out");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [viewingUserId, user, studentId]);

  const stats = useMemo(() => {
    let totalScore = 0;
    let maxPossiblePoints = 0;
    let completedCount = 0;
    let missedCount = 0;
    let pendingCount = 0;

    const items = assignments.map(assignment => {
      const sub = submissions.find(s => s.assignmentId === assignment.id);
      const isPastDue = Date.now() > assignment.dueDate;
      
      let status: 'completed' | 'missed' | 'pending' | 'evaluating' = 'pending';
      let score = 0;

      if (sub) {
        if (sub.status === 'assessed') {
           status = 'completed';
           score = sub.aiScore;
           completedCount++;
           totalScore += score;
           maxPossiblePoints += 100;
        } else {
           status = 'evaluating';
        }
      } else {
        if (isPastDue) {
          status = 'missed';
          score = 0;
          missedCount++;
          totalScore += 0;
          maxPossiblePoints += 100;
        } else {
          status = 'pending';
          pendingCount++;
        }
      }

      return {
        assignment,
        submission: sub,
        status,
        score,
        maxPossible: 100
      };
    });

    items.sort((a, b) => b.assignment.dueDate - a.assignment.dueDate); // Sort descending

    const percentage = maxPossiblePoints > 0 ? Math.round((totalScore / maxPossiblePoints) * 100) : 0;
    
    let grade = 'N/A';
    if (maxPossiblePoints > 0) {
      if (percentage >= 95) grade = 'A+';
      else if (percentage >= 90) grade = 'A';
      else if (percentage >= 80) grade = 'B';
      else if (percentage >= 70) grade = 'C';
      else if (percentage >= 60) grade = 'D';
      else grade = 'F';
    }

    const subjects: Record<string, { total: number, max: number }> = {};
    items.forEach(item => {
      let subj = item.assignment.subject || 'General';
      if (!subjects[subj]) subjects[subj] = { total: 0, max: 0 };
      if (item.status === 'completed' || item.status === 'missed') {
         subjects[subj].total += item.score;
         subjects[subj].max += item.maxPossible;
      }
    });

    const radarData = Object.entries(subjects).map(([subject, counts]) => ({
      subject,
      score: counts.max > 0 ? Math.round((counts.total / counts.max) * 100) : 0,
      fullMark: 100
    }));

    return {
      items,
      totalScore,
      maxPossiblePoints,
      percentage,
      grade,
      completedCount,
      missedCount,
      pendingCount,
      radarData,
      totalCount: items.length
    };
  }, [assignments, submissions]);

  if (!studentId && user?.role !== 'student') {
    return (
      <div className="flex flex-col h-[80vh] items-center justify-center p-8 text-center space-y-4">
        <Target className="w-16 h-16 text-indigo-200" />
        <h2 className="text-2xl font-bold text-text-primary">Scorecard System</h2>
        <p className="text-text-secondary max-w-md">You are logged in as an admin. To view a student's scorecard, navigate to the Admin Panel and select a student.</p>
        <button onClick={() => navigate('/admin')} className="mt-4 bg-brand-gold hover:bg-brand-gold-hover text-bg-main px-6 py-3 rounded-xl font-bold transition shadow-lg">Go to Admin Panel</button>
      </div>
    );
  }

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
       <div className="flex flex-col items-center gap-4">
         <div className="w-12 h-12 border-4 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin"></div>
         <p className="text-text-secondary font-bold animate-pulse">Loading Scorecard...</p>
       </div>
    </div>
  );

  if (!targetStudent) return <div className="p-8 text-center text-text-secondary font-medium">Student not found.</div>;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto px-4 pb-8 space-y-6 md:space-y-8 pt-4 md:pt-0"
    >
      <button onClick={() => navigate(user?.role === 'student' ? '/profile' : '/admin')} className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition font-bold bg-bg-surface border border-border-main hover:bg-bg-main w-fit px-4 py-2.5 rounded-xl shadow-sm group">
         <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back
      </button>

      {/* Hero Header */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-bg-surface rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-border-main flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/5 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[60px] -ml-20 -mb-20 pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row items-center md:items-start gap-5 sm:gap-8 relative z-10 w-full">
           <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-gradient-to-br from-indigo-50 to-bg-main rounded-3xl md:rounded-[2.5rem] shrink-0 border-[4px] border-bg-surface shadow-xl flex items-center justify-center overflow-hidden">
             {targetStudent.avatar?.startsWith('http') || targetStudent.avatar?.startsWith('data:image') ? (
               <img src={targetStudent.avatar} alt="Avatar" className="w-full h-full object-cover" />
             ) : targetStudent.avatar ? (
                <span className="text-5xl md:text-6xl">{targetStudent.avatar}</span>
             ) : (
                <Award className="w-10 h-10 md:w-12 md:h-12 text-brand-gold" />
             )}
           </div>
           
          <div className="flex-1 mt-2 md:mt-4 text-center md:text-left">
            <div className="inline-block px-3 py-1.5 bg-border-main/50 text-text-secondary rounded-lg text-xs font-black uppercase tracking-widest mb-3 border border-border-main">Official Transcript</div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-text-primary mb-2 line-clamp-1">{targetStudent.name}</h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 sm:gap-3">
              <p className="text-xs sm:text-sm text-text-secondary font-medium bg-bg-main px-2.5 py-1 rounded-lg border border-border-main">ID: {getShortId(targetStudent.id)}</p>
              {globalRank && (
                <div className="flex items-center gap-1.5 bg-brand-gold/10 text-brand-gold px-2.5 py-1 rounded-lg border border-brand-gold/20 text-[10px] sm:text-xs font-black uppercase tracking-tighter">
                  <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Global Rank #{globalRank}
                </div>
              )}
            </div>
          </div>
          
          <div className="shrink-0 bg-gradient-to-br from-[#0A1128] to-indigo-950 text-bg-main p-5 sm:p-6 w-full sm:w-64 md:w-56 rounded-[2rem] shadow-xl border border-indigo-500/20 flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-brand-gold opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500"></div>
            <div className="text-indigo-200/80 text-[10px] uppercase font-extrabold tracking-widest mb-1 sm:mb-2 z-10 w-full text-center">Global Grade</div>
            <div className="text-5xl sm:text-6xl font-black mb-2 sm:mb-3 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/80 filter drop-shadow z-10">
              {stats.grade}
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 border border-white/10 z-10 flex items-center justify-center whitespace-nowrap w-full">
               <span className="font-bold text-xs sm:text-sm tracking-tight">{stats.percentage}%</span>
               <span className="text-indigo-200/80 text-[10px] sm:text-xs ml-1.5 uppercase font-semibold">Average</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
         <div className="bg-bg-surface p-4 sm:p-6 rounded-3xl sm:rounded-[2rem] border border-border-main shadow-sm flex flex-col items-center justify-center transition-all hover:shadow-md hover:border-brand-gold/30">
            <div className="w-10 h-10 bg-brand-gold/10 text-brand-gold rounded-full flex items-center justify-center mb-3">
               <Award className="w-5 h-5" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-text-primary mb-1 flex items-baseline gap-1">{stats.totalScore} <span className="text-xs sm:text-sm font-bold text-text-secondary/60">/ {stats.maxPossiblePoints}</span></div>
            <div className="text-text-secondary/80 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-center line-clamp-1">Total Points</div>
         </div>
         
         <div className="bg-bg-surface p-4 sm:p-6 rounded-3xl sm:rounded-[2rem] border border-border-main shadow-sm flex flex-col items-center justify-center transition-all hover:shadow-md hover:border-emerald-500/30">
            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-3">
               <CheckCircle className="w-5 h-5" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-text-primary mb-1 flex items-baseline gap-1">{stats.completedCount} <span className="text-xs sm:text-sm font-bold text-text-secondary/60">/ {stats.totalCount}</span></div>
            <div className="text-text-secondary/80 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-center line-clamp-1">Completed</div>
         </div>

         <div className="bg-bg-surface p-4 sm:p-6 rounded-3xl sm:rounded-[2rem] border border-border-main shadow-sm flex flex-col items-center justify-center transition-all hover:shadow-md hover:border-blue-500/30">
            <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mb-3">
               <Clock className="w-5 h-5" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-text-primary mb-1">{stats.pendingCount}</div>
            <div className="text-text-secondary/80 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-center line-clamp-1">Pending</div>
         </div>

         <div className="bg-bg-surface p-4 sm:p-6 rounded-3xl sm:rounded-[2rem] border border-border-main shadow-sm flex flex-col items-center justify-center transition-all hover:shadow-md hover:border-rose-500/30">
            <div className="w-10 h-10 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-3">
               <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-text-primary mb-1">{stats.missedCount}</div>
            <div className="text-text-secondary/80 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-center line-clamp-1">Missed</div>
         </div>
      </motion.div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-bg-surface rounded-[2rem] border border-border-main shadow-sm p-6 md:p-8 flex flex-col"
          >
            <h3 className="text-lg md:text-xl font-bold text-text-primary mb-6 flex items-center gap-3">
                <div className="p-2 bg-brand-gold/10 rounded-lg text-brand-gold"><Activity className="w-5 h-5" /></div>
                Performance Trend
            </h3>
            <div className="flex-1 min-h-[250px]">
               <ScoreChart userId={viewingUserId} />
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
            className="bg-bg-surface rounded-[2rem] border border-border-main shadow-sm p-6 md:p-8 flex flex-col"
          >
            <h3 className="text-lg md:text-xl font-bold text-text-primary mb-6 flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500"><LayoutGrid className="w-5 h-5" /></div>
                Subject Mastery
            </h3>
            <div className="h-64 sm:h-72 w-full flex items-center justify-center flex-1">
              {stats.radarData.length >= 3 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats.radarData}>
                    <PolarGrid stroke="var(--border-main)" strokeDasharray="3 3" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 13, fontWeight: 700 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Mastery" dataKey="score" stroke="var(--brand-gold)" strokeWidth={3} fill="var(--brand-gold)" fillOpacity={0.4} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center p-8 bg-bg-main border border-border-main border-dashed rounded-2xl max-w-[80%]">
                  <LayoutGrid className="w-8 h-8 text-text-secondary/50 mx-auto mb-3" />
                  <p className="text-text-secondary font-medium text-sm">Complete assignments in at least 3 distinct subjects to unlock the Mastery Radar Chart.</p>
                </div>
              )}
            </div>
          </motion.div>
      </div>

      {/* Assignments History */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-bg-surface rounded-[2rem] border border-border-main shadow-sm overflow-hidden"
      >
        <button 
          onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
          className="w-full p-6 md:p-8 border-b border-border-main flex items-center justify-between hover:bg-bg-main transition-colors focus:outline-none group"
        >
           <h3 className="text-lg md:text-xl font-bold text-text-primary flex items-center gap-3">
             <div className="p-2 bg-text-primary/5 rounded-lg text-text-primary"><BookOpen className="w-5 h-5" /></div>
             Detailed Assessment History
           </h3>
           <div className="w-10 h-10 rounded-full bg-bg-main border border-border-main flex items-center justify-center group-hover:border-text-secondary/30 transition-colors">
              <ChevronDown className={cn("w-5 h-5 text-text-secondary transition-transform duration-300", isHistoryExpanded ? "rotate-180" : "")} />
           </div>
        </button>
        <AnimatePresence initial={false}>
          {isHistoryExpanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="divide-y divide-border-main">
                {stats.items.length === 0 && (
                   <div className="p-12 pl-12 text-center text-text-secondary/80 flex flex-col items-center">
                      <BookOpen className="w-12 h-12 text-border-main mb-4" />
                      <p className="font-bold text-lg text-text-primary mb-1">No Missions Found</p>
                      <p className="text-sm">This student hasn't been assigned any missions yet.</p>
                   </div>
                )}
                {stats.items.map((item) => (
                   <ScorecardAssessmentItem key={item.assignment.id} item={item} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};
