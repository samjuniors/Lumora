export type Role = 'student' | 'admin' | 'superadmin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  coins: number;
  diamonds?: number;
  taxWallet?: number;
  rechargedCoins?: number; // Total amount of coins recharged via payments
  inviteCodeUsed?: string;
  achievements?: string[]; // Array of achievement IDs claimed
  badgesClaimed?: string[]; // Array of unique badge IDs claimed
  inventory?: string[]; // Array of purchased item IDs
  avatar?: string;
  bannerColor?: string;
  theme?: string;
  streak?: number;
  lastActive?: string;
  lastRewardClaimedAt?: string | number | Date;
  lastCollectionAt?: string | number | Date;
  lastMissedSweep?: number;
  lastSeenVersion?: string;
  xp?: number;
  lifetimeDiamonds?: number;
  dailyDiamonds?: number;
  weeklyDiamonds?: number;
  lastResetDay?: string;
  lastResetWeek?: string;
  xpBoosterUntil?: number;
  vipExp?: number;
  vipLevel?: number;
  level?: number;
  syndicateId?: string;
  luminaId?: string;
  presence?: 'online' | 'idle' | 'offline';
  lastSeen?: number;
  followingIds?: string[];
  followerIds?: string[];
  bio?: string;
  academicRoadmap?: string;
  isOracleUnlocked?: boolean;
  taxHavenUntil?: number;
  doubleDownShieldUntil?: number;
  themeId?: string;
  badgeIds?: string[];
  rank?: number;
  gradedCount?: number;
  totalScore?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Syndicate {
  id: string;
  name: string;
  description: string;
  tag: string;
  leaderId: string;
  memberIds: string[];
  totalScore: number;
  coinsStaked: number;
  logo?: string;
  level: number;
  createdAt: number;
  updatedAt: number;
}

export interface InviteCode {
  id: string;
  code: string;
  role: Role;
  createdBy: string;
  used: boolean;
  usedBy?: string[];
  maxUses?: number;
  currentUses?: number;
  createdAt: number;
  updatedAt?: number;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  instructions?: string;
  rubric?: { name: string; description: string; weight: number }[];
  subject?: string;
  frequency?: string;
  startDate?: number;
  timeLimitMinutes?: number;
  dueDate: number;
  entryFee: number;
  bonusReward: number;
  penaltyFee: number;
  xpReward: number;
  isBonus: boolean;
  isDuoBonus?: boolean;
  duoId?: string;
  bonusType?: 'presentation' | 'test';
  missionNumber?: number;
  allowedStudents?: string[];
  isGlobal?: boolean;
  status?: 'active' | 'archived' | 'draft';
  campaignId?: string;
  creatorId: string;
  gradedCount?: number;
  totalScore?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Enrollment {
  id: string;
  assignmentId: string;
  studentId: string;
  enrolledAt: number;
  status: 'active' | 'submitted' | 'missed' | 'graded';
  grade?: number;
  rewardEarned?: number;
  graceDeadline?: number;
  isDoubleDown?: boolean;
  stakedAmount?: number;
  updatedAt: number;
}

export interface RechargeRequest {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  coins: number;
  status: 'pending' | 'approved' | 'rejected';
  paymentScreenshot?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Attachment {
  url: string;
  type: string;
  name: string;
  size?: number;
  uploadedAt?: number;
}

export type SubmissionStatus = 'pending' | 'assessed' | 'evaluating' | 'pending_review' | 'rejected' | 'revoked';

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  content: string;
  attachments?: Attachment[];
  aiScore: number;
  aiFeedback: string;
  feedback?: {
    overallFeedback: string;
    rubricFeedback: {
       criterion: string;
       score: number;
       feedback: string;
    }[];
  };
  calculatedReward?: number;
  penaltyAmount?: number;
  status: SubmissionStatus;
  tabSwitches?: number;
  pasteCount?: number;
  reviewedAt?: number;
  reviewedBy?: string;
  submittedAt: number;
  updatedAt: number;
}

export interface AssignmentTemplate {
  id: string; // Document ID
  label: string;
  title: string;
  subject: string;
  description: string;
  instructions: string;
  timeLimitMinutes: number;
  rubric: { name: string; description: string; weight: number }[];
  creatorId?: string;
  createdAt?: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'success' | 'alert' | 'info' | 'message';
  read: boolean;
  createdAt: number;
}

export interface PreRegisteredUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  coins: number;
  status: 'pending' | 'joined';
  createdAt: number;
}

export type TransactionType = 'transfer' | 'recharge' | 'spend' | 'ai_assessment' | 'enrollment_fee' | 'assignment_reward' | 'assignment_penalty' | 'late_submission_fee' | 'late_enrollment_fee' | 'shop_purchase' | 'daily_reward' | 'achievement_reward' | 'penalty' | 'refund' | 'mission_reward' | 'tax' | 'convert' | 'gift';

export type TransactionStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'revoked';

export interface Transaction {
  id: string;
  senderId: string;
  receiverId: string;
  amount: number;
  currency?: 'coins' | 'diamonds' | 'xp';
  type: TransactionType;
  status: TransactionStatus;
  utr?: string;
  itemId?: string;
  message?: string;
  timestamp: number;
  updatedAt?: number;
}

export interface PlatformSettings {
  upiHandle: string;
  mobileNumber?: string;
  payeeName?: string;
  paymentLink?: string;
  updatedAt: number;
}
