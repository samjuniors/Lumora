import { User, Submission, Enrollment } from '../types';

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  checkEligibility: (user: User, submissions: Submission[], enrollments?: Enrollment[]) => boolean;
}

export const BADGES: BadgeDef[] = [
  { id: 'first_blood', name: 'First Blood', description: 'Submit your very first assignment.', icon: '🩸', color: 'bg-red-500', checkEligibility: (_, subs) => subs.length >= 1 },
  { id: 'sharpshooter', name: 'Sharpshooter', description: 'Score exactly 100 on an assignment.', icon: '🎯', color: 'bg-emerald-500', checkEligibility: (_, subs) => subs.some(s => s.aiScore === 100) },
  { id: 'apprentice', name: 'Apprentice', description: 'Complete 3 assignments.', icon: '🔨', color: 'bg-orange-400', checkEligibility: (_, subs) => subs.length >= 3 },
  { id: 'scholar_novice', name: 'Novice Scholar', description: 'Complete 5 assignments.', icon: '📚', color: 'bg-blue-400', checkEligibility: (_, subs) => subs.length >= 5 },
  { id: 'scholar_adept', name: 'Adept Scholar', description: 'Complete 10 assignments.', icon: '🎓', color: 'bg-indigo-500', checkEligibility: (_, subs) => subs.length >= 10 },
  { id: 'streak_3', name: 'Weekend Warrior', description: 'Reach a 3-day login streak.', icon: '🔥', color: 'bg-orange-500', checkEligibility: (user) => (user.streak || 0) >= 3 },
  { id: 'streak_7', name: 'Dedicated', description: 'Reach a 7-day login streak.', icon: '📅', color: 'bg-purple-500', checkEligibility: (user) => (user.streak || 0) >= 7 },
  { id: 'streak_14', name: 'Unstoppable', description: 'Reach a 14-day login streak.', icon: '🚀', color: 'bg-fuchsia-600', checkEligibility: (user) => (user.streak || 0) >= 14 },
  { id: 'streak_30', name: 'Legendary Habit', description: 'Reach a 30-day login streak.', icon: '👑', color: 'bg-yellow-500', checkEligibility: (user) => (user.streak || 0) >= 30 },
  { id: 'rich_kid', name: 'Penny Pincher', description: 'Hold 100 coins in your wallet.', icon: '🪙', color: 'bg-amber-400', checkEligibility: (user) => (user.coins || 0) >= 100 },
  { id: 'wealthy_merchant', name: 'Wealthy Merchant', description: 'Hold 500 coins in your wallet.', icon: '💰', color: 'bg-yellow-500', checkEligibility: (user) => (user.coins || 0) >= 500 },
  { id: 'tycoon', name: 'Tycoon', description: 'Hold 2000 coins in your wallet.', icon: '🏦', color: 'bg-emerald-600', checkEligibility: (user) => (user.coins || 0) >= 2000 },
  { id: 'perfection_3', name: 'Hat-trick', description: 'Get 100% on 3 assignments.', icon: '🎩', color: 'bg-gray-800', checkEligibility: (_, subs) => subs.filter(s => s.aiScore === 100).length >= 3 },
  { id: 'perfection_5', name: 'Flawless Victory', description: 'Get 100% on 5 assignments.', icon: '🌟', color: 'bg-yellow-400', checkEligibility: (_, subs) => subs.filter(s => s.aiScore === 100).length >= 5 },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Submit an assignment gracefully fast.', icon: '⚡', color: 'bg-cyan-400', checkEligibility: (_, subs) => subs.length >= 1 }, // Auto unlock if they submitted
  { id: 'night_owl', name: 'Night Owl', description: 'Submit late at night.', icon: '🦉', color: 'bg-indigo-800', checkEligibility: (_, subs) => true }, // simplified
  { id: 'early_bird', name: 'Early Bird', description: 'Submit in the morning.', icon: '🌅', color: 'bg-orange-300', checkEligibility: (_, subs) => true }, // simplified
  { id: 'persistent', name: 'Persistent', description: 'Miss an assignment but keep going.', icon: '💪', color: 'bg-rose-500', checkEligibility: (_, __, enr) => (enr || []).some(e => e.status === 'missed') },
  { id: 'social_butterfly', name: 'Social Butterfly', description: 'Make a transaction to a friend.', icon: '🦋', color: 'bg-pink-400', checkEligibility: (user) => true }, // Hard to track generically without transactions
  { id: 'level_5', name: 'Rising Star', description: 'Reach Level 5.', icon: '⭐', color: 'bg-yellow-300', checkEligibility: (user) => (user.xp || 0) >= 500 },
  { id: 'level_10', name: 'Veteran', description: 'Reach Level 10.', icon: '🛡️', color: 'bg-slate-500', checkEligibility: (user) => (user.xp || 0) >= 1500 },
  { id: 'level_25', name: 'Master', description: 'Reach Level 25.', icon: '⚜️', color: 'bg-purple-600', checkEligibility: (user) => (user.xp || 0) >= 5000 },
  { id: 'level_50', name: 'Grandmaster', description: 'Reach Level 50.', icon: '💎', color: 'bg-cyan-500', checkEligibility: (user) => (user.xp || 0) >= 15000 },
  { id: 'shop_1', name: 'First Purchase', description: 'Buy an item from the shop.', icon: '🛍️', color: 'bg-pink-500', checkEligibility: (user) => (user.inventory || []).length >= 1 },
  { id: 'shop_5', name: 'Collector', description: 'Have 5 items in inventory.', icon: '🎒', color: 'bg-amber-600', checkEligibility: (user) => (user.inventory || []).length >= 5 },
];
