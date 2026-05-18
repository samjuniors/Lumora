export interface IAchievementService {
  getAchievementProgress(userId: string): Promise<Record<string, number>>;
  claimAchievement(userId: string, achievementId: string, reward: { coins: number, diamonds: number }): Promise<void>;
}
