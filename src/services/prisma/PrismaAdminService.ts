import { IAdminService } from '../interfaces/IAdminService';
import { PreRegisteredUser, User, Assignment, Submission, PlatformSettings, InviteCode, AssignmentTemplate } from '../../types';

export class PrismaAdminService implements IAdminService {
  async adjustUserBalance(userId: string, amount: number, isPenalty: boolean, adminId: string, reason: string): Promise<void> {
    const txId = `ADMIN_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    await fetch('/api/transactions/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        txData: {
          id: txId,
          senderId: isPenalty ? userId : adminId,
          receiverId: isPenalty ? adminId : userId,
          amount: Math.abs(amount),
          type: isPenalty ? 'penalty' : 'adjustment',
          message: reason,
          status: 'completed',
          currency: 'coins'
        },
        userUpdates: [{ where: { id: userId }, data: { coins: { increment: amount } } }]
      })
    });
  }

  async adjustUserDiamonds(userId: string, amount: number, adminId: string, reason: string): Promise<void> {
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ diamonds: amount > 0 ? { increment: amount } : { decrement: -amount } }) // Prisma wait, we are using API so the API currently just expects the raw number in the PATCH logic?
    });
  }

  async adjustUserXP(userId: string, amount: number, adminId: string, reason: string): Promise<void> {
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ xp: amount > 0 ? { increment: amount } : { decrement: -amount } })
    });
  }
  async grantGift(userId: string, gift: any, adminId: string, reason: string): Promise<void> {}
  async revokeSubmission(submissionId: string, penalty: number, adminId: string): Promise<void> {
    const res = await fetch(`/api/submissions/${submissionId}`);
    const sub = await res.json();
    await fetch(`/api/submissions/${submissionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'revoked', penaltyAmount: penalty })
    });
    await this.adjustUserBalance(sub.studentId, -penalty, true, adminId, "Submission Revoked Penalty");
  }

  async grantResubmission(submissionId: string, graceDeadline: number, adminId: string): Promise<void> {
    await fetch(`/api/submissions/${submissionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'pending' })
    });
    const getRes = await fetch(`/api/submissions/${submissionId}`);
    if (!getRes.ok) return;
    const sub = await getRes.json();
    const enrollments = await fetch(`/api/enrollments?assignmentId=${sub.assignmentId}&studentId=${sub.studentId}`);
    const enrolls = await enrollments.json();
    if (enrolls && enrolls.length > 0) {
      await fetch(`/api/enrollments/${enrolls[0].id}`, {
         method: 'PATCH',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ graceDeadline: new Date(graceDeadline).toISOString() })
      });
    }
  }
  async assessSubmission(submissionId: string, score: number, feedback: string, adminId: string): Promise<void> {
    await fetch(`/api/submissions/${submissionId}`, {
      method: 'PATCH', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aiScore: score, feedback: feedback, status: 'assessed' })
    });
  }
  async processAssessmentRewards(submissionId: string, score: number): Promise<void> {}
  async getRecentAssessedMissions(userId: string, limitCount: number): Promise<{ submission: Submission, assignment: Assignment }[]> {
    const res = await fetch(`/api/submissions?studentId=${userId}&status=assessed&limit=${limitCount}`);
    if (!res.ok) return [];
    const subs = await res.json();
    const results = [];
    for (const sub of subs) {
      const aRes = await fetch(`/api/assignments/${sub.assignmentId}`);
      if (aRes.ok) {
        results.push({ submission: sub, assignment: await aRes.json() });
      }
    }
    return results;
  }
  async sendBroadcastNotification(message: string, adminId: string): Promise<void> {
    const studentsRes = await fetch('/api/users?role=student');
    const students = await studentsRes.json();
    for (const s of students) {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: s.id,
          title: '📢 Admin Announcement',
          message,
          type: 'alert'
        })
      });
    }
  }
  async revokeTransaction(transactionId: string, adminId: string): Promise<void> {
    await fetch(`/api/transactions/${transactionId}`, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ status: 'revoked' }) });
  }
  async adjustTransactionAmount(transactionId: string, newAmount: number, adminId: string): Promise<void> {
    await fetch(`/api/transactions/${transactionId}`, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ amount: newAmount }) });
  }
  async giftItem(senderId: string, receiverId: string, itemId: string): Promise<void> {
    const txId = `GIFT_${Date.now()}`;
    await fetch('/api/transactions/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        txData: { id: txId, senderId, receiverId, amount: 0, type: 'transfer', message: `Gifted item: ${itemId}` },
        userUpdates: [
          { where: { id: senderId }, data: { inventory: { disconnect: itemId } } }, // This depends on schema, but schema has item ids in string[] or similar?
          { where: { id: receiverId }, data: { inventory: { connect: itemId } } }
        ]
      })
    });
  }
  
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
  async getPreRegisteredUsers(): Promise<PreRegisteredUser[]> {
    const res = await fetch('/api/pre-registered');
    if (!res.ok) return [];
    return res.json();
  }
  async savePreRegisteredUser(id: string, data: PreRegisteredUser): Promise<void> {
    await fetch('/api/pre-registered', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, id })
    });
  }
  async deletePreRegisteredUser(id: string): Promise<void> {
    await fetch(`/api/pre-registered/${id}`, { method: 'DELETE' });
  }
  async checkAndClaimPreRegistration(email: string, userId: string, defaultName: string): Promise<User | null> {
    const res = await fetch(`/api/pre-registered?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (data && data.length > 0 && data[0].status === 'pending') {
      const pre = data[0];
      await fetch(`/api/pre-registered/${pre.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'claimed', userId, claimedAt: new Date().toISOString() })
      });
      // Return user object to complete registration
      return { id: userId, email, name: pre.name || defaultName, role: pre.role, coins: pre.coins } as any;
    }
    return null;
  }
  async redeemInviteCode(code: string, userId: string, name: string, email: string): Promise<User> {
    const res = await fetch(`/api/invite-codes?code=${encodeURIComponent(code)}`);
    const codes = await res.json();
    if (!codes || codes.length === 0) throw new Error('Invalid code');
    const c = codes[0];
    await fetch(`/api/invite-codes/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentUses: (c.currentUses || 0) + 1, usedBy: [...(c.usedBy || []), userId] })
    });
    return { id: userId, email, name, role: c.role, coins: 100 } as any;
  }

  // Templates & Codes - MIGRATED TO SQL
  async getAllInviteCodes(): Promise<InviteCode[]> {
    const res = await fetch('/api/invite-codes');
    return res.json();
  }
  
  async saveInviteCode(id: string, data: InviteCode): Promise<void> {
    await fetch(`/api/invite-codes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, id })
    });
  }
  
  async deleteInviteCode(id: string): Promise<void> {
    await fetch(`/api/invite-codes/${id}`, { method: 'DELETE' });
  }
  
  async saveAssignmentTemplate(id: string, data: AssignmentTemplate): Promise<void> {
    await fetch(`/api/assignment-templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }

  // Achievements
  async getAchievementProgress(userId: string): Promise<Record<string, number>> {
    const res = await fetch(`/api/users/${userId}/achievement-progress`);
    if (!res.ok) return {};
    return res.json();
  }
  async claimAchievement(userId: string, achievementId: string, reward: { coins: number, diamonds: number }): Promise<void> {
    const txId = `ACHV_${Date.now()}`;
    await fetch('/api/transactions/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        txData: { id: txId, senderId: 'SYSTEM', receiverId: userId, amount: reward.coins, type: 'achievement_reward', message: `Achievement: ${achievementId}` },
        userUpdates: [
          { where: { id: userId }, data: { coins: { increment: reward.coins }, diamonds: { increment: reward.diamonds } } }
        ]
      })
    });
  }
  
  // Maintenance
  async runPenaltySweep(assignmentId?: string): Promise<{ penalizedCount: number }> {
    const res = await fetch('/api/maintenance/penalty-sweep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignmentId })
    });
    if (!res.ok) return { penalizedCount: 0 };
    return res.json();
  }
  async processUserSweep(userId: string): Promise<{ coinsDeducted: number, diamondsDeducted: number }> { return { coinsDeducted: 0, diamondsDeducted: 0 }; }
}
