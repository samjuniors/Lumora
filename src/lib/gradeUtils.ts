export function getLetterGrade(score: number): { letter: string; color: string } {
  if (score >= 90) return { letter: 'A+', color: 'text-violet-600 bg-violet-50 border-violet-200 ring-violet-500/20 shadow-violet-500/10' };
  if (score >= 80) return { letter: 'A', color: 'text-emerald-600 bg-success-green/10 border-success-green/30 ring-emerald-500/20 shadow-emerald-500/10' };
  if (score >= 70) return { letter: 'B+', color: 'text-blue-600 bg-blue-50 border-blue-200 ring-blue-500/20 shadow-blue-500/10' };
  if (score >= 60) return { letter: 'B', color: 'text-cyan-600 bg-cyan-50 border-cyan-200 ring-cyan-500/20 shadow-cyan-500/10' };
  if (score >= 50) return { letter: 'C+', color: 'text-yellow-600 bg-yellow-50 border-yellow-200 ring-yellow-500/20 shadow-yellow-500/10' };
  if (score >= 40) return { letter: 'C', color: 'text-brand-gold bg-brand-gold/10 border-brand-gold/30 ring-amber-500/20 shadow-amber-500/10' };
  if (score >= 35) return { letter: 'D', color: 'text-orange-600 bg-orange-50 border-orange-200 ring-orange-500/20 shadow-orange-500/10' };
  return { letter: 'F', color: 'text-text-secondary bg-bg-main border-border-main ring-gray-400/20 shadow-gray-500/10' };
}
