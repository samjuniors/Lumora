import React, { useState, useEffect } from 'react';
import { BADGES } from '../lib/badges';
import { useAuth } from '../context/AuthContext';
import { Trophy, CheckCircle, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { submissionService, assignmentService, userService } from '../services/dbProvider';
import { toast } from 'react-hot-toast';
import { Submission, Enrollment } from '../types';

export const BadgeList = () => {
  const { user, setUser } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const [subList, enrList] = await Promise.all([
          submissionService.getSubmissionsByStudent(user.id),
          assignmentService.getEnrollmentsByStudent(user.id)
        ]);
        setSubmissions(subList);
        setEnrollments(enrList);
      } catch(e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  const handleClaim = async (badgeId: string) => {
    if (!user) return;
    try {
      const newBadges = [...(user.badgesClaimed || []), badgeId];
      await userService.updateUser(user.id, {
        badgesClaimed: newBadges
      });
      setUser({ ...user, badgesClaimed: newBadges });
      toast.success('Badge claimed successfully!');
    } catch (e: any) {
      toast.error('Failed to claim badge.');
      console.error(e);
    }
  };

  if (!user || loading) return <div className="text-center p-8">Loading badges...</div>;

  const claimedBadges = user.badgesClaimed || [];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {BADGES.map(badge => {
        const isClaimed = claimedBadges.includes(badge.id);
        const isEligible = !isClaimed && badge.checkEligibility(user, submissions, enrollments);

        return (
          <motion.div
            key={badge.id}
            whileHover={{ scale: 1.02 }}
            className={`relative p-4 rounded-[2rem] border overflow-hidden flex flex-col items-center text-center transition-all ${isClaimed ? 'bg-bg-surface border-border-main shadow-sm' : 'bg-bg-surface/50 border-border-main/50 grayscale opacity-70 hover:grayscale-[0.5] hover:opacity-100'}`}
          >
            {/* Background Hint for Claimed */}
            {isClaimed && <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full ${badge.color} blur-[50px] opacity-20 pointer-events-none`}></div>}
            
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-3 shadow-inner border border-white/10 ${isClaimed ? badge.color + ' text-white' : 'bg-gray-300 text-gray-500'}`}>
              {badge.icon}
            </div>
            
            <h3 className="font-bold text-text-primary text-sm mb-1">{badge.name}</h3>
            <p className="text-text-secondary text-xs mb-4 flex-1">{badge.description}</p>
            
            {isClaimed ? (
              <div className="flex items-center gap-1 text-success-green text-xs font-bold bg-success-green/10 px-3 py-1 rounded-full">
                <CheckCircle className="w-3.5 h-3.5" /> Claimed
              </div>
            ) : isEligible ? (
              <button
                onClick={() => handleClaim(badge.id)}
                className="w-full py-2 bg-brand-gold-hover text-bg-main text-xs font-black rounded-xl shadow-sm hover:scale-105 transition-transform"
              >
                CLAIM BADGE
              </button>
            ) : (
              <div className="flex items-center gap-1 text-text-secondary text-xs font-bold bg-bg-main px-3 py-1 rounded-full border border-border-main">
                <Lock className="w-3 h-3" /> Locked
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};
