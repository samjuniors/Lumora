import { IAdminService } from '../interfaces/IAdminService';
import { PreRegisteredUser, User, Assignment, Submission, PlatformSettings, InviteCode, AssignmentTemplate } from '../../types';

export class PrismaAdminService implements IAdminService {
  async adjustUserBalance(userId: string, amount: number, isPenalty: boolean, adminId: string, reason: string): Promise<void> {}
  async adjustUserDiamonds(userId: string, amount: number, adminId: string, reason: string): Promise<void> {}
  async adjustUserXP(userId: string, amount: number, adminId: string, reason: string): Promise<void> {}
  async grantGift(userId: string, gift: any, adminId: string, reason: string): Promise<void> {}
  async revokeSubmission(submissionId: string, penalty: number, adminId: string): Promise<void> {}
  async grantResubmission(submissionId: string, graceDeadline: number, adminId: string): Promise<void> {}
  async assessSubmission(submissionId: string, score: number, feedback: string, adminId: string): Promise<void> {}
  async processAssessmentRewards(submissionId: string, score: number): Promise<void> {}
  async getRecentAssessedMissions(userId: string, limitCount: number): Promise<{ submission: Submission, assignment: Assignment }[]> { return []; }
  async sendBroadcastNotification(message: string, adminId: string): Promise<void> {}
  async revokeTransaction(transactionId: string, adminId: string): Promise<void> {}
  async adjustTransactionAmount(transactionId: string, newAmount: number, adminId: string): Promise<void> {}
  async giftItem(senderId: string, receiverId: string, itemId: string): Promise<void> {}
  
  // Settings - MIGRATED TO SQL
  async getPlatformSettings(): Promise<PlatformSettings | null> {
    const res = await fetch('/api/settings');
    if (!res.ok) return null;
    return res.json();
  }
  
  async updatePlatformSettings(data: Partial<PlatformSettings>): Promise<void> {
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }
  
  // Pre-registration
  async getPreRegisteredUsers(): Promise<PreRegisteredUser[]> { return []; }
  async savePreRegisteredUser(id: string, data: PreRegisteredUser): Promise<void> {}
  async deletePreRegisteredUser(id: string): Promise<void> {}
  async checkAndClaimPreRegistration(email: string, userId: string, defaultName: string): Promise<User | null> { return null; }
  async redeemInviteCode(code: string, userId: string, name: string, email: string): Promise<User> { throw new Error('Not implemented'); }

  // Templates & Codes - MIGRATED TO SQL
  async getAllInviteCodes(): Promise<InviteCode[]> {
    const res = await fetch('/api/invite-codes');
    return res.json();
  }
  
  async saveInviteCode(id: string, data: InviteCode): Promise<void> {
    const existing = await fetch(`/api/invite-codes?code=${encodeURIComponent(data.code)}`);
    const existingData = await existing.json();
    if (existingData && existingData.length > 0 && existingData[0].id === id) {
      await fetch(`/api/invite-codes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } else {
      await fetch(`/api/invite-codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, id })
      });
    }
  }
  
  async deleteInviteCode(id: string): Promise<void> {
    await fetch(`/api/invite-codes/${id}`, { method: 'DELETE' });
  }
  
  async saveAssignmentTemplate(id: string, data: AssignmentTemplate): Promise<void> {}

  // Achievements
  async getAchievementProgress(userId: string): Promise<Record<string, number>> { return {}; }
  async claimAchievement(userId: string, achievementId: string, reward: { coins: number, diamonds: number }): Promise<void> {}
  
  // Maintenance
  async runPenaltySweep(assignmentId?: string): Promise<{ penalizedCount: number }> { return { penalizedCount: 0 }; }
  async processUserSweep(userId: string): Promise<{ coinsDeducted: number, diamondsDeducted: number }> { return { coinsDeducted: 0, diamondsDeducted: 0 }; }
}
