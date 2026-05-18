import { PreRegisteredUser, User, Assignment, Submission, PlatformSettings } from '../../types';

export interface IAdminService {
  // Batch/Admin Operations
  adjustUserBalance(userId: string, amount: number, isPenalty: boolean, adminId: string, reason: string): Promise<void>;
  adjustUserDiamonds(userId: string, amount: number, adminId: string, reason: string): Promise<void>;
  adjustUserXP(userId: string, amount: number, adminId: string, reason: string): Promise<void>;
  grantGift(userId: string, gift: any, adminId: string, reason: string): Promise<void>;
  revokeSubmission(submissionId: string, penalty: number, adminId: string): Promise<void>;
  grantResubmission(submissionId: string, graceDeadline: number, adminId: string): Promise<void>;
  assessSubmission(submissionId: string, score: number, feedback: string, adminId: string): Promise<void>;
  
  // Settings
  getPlatformSettings(): Promise<PlatformSettings | null>;
  updatePlatformSettings(data: Partial<PlatformSettings>): Promise<void>;
  
  // Pre-registration
  getPreRegisteredUsers(): Promise<PreRegisteredUser[]>;
  savePreRegisteredUser(id: string, data: PreRegisteredUser): Promise<void>;
  deletePreRegisteredUser(id: string): Promise<void>;
  checkAndClaimPreRegistration(email: string, userId: string, defaultName: string): Promise<User | null>;
  
  // Maintenance
  runPenaltySweep(assignmentId?: string): Promise<{ penalizedCount: number }>;
  processUserSweep(userId: string): Promise<{ coinsDeducted: number, diamondsDeducted: number }>;
}
