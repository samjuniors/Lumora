export const GRADE_REWARDS = {
    'A+': { min: 95, label: 'Exceptional', multiplier: 1.2, color: 'text-brand-gold', bg: 'bg-brand-gold/10 border-brand-gold/20' },
    'A': { min: 90, label: 'Excellent', multiplier: 1.0, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    'B+': { min: 85, label: 'Great', multiplier: 0.9, color: 'text-cyan-500', bg: 'bg-cyan-500/10 border-cyan-500/20' },
    'B': { min: 80, label: 'Good', multiplier: 0.8, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
    'C': { min: 70, label: 'Average', multiplier: 0.5, color: 'text-brand-gold', bg: 'bg-brand-gold/10 border-brand-gold/20' },
    'D': { min: 60, label: 'Marginal', multiplier: 0, color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' },
    'F': { min: 0, label: 'Fail', multiplier: 0, color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20' }
};

export type LetterGrade = keyof typeof GRADE_REWARDS;
