import { PreRegisteredUser, User, Assignment, Submission, PlatformSettings, InviteCode, AssignmentTemplate } from '../../types';

export interface IAdminService {
  // Batch/Admin Operations
  adjustUserBalance(userId: string, amount: number, isPenalty: boolean, adminId: string, reason: string): Promise<void>;
  adjustUserDiamonds(userId: string, amount: number, adminId: string, reason: string): Promise<void>;
  adjustUserXP(userId: string, amount: number, adminId: string, reason: string): Promise<void>;
  grantGift(userId: string, gift: any, adminId: string, reason: string): Promise<void>;
  revokeSubmission(submissionId: string, penalty: number, adminId: string): Promise<void>;
  grantResubmission(submissionId: string, graceDeadline: number, adminId: string): Promise<void>;
  assessSubmission(submissionId: string, score: number, feedback: string, adminId: string): Promise<void>;
  processAssessmentRewards(submissionId: string, score: number): Promise<void>;
  getRecentAssessedMissions(userId: string, limitCount: number): Promise<{ submission: Submission, assignment: Assignment }[]>;
  sendBroadcastNotification(message: string, adminId: string): Promise<void>;
  revokeTransaction(transactionId: string, adminId: string): Promise<void>;
  adjustTransactionAmount(transactionId: string, newAmount: number, adminId: string): Promise<void>;
  giftItem(senderId: string, receiverId: string, itemId: string): Promise<void>;
  
  // Settings
  getPlatformSettings(): Promise<PlatformSettings | null>;
  updatePlatformSettings(data: Partial<PlatformSettings>): Promise<void>;
  
  // Pre-registration
  getPreRegisteredUsers(): Promise<PreRegisteredUser[]>;
  savePreRegisteredUser(id: string, data: PreRegisteredUser): Promise<void>;
  deletePreRegisteredUser(id: string): Promise<void>;
  checkAndClaimPreRegistration(email: string, userId: string, defaultName: string): Promise<User | null>;
  redeemInviteCode(code: string, userId: string, name: string, email: string): Promise<User>;

  // Templates & Codes
  getAllInviteCodes(): Promise<InviteCode[]>;
  saveInviteCode(id: string, data: InviteCode): Promise<void>;
  deleteInviteCode(id: string): Promise<void>;
  saveAssignmentTemplate(id: string, data: AssignmentTemplate): Promise<void>;

  // Achievements
  getAchievementProgress(userId: string): Promise<Record<string, number>>;
  claimAchievement(userId: string, achievementId: string, reward: { coins: number, diamonds: number }): Promise<void>;
  
  // Maintenance
  runPenaltySweep(assignmentId?: string): Promise<{ penalizedCount: number }>;
  processUserSweep(userId: string): Promise<{ coinsDeducted: number, diamondsDeducted: number }>;
}

