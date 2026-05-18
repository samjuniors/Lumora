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

export function checkLevelUp(oldTotalXP: number, newTotalXP: number) {
  const oldLevelData = getLevelFromTotalXP(oldTotalXP);
  const newLevelData = getLevelFromTotalXP(newTotalXP);
  
  if (newLevelData.level > oldLevelData.level) {
    const rewards: any[] = [];
    // Check for every 10th level
    for (let lv = oldLevelData.level + 1; lv <= newLevelData.level; lv++) {
      if (lv % 10 === 0) {
        rewards.push({
          level: lv,
          type: 'special',
          badge: `level_${lv}_master`,
          frame: `frame_lv_${lv}`,
          perks: ['increased_power', 'exclusive_gift']
        });
      }
    }
    return { leveledUp: true, oldLevel: oldLevelData.level, newLevel: newLevelData.level, rewards };
  }
  return { leveledUp: false };
}

function getLevelFromTotalXP(totalXP: number) {
  let level = 1;
  let accumulatedXP = 0;
  while (true) {
    // Harder Scaling: Base 1200, increases by 800 per level
    const xpNeeded = 1200 + (level - 1) * 800;
    if (totalXP >= accumulatedXP + xpNeeded) {
      accumulatedXP += xpNeeded;
      level++;
    } else {
      return { level, xpInCurrent: totalXP - accumulatedXP, xpMax: xpNeeded };
    }
  }
}

export function getUserLevelAndXP(user: any) {
  if (!user) return { currentLevel: 1, xpCurrent: 0, xpMax: 1000, xpProgress: 0, achievementsSummary: {}, totalXP: 0 };
  
  if (user.role === 'superadmin') {
     return { currentLevel: 100, xpCurrent: 0, xpMax: 1000, xpProgress: 100, achievementsSummary: user.achievements || {}, totalXP: 1000000 };
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

  const totalXP = (user.xp || 0) + (user.lifetimeDiamonds || 0);
  const { level, xpInCurrent, xpMax } = getLevelFromTotalXP(totalXP);
  const xpProgress = (xpInCurrent / xpMax) * 100;

  return { 
    currentLevel: level, 
    xpCurrent: xpInCurrent, 
    xpMax, 
    xpProgress, 
    levelProgress: xpProgress,
    nextLevelXP: xpMax,
    achievementsSummary, 
    totalXP,
    nextRewardLevel: level % 10 === 0 ? level + 10 : Math.ceil(level / 10) * 10
  };
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
