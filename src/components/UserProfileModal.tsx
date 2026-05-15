import React, { useState } from 'react';
import { User } from '../types';
import { X, Trophy, Medal, Star, Target, Gift, ScrollText, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getUserLevelAndXP, cn, getVIPLevel } from '../lib/utils';
import { calculatePerformanceScore, getPerformanceBadge } from '../lib/performance';
import { Link } from 'react-router-dom';
import { SendCoinsModal } from './SendCoinsModal';
import { INFINITE_ACHIEVEMENTS } from './Achievements';
import { getLetterGrade } from '../lib/gradeUtils';
import { BADGES } from '../lib/badges';

export const UserProfileModal = ({ 
  user, 
  onClose,
}: { 
  user: User & { averageGrade?: number, gradedCount?: number }; 
  onClose: () => void;
}) => {
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements'>('overview');
  const { currentLevel } = getUserLevelAndXP(user);
  const perfScore = calculatePerformanceScore(user);
  const badge = getPerformanceBadge(perfScore);

  const earnedAchievements = INFINITE_ACHIEVEMENTS.map(def => {
    const claimedTiers = (user.achievements || [])
       .filter(a => a.startsWith(def.id + '_tier_'))
       .map(a => parseInt(a.replace(def.id + '_tier_', '')))
       .filter(n => !isNaN(n));
       
    if (claimedTiers.length === 0) return null;
    const highestTier = Math.max(...claimedTiers);
    return {
      def,
      tier: highestTier
    };
  }).filter((a): a is { def: typeof INFINITE_ACHIEVEMENTS[0], tier: number } => a !== null);

  const standardEarnedBadges = BADGES.filter(b => (user.achievements || []).includes(b.id));

  const letterGrade = getLetterGrade(user.averageGrade ?? 0);

  return (
    <>
      <div className="fixed inset-0 bg-text-primary/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-bg-surface rounded-[2.5rem] w-full max-w-sm p-6 overflow-y-auto max-h-[85vh] shadow-2xl relative border border-border-main no-scrollbar"
        >
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 text-text-secondary/80 hover:bg-border-main hover:text-text-primary rounded-full transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-[2rem] bg-brand-gold-secondary-hover border-4 border-white shadow-xl flex items-center justify-center text-4xl mb-4 relative overflow-hidden">
              {(user.avatar?.startsWith('http') || user.avatar?.startsWith('data:')) ? (
                 <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                 <span>{user.avatar || '👤'}</span>
              )}
            </div>
            
            <h2 className="text-2xl font-black text-text-primary mb-1">{user.name}</h2>
            <div className="flex items-center flex-wrap justify-center gap-2 mb-6">
              {user.role === 'superadmin' ? (
                  <span className="text-xs uppercase tracking-wider font-extrabold px-2 py-1 rounded-lg text-bg-main bg-gradient-to-r from-rose-500 to-orange-500 shadow-sm border border-rose-400">
                      Super Admin
                  </span>
              ) : user.role === 'admin' ? (
                  <span className="text-xs uppercase tracking-wider font-extrabold px-2 py-1 rounded-lg text-bg-main bg-gradient-to-r from-blue-500 to-indigo-500 shadow-sm border border-blue-400">
                      Admin
                  </span>
              ) : null}
              <span className="text-xs uppercase tracking-wider font-extrabold px-2 py-1 rounded-lg bg-brand-gold-secondary-hover text-indigo-700">
                Level {currentLevel}
              </span>
              <span className={cn(
                "text-xs uppercase tracking-wider font-extrabold px-2 py-1 rounded-lg shadow-sm border border-black/5",
                badge.color,
                (calculatePerformanceScore(user) >= 2000 && calculatePerformanceScore(user) < 5000) ? "text-[#0A1128]" : "text-bg-main"
              )}>
                {badge.title}
              </span>
            </div>

            <div className="flex w-full bg-border-main/80 p-1 rounded-2xl mb-6">
              <button 
                onClick={() => setActiveTab('overview')}
                className={cn("flex-1 py-2.5 rounded-xl text-sm font-bold transition-all", activeTab === 'overview' ? "bg-bg-surface shadow-sm text-text-primary" : "text-text-secondary hover:text-text-primary")}
              >
                 Overview
              </button>
              <button 
                onClick={() => setActiveTab('achievements')}
                className={cn("flex-1 py-2.5 rounded-xl text-sm font-bold transition-all", activeTab === 'achievements' ? "bg-bg-surface shadow-sm text-text-primary" : "text-text-secondary hover:text-text-primary")}
              >
                 Achievements
              </button>
            </div>

            {activeTab === 'overview' ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full flex flex-col items-center"
              >
                <div className="w-full grid grid-cols-3 gap-3 mb-6 mt-4">
                  <div className="bg-bg-main rounded-2xl p-4 flex flex-col items-center border border-border-main">
                    <Trophy className="w-6 h-6 text-yellow-500 mb-2" />
                    <span className="text-sm text-text-secondary font-semibold mb-1">Coins</span>
                    <span className="text-xl font-black text-text-primary">{user.coins}</span>
                  </div>
                  <div className="bg-bg-main rounded-2xl p-4 flex flex-col items-center border border-border-main">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 text-cyan-400 mb-2" fill="currentColor">
                      <path d="M12 2L2 12l10 10 10-10L12 2zm0 17.5L5.5 12 12 5.5l6.5 6.5L12 19.5z" />
                    </svg>
                    <span className="text-sm text-text-secondary font-semibold mb-1">Diamonds</span>
                    <span className="text-xl font-black text-text-primary">{user.diamonds || 0}</span>
                  </div>
                  <div className="bg-bg-main rounded-2xl p-4 flex flex-col items-center border border-border-main">
                    <Target className="w-6 h-6 text-brand-gold mb-2" />
                    <span className="text-sm text-text-secondary font-semibold mb-1">Avg Grade</span>
                    <span className="text-xl font-black text-text-primary flex items-center gap-1.5 px-2 py-0.5 rounded-lg">
                      <span className={cn("text-sm px-1.5 py-0.5 rounded-md border ring-1 font-black", letterGrade.color)}>{letterGrade.letter}</span>
                      {user.averageGrade ?? 0}%
                    </span>
                  </div>
                </div>

                <div className="w-full space-y-3">
                  <Link 
                    to={`/scorecard/${user.id}`}
                    onClick={onClose}
                    className="w-full bg-brand-gold-secondary-hover text-indigo-700 hover:bg-brand-gold-secondary-hover font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    View Full Scorecard
                  </Link>
                  <button 
                    onClick={() => setShowGiftModal(true)}
                    className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-bg-main hover:from-yellow-500 hover:to-amber-600 font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-yellow-500/25 flex items-center justify-center gap-2"
                  >
                    <Gift className="w-5 h-5" /> Gift Coins
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full flex flex-col items-center max-h-[400px] overflow-y-auto pr-2"
                style={{ scrollbarWidth: 'thin' }}
              >
                <div className="w-full space-y-3">
                  {earnedAchievements.length === 0 && standardEarnedBadges.length === 0 ? (
                    <div className="bg-bg-main border border-border-main rounded-2xl p-8 text-center flex flex-col items-center w-full">
                       <span className="text-4xl mb-3 grayscale opacity-40">🏆</span>
                       <h3 className="font-bold text-text-primary mb-1 text-sm tracking-tight text-center">No Achievements Yet</h3>
                       <p className="text-xs text-text-secondary font-medium">Keep completing missions to unlock badges!</p>
                    </div>
                  ) : (
                    <>
                      {earnedAchievements.map(({ def, tier }) => (
                        <div key={def.id} className="bg-bg-surface border border-border-main p-3 rounded-2xl flex flex-col items-start gap-2 shadow-sm w-full relative overflow-hidden group">
                           <div className="absolute inset-0 bg-brand-gold-secondary-hover/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                           <div className="flex items-center gap-4 w-full relative z-10">
                             <div className="w-14 h-14 bg-bg-main rounded-xl flex items-center justify-center shrink-0 border border-border-main/50 shadow-inner relative">
                               <div className="absolute -bottom-1.5 -right-1.5 bg-brand-gold-secondary-hover text-indigo-700 text-[9px] font-black w-6 h-6 flex items-center justify-center rounded-lg border border-white shadow-sm ring-1 ring-indigo-200">
                                 L{tier}
                               </div>
                               <div className="scale-75 origin-center">{def.icon}</div>
                             </div>
                             <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm text-text-primary leading-tight mb-0.5 truncate">{def.title}</h4>
                                <p className="text-[11px] font-medium text-text-secondary line-clamp-2 leading-snug">{def.getDescription(tier, def.getGoal(tier))}</p>
                             </div>
                           </div>
                        </div>
                      ))}
                      {standardEarnedBadges.map((def) => (
                        <div key={def.id} className="bg-bg-surface border border-border-main p-3 rounded-2xl flex flex-col items-start gap-2 shadow-sm w-full relative overflow-hidden group">
                           <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-current" style={{ color: def.color.replace('bg-', '') }}></div>
                           <div className="flex items-center gap-4 w-full relative z-10">
                             <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-inner relative text-2xl border border-white/20", def.color)}>
                               {def.icon}
                             </div>
                             <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm text-text-primary leading-tight mb-0.5 truncate">{def.name}</h4>
                                <p className="text-[11px] font-medium text-text-secondary line-clamp-2 leading-snug">{def.description}</p>
                             </div>
                           </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showGiftModal && (
          <SendCoinsModal recipient={user as User} onClose={() => setShowGiftModal(false)} />
        )}
      </AnimatePresence>
    </>
  );
};
