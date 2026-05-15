import React, { useEffect, useState } from 'react';
import { dbService } from '../services/dbProvider';
import { handleFirestoreError, OperationType } from '../lib/errorHandling';
import { useAuth } from '../context/AuthContext';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Activity } from 'lucide-react';
import { Submission, Assignment } from '../types';

interface ScoreChartProps {
  userId?: string;
}

export const ScoreChart = ({ userId }: ScoreChartProps) => {
  const { user } = useAuth();
  const targetId = userId || user?.id;
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!targetId) return;
    const fetchScores = async () => {
      try {
        const allStudentSubmissions = await dbService.getSubmissionsByStudent(targetId);
        
        const subs = allStudentSubmissions
          .filter(s => s.status === 'assessed')
          .sort((a, b) => a.submittedAt - b.submittedAt)
          .slice(-10);
        
        const chartData = [];
        for (const s of subs) {
           const assignment = await dbService.getAssignment(s.assignmentId);
           const assignmentTitle = assignment?.title || 'Task';
           chartData.push({
             name: assignmentTitle.length > 15 ? assignmentTitle.substring(0, 15) + '...' : assignmentTitle,
             score: s.aiScore,
           });
        }
        setData(chartData);
      } catch (err: any) {
        handleFirestoreError(err, OperationType.GET, 'score-chart/data');
      } finally {
        setLoading(false);
      }
    };
    fetchScores();
  }, [targetId]);

  if (loading) {
    return <div className="h-48 flex items-center justify-center text-text-secondary/80 font-medium">Loading history...</div>;
  }

  if (data.length === 0) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-text-secondary/80">
        <Activity className="w-10 h-10 mb-2 opacity-30" />
        <p className="font-medium text-sm">No graded missions yet.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-64 mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
             dataKey="name" 
             axisLine={false} 
             tickLine={false} 
             tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} 
             dy={10}
          />
          <YAxis 
             axisLine={false} 
             tickLine={false} 
             tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} 
             domain={[0, 100]}
          />
          <Tooltip 
             contentStyle={{ 
               borderRadius: '1rem', 
               backgroundColor: 'var(--bg-surface)', 
               borderColor: 'var(--border-main)',
               boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' 
             }}
             labelStyle={{ fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.25rem' }}
             itemStyle={{ color: 'var(--brand-gold)', fontWeight: 'bold' }}
          />
          <Area 
             type="monotone" 
             dataKey="score" 
             stroke="#6366f1" 
             strokeWidth={3} 
             fillOpacity={1} 
             fill="url(#colorScore)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
