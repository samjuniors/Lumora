import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService, assignmentService } from '../services/dbProvider';
import { Assignment, Enrollment, User } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Target, 
  Award, 
  TrendingUp, 
  Search, 
  ChevronRight, 
  User as UserIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  BarChart3,
  Bot,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ListSkeleton } from '../components/Skeletons';
import { Card, SectionHeader, Button, Badge } from '../components/CommonUI';
import { handleFirestoreError, OperationType } from '../lib/errorHandling';

interface StudentStats {
  student: User;
  totalMissions: number;
  completedMissions: number;
  averageGrade: number;
  totalPoints: number;
  lastActive: number;
  submissions: Enrollment[];
}

import AdminActionModal from '../components/admin/AdminActionModal';

export const AdminAnalytics = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentStats | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showGrantModal, setShowGrantModal] = useState<{ user: User, type: 'coins' | 'penalty' | 'diamonds' | 'gift' } | null>(null);

  const analyzePerformance = async (studentStats: any) => {
    setAnalyzing(true);
    try {
      const { analyzeStudentPerformance } = await import('../services/aiService');
      const analysis = await analyzeStudentPerformance(studentStats);
      setAiAnalysis(analysis);
    } catch (err) {
      console.error("Failed to fetch AI analysis", err);
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [studentsList, assignmentsList, enrollmentsList] = await Promise.all([
        userService.getUsersByRole('student'),
        assignmentService.getAllAssignments(),
        assignmentService.getAllEnrollments()
      ]);

      setStudents(studentsList);
      setAssignments(assignmentsList);
      setEnrollments(enrollmentsList);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.LIST, 'admin/analytics');
    } finally {
      setLoading(false);
    }
  };

  const studentStats = useMemo(() => {
    return students.map(student => {
      const studentSubmissions = enrollments.filter(e => e.studentId === student.id);
      const gradedSubmissions = studentSubmissions.filter(e => e.status === 'graded' && e.grade !== undefined);
      
      const totalMissions = assignments.length;
      const completedMissions = studentSubmissions.filter(e => e.status === 'submitted' || e.status === 'graded').length;
      const averageGrade = gradedSubmissions.length > 0 
        ? gradedSubmissions.reduce((acc, curr) => acc + (curr.grade || 0), 0) / gradedSubmissions.length
        : 0;
      
      const totalPoints = studentSubmissions.reduce((acc, curr) => {
        if (curr.rewardEarned !== undefined) return acc + curr.rewardEarned;
        
        // Fallback for graded missions where rewardEarned was not set
        if (curr.status === 'graded' && curr.grade !== undefined) {
          const assignment = assignments.find(a => a.id === curr.assignmentId);
          if (assignment) {
            // Find grade multiplier
            let multiplier = 0;
            if (curr.grade >= 95) multiplier = 1.2;
            else if (curr.grade >= 90) multiplier = 1.0;
            else if (curr.grade >= 85) multiplier = 0.9;
            else if (curr.grade >= 80) multiplier = 0.8;
            else if (curr.grade >= 70) multiplier = 0.5;
            
            if (multiplier > 0) {
              return acc + Math.floor(assignment.bonusReward * multiplier);
            }
          }
        }

        // Fallback for missed missions where rewardEarned was not set
        if (curr.status === 'missed') {
          const assignment = assignments.find(a => a.id === curr.assignmentId);
          if (assignment && assignment.penaltyFee) {
            return acc - assignment.penaltyFee;
          }
        }

        return acc + (curr.rewardEarned || 0);
      }, 0);
      const lastSubmission = studentSubmissions.sort((a, b) => b.updatedAt - a.updatedAt)[0];

      return {
        student,
        totalMissions,
        completedMissions,
        averageGrade,
        totalPoints,
        lastActive: lastSubmission?.updatedAt || 0,
        submissions: studentSubmissions
      };
    }).sort((a, b) => {
      // 1. Primary: Total Points earned from missions
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      
      // 2. Secondary: Average Grade
      if (b.averageGrade !== a.averageGrade) {
        return b.averageGrade - a.averageGrade;
      }
      
      // 3. Tertiary: Completed Missions count
      if (b.completedMissions !== a.completedMissions) {
        return b.completedMissions - a.completedMissions;
      }
      
      // 4. Quaternary: Current Coin balance (from user profile)
      if (b.student.coins !== a.student.coins) {
        return b.student.coins - a.student.coins;
      }

      // 5. Pentenary: Last Active timestamp
      return b.lastActive - a.lastActive;
    });
  }, [students, assignments, enrollments]);

  const filteredStats = studentStats.filter(s => 
    s.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statsOverview = useMemo(() => {
    const totalStudents = students.length;
    const avgCompletion = studentStats.reduce((acc, s) => acc + (s.completedMissions / (s.totalMissions || 1)), 0) / (totalStudents || 1);
    const avgGrade = studentStats.reduce((acc, s) => acc + s.averageGrade, 0) / (totalStudents || 1);

    return [
      { label: 'Total Students', value: totalStudents, icon: Users, color: 'text-brand-gold', bg: 'bg-brand-gold/10' },
      { label: 'Avg. Completion', value: `${Math.round(avgCompletion * 100)}%`, icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
      { label: 'Avg. Performance', value: `${Math.round(avgGrade)}%`, icon: Award, color: 'text-amber-500', bg: 'bg-amber-500/10' },
      { label: 'Total Points Awarded', value: studentStats.reduce((acc, s) => acc + s.totalPoints, 0), icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-500/10' }
    ];
  }, [studentStats]);

  if (loading) return <div className="max-w-6xl mx-auto p-6"><ListSkeleton /></div>;

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key="admin-analytics"
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.3 }}
        className="space-y-8"
      >
        {/* Header */}
        <SectionHeader 
          title="Performance Analytics"
          subtitle="Monitor student progress, grades, and engagement across all missions."
          icon={BarChart3}
          className="bg-transparent"
          action={
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary w-5 h-5" />
              <input
                type="text"
                placeholder="Search student..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-bg-surface rounded-2xl border border-border-main focus:ring-2 focus:ring-brand-gold/20 focus:outline-none shadow-sm transition-all text-sm font-medium"
              />
            </div>
          }
        />

      {/* AI Insights Card */}
      <Card variant="glass" className="p-8 text-bg-main shadow-xl border-white/5 bg-navy-900/40">
        <div className="flex items-center justify-between mb-6">
           <h3 className="text-xl font-black flex items-center gap-2">
             <Bot className="w-6 h-6 text-brand-gold" />
             AI Performance Insights
           </h3>
           <Button 
             variant="gold"
             onClick={() => analyzePerformance(studentStats)}
             disabled={analyzing}
             isLoading={analyzing}
           >
             Generate Insights
           </Button>
        </div>
        
        {aiAnalysis ? (
          <div className="bg-bg-main/10 backdrop-blur-md p-6 rounded-2xl text-indigo-100 font-medium leading-relaxed border border-white/5 whitespace-pre-wrap">
            {aiAnalysis}
          </div>
        ) : (
          <div className="text-indigo-300/60 font-medium px-2">Click "Generate Insights" to let Gemini analyze student performance data.</div>
        )}
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsOverview.map((stat, idx) => (
          <Card
            key={idx}
            className="p-6 flex items-center gap-4"
            hover
          >
            <div className={cn("p-4 rounded-2xl", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest leading-none mb-1">{stat.label}</p>
              <p className="text-2xl font-black text-text-primary tracking-tight">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Detailed Leaderboard Table */}
      <Card className="overflow-hidden border-border-main/50">
        <div className="p-6 md:p-8 border-b border-border-main bg-bg-main/30 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-gold" />
            Detailed Ranking
          </h2>
          <Badge variant="outline">
            {filteredStats.length} Students
          </Badge>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-bg-main">
                <th className="px-2 py-3 text-[10px] font-black text-text-secondary uppercase tracking-widest text-center">Rank</th>
                <th className="px-2 py-3 text-[10px] font-black text-text-secondary uppercase tracking-widest">Student</th>
                <th className="px-2 py-3 text-[10px] font-black text-text-secondary uppercase tracking-widest text-center">Progress</th>
                <th className="px-2 py-3 text-[10px] font-black text-text-secondary uppercase tracking-widest text-center">Avg Grade</th>
                <th className="px-2 py-3 text-[10px] font-black text-text-secondary uppercase tracking-widest text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main">
              {filteredStats.map((stat, idx) => (
                <tr key={stat.student.id} className="hover:bg-brand-gold/5 transition-colors group">
                  <td className="px-2 py-2">
                    <span className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black mx-auto",
                      idx === 0 ? "bg-amber-500/20 text-amber-500" :
                      idx === 1 ? "bg-slate-500/20 text-slate-400" :
                      idx === 2 ? "bg-orange-500/20 text-orange-500" :
                      "bg-bg-main text-text-secondary"
                    )}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <button 
                      onClick={() => setSelectedStudent(stat)}
                      className="flex items-center gap-2 text-left w-full group"
                    >
                      <div className="w-8 h-8 rounded-full bg-brand-gold-secondary-hover flex items-center justify-center border border-bg-surface shadow-sm overflow-hidden shrink-0">
                        {stat.student.avatar ? (
                          (stat.student.avatar.startsWith('http') || stat.student.avatar.startsWith('data:')) ? (
                            <img src={stat.student.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm">{stat.student.avatar}</span>
                          )
                        ) : (
                          <UserIcon className="w-4 h-4 text-brand-gold" />
                        )}
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-text-primary group-hover:text-brand-gold transition-colors text-sm">{stat.student.name}</p>
                        <p className="text-[10px] text-text-secondary truncate">{stat.student.email}</p>
                      </div>
                    </button>
                  </td>
                  <td className="px-2 py-2 text-center text-xs font-bold text-text-secondary">
                    {Math.round((stat.completedMissions / (stat.totalMissions || 1)) * 100)}%
                  </td>
                  <td className="px-2 py-2 text-center text-xs font-bold text-text-secondary">
                     {Math.round(stat.averageGrade)}%
                  </td>
                  <td className="px-2 py-2 text-right text-xs font-black text-brand-gold">
                    {stat.totalPoints.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Student Details Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <motion.div 
            key="student-details-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-text-primary/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-bg-surface w-full max-w-4xl max-h-[90vh] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col border border-border-main"
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-border-main bg-brand-gold text-bg-main relative">
                 <button 
                  onClick={() => setSelectedStudent(null)}
                  className="absolute top-8 right-8 p-2 hover:bg-bg-surface/20 rounded-full transition-colors"
                 >
                   <X className="w-6 h-6" />
                 </button>
                 <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-3xl bg-bg-surface/20 backdrop-blur-md flex items-center justify-center border-2 border-white/50 overflow-hidden shadow-lg">
                       {selectedStudent.student.avatar ? (
                          (selectedStudent.student.avatar.startsWith('http') || selectedStudent.student.avatar.startsWith('data:image')) ? (
                            <img src={selectedStudent.student.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-4xl">{selectedStudent.student.avatar}</span>
                          )
                        ) : (
                          <UserIcon className="w-12 h-12 text-bg-main" />
                        )}
                    </div>
                    <div>
                      <h2 className="text-3xl font-black">{selectedStudent.student.name}</h2>
                      <p className="text-bg-main/80 font-medium">{selectedStudent.student.email}</p>
                      <div className="mt-3 flex items-center gap-3">
                         <span className="bg-bg-surface/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">{selectedStudent.student.role}</span>
                         <span className="flex items-center gap-1 text-xs font-bold"><Clock size={14}/> Last active: {selectedStudent.lastActive ? new Date(selectedStudent.lastActive).toLocaleDateString() : 'Never'}</span>
                      </div>
                    </div>
                 </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                {/* Stats Summary - Compacted */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-brand-gold/10 p-4 rounded-2xl text-center border border-brand-gold/10">
                    <p className="text-[9px] font-black text-brand-gold uppercase tracking-widest mb-0.5">Points</p>
                    <p className="text-xl font-black text-brand-gold">{selectedStudent.totalPoints}</p>
                  </div>
                  <div className="bg-emerald-500/10 p-4 rounded-2xl text-center border border-emerald-500/10">
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">Grade</p>
                    <p className="text-xl font-black text-emerald-500">{Math.round(selectedStudent.averageGrade)}%</p>
                  </div>
                  <div className="bg-amber-500/10 p-4 rounded-2xl text-center border border-amber-500/10">
                    <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-0.5">Missions</p>
                    <p className="text-xl font-black text-amber-500">{selectedStudent.completedMissions}</p>
                  </div>
                  <div className="bg-bg-main p-4 rounded-2xl text-center border border-border-main">
                     <p className="text-[9px] font-black text-text-secondary uppercase tracking-widest mb-0.5">Last Active</p>
                     <p className="text-xs font-bold text-text-primary mt-1">{selectedStudent.lastActive ? new Date(selectedStudent.lastActive).toLocaleDateString() : 'Never'}</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowGrantModal({ user: selectedStudent.student, type: 'coins' })}
                    className="flex-1 bg-brand-gold text-bg-main py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm hover:bg-brand-gold-hover transition-colors"
                  >
                    Adjust Balance
                  </button>
                  <button className="flex-1 bg-bg-main text-text-primary py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm hover:bg-border-main transition-colors border border-border-main">
                    Message
                  </button>
                </div>

                {/* Submissions List */}
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-text-primary tracking-tight">Mission History</h3>
                  <div className="space-y-2">
                    {selectedStudent.submissions.length > 0 ? (
                      selectedStudent.submissions.map(sub => {
                        const mission = assignments.find(a => a.id === sub.assignmentId);
                        return (
                          <div key={sub.id} className="flex items-center justify-between p-3 bg-bg-main rounded-xl border border-border-main text-sm">
                             <div className="flex items-center gap-3">
                               <div className={cn(
                                 "w-8 h-8 rounded-lg flex items-center justify-center",
                                 sub.status === 'graded' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                               )}>
                                 {sub.status === 'graded' ? <CheckCircle2 size={16}/> : <Clock size={16}/>}
                               </div>
                               <div>
                                 <p className="font-bold text-text-primary text-xs">{mission?.title || 'Unknown Mission'}</p>
                                 <p className="text-[10px] text-text-secondary">{new Date(sub.updatedAt).toLocaleDateString()}</p>
                               </div>
                             </div>
                             <div className="text-right">
                               <p className="font-black text-brand-gold text-xs">{sub.rewardEarned || 0} pts</p>
                               {sub.grade !== undefined && (
                                 <p className="text-[10px] font-black text-emerald-500">{sub.grade}%</p>
                               )}
                             </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-text-secondary bg-bg-main rounded-xl border border-dashed border-border-main text-xs">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No missions started yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </motion.div>
      {showGrantModal && (
          <AdminActionModal 
              type={showGrantModal.type}
              u={showGrantModal.user}
              onClose={() => setShowGrantModal(null)}
              onComplete={fetchData}
          />
      )}
    </AnimatePresence>
  );
};
