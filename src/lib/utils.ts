import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getShortId = (id?: string) => {
  if (!id) return "0000000";
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % 9000000 + 1000000).toString(); // 7 digit number
}

export function getUserLevelAndXP(user: any) {
  if (!user) return { currentLevel: 1, xpCurrent: 0, xpMax: 100, xpProgress: 0, achievementsSummary: {}, totalXP: 0 };
  
  if (user.role === 'superadmin') {
     return { currentLevel: 100, xpCurrent: 0, xpMax: 100, xpProgress: 100, achievementsSummary: user.achievements || {}, totalXP: 1000000 };
  }

  const achievementsSummary = (user.achievements || []).reduce((acc: any, achId: string) => {
    const match = achId.match(/(.+)_tier_(\d+)/);
    if (match) {
      const [, id, tier] = match;
      if (!acc[id] || acc[id] < parseInt(tier)) acc[id] = parseInt(tier);
    } else {
      acc[achId] = 1;
    }
    return acc;
  }, {});

  // Calculate total tiers unlocked across all achievements
  const totalTiers = Object.values(achievementsSummary).reduce(
    (sum: number, val: any) => sum + (typeof val === 'number' ? val : 1), 0
  );

  const xpFromAchievements = (totalTiers as number) * 500;
  const baseXP = user.xp || 0;
  
  // XP only increases by missions, achievements, drops, and admin gifts
  const totalXP = baseXP + xpFromAchievements;
  
  // Custom non-linear leveling with "milestone walls"
  let level = 1;
  let remainingXP = totalXP;
  
  while (true) {
    // Base requirement for level n is usually (n * 1000)
    // But we'll make it harder at intervals
    const milestoneGroup = Math.floor(level / 10);
    let requirement = 1000 + (milestoneGroup * 2000);

    // Specific thresholds: 9->10, 19->20, 29->30 are significantly harder
    if ((level + 1) % 10 === 0) {
      requirement *= 5; // The "Wall"
    }

    if (remainingXP >= requirement) {
      remainingXP -= requirement;
      level++;
    } else {
      const xpMax = requirement;
      const xpCurrent = remainingXP;
      const xpProgress = Math.min(100, Math.max(0, (xpCurrent / xpMax) * 100));
      return { currentLevel: level, xpCurrent, xpMax, xpProgress, achievementsSummary, totalXP };
    }

    // Safety break
    if (level > 200) break;
  }

  return { currentLevel: 1, xpCurrent: 0, xpMax: 100, xpProgress: 0, achievementsSummary, totalXP: 0 };
}

export function getVIPLevel(user: any) {
  if (!user) return { level: 0, xp: 0, nextLevelXP: 1000, progress: 0 };
  
  if (user.role === 'superadmin') {
      return { level: 20, xp: 10000000, nextLevelXP: 10000000, progress: 100 };
  }
  
  const xp = user.vipExp || 0;
  
  // Levels: 0, 1000, 5000, 20000, 50000, 100000
  const thresholds = [0, 1000, 5000, 20000, 50000, 100000, 250000, 500000, 1000000];
  
  let currentLevel = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) {
      currentLevel = i;
    } else {
      break;
    }
  }
  
  const nextThreshold = thresholds[currentLevel + 1] || thresholds[currentLevel] * 2;
  const currentThreshold = thresholds[currentLevel];
  const progress = Math.min(100, Math.max(0, ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100));
  
  return { 
    level: currentLevel, 
    xp: xp, 
    nextLevelXP: nextThreshold,
    progress: progress
  };
}

export function getCleanInventory(user: any) {
  if (!user || !user.inventory) return [];
  const now = Date.now();
  // Filter out items that have an expiresAt field and it has passed
  return user.inventory.filter((item: any) => {
    if (typeof item === 'string') return true; // Legacy items
    if (!item.expiresAt) return true; // Permanent items
    return item.expiresAt > now;
  });
}
