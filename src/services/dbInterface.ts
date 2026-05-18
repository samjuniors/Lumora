import { User, Assignment, Submission, Transaction, Notification, InviteCode, RechargeRequest, Enrollment, PlatformSettings, AssignmentTemplate, PreRegisteredUser, TransactionType, Syndicate } from '../types';
import { IUserService } from './interfaces/IUserService';
import { IAssignmentService } from './interfaces/IAssignmentService';
import { ISubmissionService } from './interfaces/ISubmissionService';
import { IWalletService } from './interfaces/IWalletService';
import { INotificationService } from './interfaces/INotificationService';
import { ISyndicateService } from './interfaces/ISyndicateService';
import { IAdminService } from './interfaces/IAdminService';
import { IAchievementService } from './interfaces/IAchievementService';

export interface IDatabaseService extends 
  IUserService, 
  IAssignmentService, 
  ISubmissionService, 
  IWalletService, 
  INotificationService, 
  ISyndicateService, 
  IAdminService,
  IAchievementService {
  
  // Social & Presence
  updatePresence(userId: string, presence: 'online' | 'idle' | 'offline'): Promise<void>;
  
  // Invite codes (might move to IUserService or IAdminService)
  getInviteCode(code: string): Promise<InviteCode | null>;
  getAllInviteCodes(): Promise<InviteCode[]>;
  updateInviteCode(id: string, data: Partial<InviteCode>): Promise<void>;
  saveInviteCode(id: string, data: InviteCode): Promise<void>;
  deleteInviteCode(id: string): Promise<void>;
  redeemInviteCode(code: string, userId: string, name: string, email: string): Promise<User>;

  // Misc
  giftItem(senderId: string, receiverId: string, itemId: string): Promise<void>;
  processAssessmentRewards(submissionId: string, score: number): Promise<void>;
}

