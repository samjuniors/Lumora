import React, { useState } from 'react';
import { User } from '../types';
import { X, Trophy, Medal, Star, Target, Gift, ScrollText, Sparkles, UserPlus, UserCheck, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getUserLevelAndXP, cn, getVIPLevel } from '../lib/utils';
import { calculatePerformanceScore, getPerformanceBadge } from '../lib/performance';
import { Link } from 'react-router-dom';
import { SendCoinsModal } from './SendCoinsModal';
import { INFINITE_ACHIEVEMENTS } from './Achievements';
import { getLetterGrade } from '../lib/gradeUtils';
import { BADGES } from '../lib/badges';
import { dbService } from '../services/dbProvider';
import { useAuth } from '../context/AuthContext';
import { PresenceDot } from './PresenceDot';

export const UserProfileModal = ({ 
  user: profileUser, 
  onClose,
}: { 
  user: User & { averageGrade?: number, gradedCount?: number }; 
  onClose: () => void;
}) => {
  const { user: currentUser } = useAuth();
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements'>('overview');
  const { currentLevel } = getUserLevelAndXP(profileUser);
  const perfScore = calculatePerformanceScore(profileUser);
  const badge = getPerformanceBadge(perfScore);
  const [optimisticFollowing, setOptimisticFollowing] = useState<boolean | null>(null);
  const isFollowing = optimisticFollowing !== null 
    ? optimisticFollowing 
    : (currentUser?.followingIds?.includes(profileUser.id) || false);
  const [loading, setLoading] = useState(false);

  const isFriend = currentUser?.id === profileUser.id || 
                  isFollowing || 
                  currentUser?.followerIds?.includes(profileUser.id);

  const handleFollowToggle = async () => {
    if (!currentUser) return;
    const newFollowingState = !isFollowing;
    setOptimisticFollowing(newFollowingState);
    if (!loading) setLoading(true);
    try {
      if (!newFollowingState) {
        await dbService.unfollowUser(currentUser.id, profileUser.id);
      } else {
        await dbService.followUser(currentUser.id, profileUser.id);
      }
    } catch (error) {
      console.error("Follow error:", error);
      setOptimisticFollowing(!newFollowingState);
    } finally {
      setLoading(false);
    }
  };

  const earnedAchievements = INFINITE_ACHIEVEMENTS.map(def => {
    const claimedTiers = (profileUser.achievements || [])
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

  const standardEarnedBadges = BADGES.filter(b => (profileUser.achievements || []).includes(b.id));

  const letterGrade = getLetterGrade(profileUser.averageGrade ?? 0);

  return (
    <>
      <div className="fixed inset-0 bg-text-primary/60 backdrop-blur-sm z-[60] flex items-center justify-center p-2 sm:p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-bg-surface rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-[360px] sm:max-w-[420px] p-5 sm:p-7 overflow-y-auto max-h-[85vh] shadow-2xl relative border border-border-main no-scrollbar flex flex-col"
        >
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 text-text-secondary/80 hover:bg-border-main hover:text-text-primary rounded-full transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-[2rem] bg-brand-gold-secondary-hover border-4 border-white shadow-xl flex items-center justify-center text-4xl mb-4 relative overflow-hidden group">
              {(profileUser.avatar?.startsWith('http') || profileUser.avatar?.startsWith('data:')) ? (
                 <img src={profileUser.avatar} alt={profileUser.name} className="w-full h-full object-cover" />
              ) : (
                 <span>{profileUser.avatar || '👤'}</span>
              )}
              <PresenceDot status={profileUser.presence} className="absolute bottom-1 right-1 z-20" />
            </div>
            
            <div className="text-center mb-1">
              <h2 className="text-2xl font-black text-text-primary leading-tight">{profileUser.name}</h2>
              {profileUser.luminaId && (
                <span className="text-[10px] font-mono font-bold text-[#D4AF37] uppercase tracking-tighter bg-[#1A2B48]/5 px-2 py-0.5 rounded border border-[#D4AF37]/20">
                  {profileUser.luminaId}
                </span>
              )}
            </div>

            <div className="flex items-center flex-wrap justify-center gap-2 mb-6">
              {profileUser.role === 'superadmin' ? (
                  <span className="text-xs uppercase tracking-wider font-extrabold px-2 py-1 rounded-lg text-bg-main bg-gradient-to-r from-rose-500 to-orange-500 shadow-sm border border-rose-400">
                      Super Admin
                  </span>
              ) : profileUser.role === 'admin' ? (
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
                (calculatePerformanceScore(profileUser) >= 2000 && calculatePerformanceScore(profileUser) < 5000) ? "text-[#0A1128]" : "text-bg-main"
              )}>
                {badge.title}
              </span>
            </div>

            {currentUser && currentUser.id !== profileUser.id && (
              <div className="flex gap-2 w-full mb-6">
                <button 
                  onClick={handleFollowToggle}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all border-2",
                    isFollowing 
                      ? "bg-bg-surface border-border-main text-text-secondary hover:text-red-500 hover:border-red-200" 
                      : "bg-[#1A2B48] border-[#1A2B48] text-[#D4AF37] hover:bg-[#0A1128]"
                  )}
                >
                  {isFollowing ? (
                    <><UserCheck className="w-4 h-4" /> Following</>
                  ) : (
                    <><UserPlus className="w-4 h-4" /> Follow</>
                  )}
                </button>
                <button 
                  onClick={() => setShowGiftModal(true)}
                  className="px-4 flex items-center justify-center bg-[#D4AF37] text-[#1A2B48] rounded-xl font-bold border-2 border-[#D4AF37] hover:bg-amber-400 transition-colors"
                  title="Send Coins"
                >
                  <Gift className="w-5 h-5" />
                </button>
              </div>
            )}

            <div className="flex w-full bg-border-main/80 p-1 rounded-2xl mb-4">
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
                {!isFriend ? (
                  <div className="w-full bg-bg-main border border-border-main rounded-3xl p-6 mt-2 text-center flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-border-main/50 rounded-2xl flex items-center justify-center text-text-secondary/50">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-text-primary">Profile Locked</h4>
                      <p className="text-xs text-text-secondary font-medium">Follow this user to see their academic progress and full statistics.</p>
                    </div>
                    <div className="flex gap-4 mt-2">
                       <div className="text-center">
                          <p className="text-[10px] uppercase tracking-widest text-text-secondary font-bold">Followers</p>
                          <p className="font-black text-text-primary">{(profileUser.followerIds || []).length}</p>
                       </div>
                       <div className="text-center">
                          <p className="text-[10px] uppercase tracking-widest text-text-secondary font-bold">Following</p>
                          <p className="font-black text-text-primary">{(profileUser.followingIds || []).length}</p>
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full">
                    {profileUser.bio && (
                      <p className="text-xs text-text-secondary font-medium text-center italic mb-4 px-4 line-clamp-2">
                        "{profileUser.bio}"
                      </p>
                    )}
                    <div className="w-full grid grid-cols-2 gap-3 mb-6 mt-4">
                      <div className="bg-bg-main rounded-2xl p-4 flex flex-col items-center border border-border-main">
                        <Trophy className="w-6 h-6 text-yellow-500 mb-2" />
                        <span className="text-sm text-text-secondary font-semibold mb-1">Coins</span>
                        <span className="text-xl font-black text-text-primary">{profileUser.coins}</span>
                      </div>
                      <div className="bg-bg-main rounded-2xl p-4 flex flex-col items-center border border-border-main">
                        <svg viewBox="0 0 24 24" className="w-6 h-6 text-cyan-400 mb-2" fill="currentColor">
                          <path d="M12 2L2 12l10 10 10-10L12 2zm0 17.5L5.5 12 12 5.5l6.5 6.5L12 19.5z" />
                        </svg>
                        <span className="text-sm text-text-secondary font-semibold mb-1">Diamonds</span>
                        <span className="text-xl font-black text-text-primary">{profileUser.diamonds || 0}</span>
                      </div>
                      <div className="bg-bg-main rounded-2xl p-4 flex flex-col items-center border border-border-main">
                        <Sparkles className="w-6 h-6 text-indigo-500 mb-2" />
                        <span className="text-sm text-text-secondary font-semibold mb-1">Lifetime</span>
                        <span className="text-xl font-black text-text-primary">{profileUser.lifetimeDiamonds || 0}</span>
                      </div>
                      <div className="bg-bg-main rounded-2xl p-4 flex flex-col items-center border border-border-main">
                        <Target className="w-6 h-6 text-brand-gold mb-2" />
                        <span className="text-sm text-text-secondary font-semibold mb-1">Avg Grade</span>
                        <span className="text-xl font-black text-text-primary flex items-center gap-1.5 px-2 py-0.5 rounded-lg">
                          <span className={cn("text-sm px-1.5 py-0.5 rounded-md border ring-1 font-black", letterGrade.color)}>{letterGrade.letter}</span>
                          {profileUser.averageGrade ?? 0}%
                        </span>
                      </div>
                    </div>

                    <div className="w-full space-y-3">
                      <Link 
                        to={`/scorecard/${profileUser.id}`}
                        onClick={onClose}
                        className="w-full bg-[#1A2B48] text-white hover:bg-[#0A1128] font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-950/20 flex items-center justify-center gap-2"
                      >
                        <ScrollText className="w-5 h-5 text-[#D4AF37]" /> View Academic Performance
                      </Link>
                    </div>
                  </div>
                )}
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
          <SendCoinsModal recipient={profileUser as User} onClose={() => setShowGiftModal(false)} />
        )}
      </AnimatePresence>
    </>
  );
};
