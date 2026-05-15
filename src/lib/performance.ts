import { User } from '../types';

export const calculatePerformanceScore = (user: User | null): number => {
  if (!user) return 0;
  
  let score = 0;
  score += (user.coins || 0) * 1;
  score += (user.streak || 0) * 50;
  score += (user.achievements?.length || 0) * 200;
  score += (user.inventory?.length || 0) * 150;
  
  return score;
};

export const getPerformanceBadge = (score: number) => {
  if (score >= 50000) return { title: 'Legend', color: 'bg-gradient-to-r from-red-500 to-rose-600', textColor: 'text-rose-600', shadow: 'shadow-rose-500/30' };
  if (score >= 20000) return { title: 'Grandmaster', color: 'bg-gradient-to-r from-purple-500 to-fuchsia-600', textColor: 'text-fuchsia-600', shadow: 'shadow-fuchsia-500/30' };
  if (score >= 10000) return { title: 'Master', color: 'bg-gradient-to-r from-indigo-500 to-blue-600', textColor: 'text-brand-gold', shadow: 'shadow-indigo-500/30' };
  if (score >= 5000) return { title: 'Hero', color: 'bg-gradient-to-r from-emerald-400 to-teal-500', textColor: 'text-teal-600', shadow: 'shadow-teal-500/30' };
  if (score >= 2000) return { title: 'Challenger', color: 'bg-gradient-to-r from-amber-400 to-orange-500', textColor: 'text-orange-600', shadow: 'shadow-orange-500/30' };
  if (score >= 500) return { title: 'Explorer', color: 'bg-gradient-to-r from-cyan-400 to-blue-500', textColor: 'text-blue-500', shadow: 'shadow-blue-500/30' };
  return { title: 'Novice', color: 'bg-gradient-to-r from-gray-400 to-slate-500', textColor: 'text-slate-600', shadow: 'shadow-slate-500/30' };
};
