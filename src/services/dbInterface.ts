import { User, Assignment, Submission, Transaction, Notification, InviteCode, RechargeRequest, Enrollment, PlatformSettings, AssignmentTemplate, PreRegisteredUser, TransactionType, Syndicate } from '../types';

export interface IDatabaseService {
  // Achievement operations
  getAchievementProgress(userId: string): Promise<Record<string, number>>;
  claimAchievement(userId: string, achievementId: string, reward: { coins: number, diamonds: number }): Promise<void>;
  getUser(userId: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  updateUser(userId: string, data: Partial<User>): Promise<void>;
  createUser(userId: string, data: User): Promise<void>;
  getUsersByRole(role: string): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  getUsers(): Promise<User[]>; // Added for social search
  deleteUser(userId: string): Promise<void>;

  // Social & Presence
  followUser(followerId: string, targetId: string): Promise<void>;
  unfollowUser(followerId: string, targetId: string): Promise<void>;
  updatePresence(userId: string, presence: 'online' | 'idle' | 'offline'): Promise<void>;
  initializeUser(userId: string, data: Partial<User>): Promise<void>;
  generateLumoraId(userId: string): Promise<string>;

  // Assignment operations
  getAssignment(assignmentId: string): Promise<Assignment | null>;
  getAllAssignments(): Promise<Assignment[]>;
  createAssignment(data: Omit<Assignment, 'id'>): Promise<string>;
  updateAssignment(assignmentId: string, data: Partial<Assignment>): Promise<void>;
  deleteAssignment(assignmentId: string): Promise<void>;

  // Submission operations
  getSubmission(submissionId: string): Promise<Submission | null>;
  getAllSubmissions(): Promise<Submission[]>;
  getSubmissionsByAssignment(assignmentId: string): Promise<Submission[]>;
  getSubmissionsByStudent(studentId: string): Promise<Submission[]>;
  createSubmission(data: Omit<Submission, 'id'>): Promise<string>;
  updateSubmission(submissionId: string, data: Partial<Submission>): Promise<void>;
  deleteSubmission(submissionId: string): Promise<void>;

  // Transaction operations
  createTransaction(data: Omit<Transaction, 'id'>): Promise<string>;
  getUserTransactions(userId: string): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;
  spendCoins(userId: string, amount: number, type: TransactionType, message: string): Promise<void>;
  transferCoins(senderId: string, receiverId: string, amount: number): Promise<void>;
  convertDiamondsToCoins(userId: string, diamondsAmount: number): Promise<void>;

  // Notification operations
  getUserNotifications(userId: string, limit?: number): Promise<Notification[]>;
  createNotification(data: Omit<Notification, 'id'>): Promise<string>;
  markNotificationRead(notificationId: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  clearAllNotifications(userId: string): Promise<void>;
  deleteNotification(notificationId: string): Promise<void>;
  subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void): () => void;
  subscribeToNewNotifications(userId: string, callback: (notification: Notification) => void): () => void;

  // Invite codes
  getInviteCode(code: string): Promise<InviteCode | null>;
  getAllInviteCodes(): Promise<InviteCode[]>;
  updateInviteCode(id: string, data: Partial<InviteCode>): Promise<void>;
  saveInviteCode(id: string, data: InviteCode): Promise<void>;
  deleteInviteCode(id: string): Promise<void>;
  
  // Real-time subscriptions
  subscribeToUser(userId: string, callback: (user: User | null) => void): () => void;
  subscribeToStudents(callback: (users: User[]) => void): () => void;
  subscribeToAssessedSubmissions(callback: (submissions: Submission[]) => void): () => void;

  // Recharge Requests
  getRechargeRequests(status?: string): Promise<RechargeRequest[]>;
  createRechargeRequest(data: Omit<RechargeRequest, 'id'>): Promise<string>;
  updateRechargeRequest(id: string, data: Partial<RechargeRequest>): Promise<void>;

  // Enrollment operations
  getEnrollmentsByStudent(studentId: string): Promise<Enrollment[]>;
  getAllEnrollments(): Promise<Enrollment[]>;
  updateEnrollment(id: string, data: Partial<Enrollment>): Promise<void>;
  createEnrollment(data: Omit<Enrollment, 'id'>): Promise<string>;
  deleteEnrollment(id: string): Promise<void>;

  // Platform Settings
  getPlatformSettings(): Promise<PlatformSettings | null>;
  updatePlatformSettings(data: Partial<PlatformSettings>): Promise<void>;

  // Assignment Templates
  getAssignmentTemplates(): Promise<AssignmentTemplate[]>;
  createAssignmentTemplate(data: Omit<AssignmentTemplate, 'id'>): Promise<string>;
  saveAssignmentTemplate(id: string, data: AssignmentTemplate): Promise<void>;
  deleteAssignmentTemplate(id: string): Promise<void>;

  // Pre-registered users
  getPreRegisteredUsers(): Promise<PreRegisteredUser[]>;
  savePreRegisteredUser(id: string, data: PreRegisteredUser): Promise<void>;
  deletePreRegisteredUser(id: string): Promise<void>;

  // Admin Batch Operations
  adjustUserBalance(userId: string, amount: number, isPenalty: boolean, adminId: string, reason: string): Promise<void>;
  adjustUserDiamonds(userId: string, amount: number, adminId: string, reason: string): Promise<void>;
  adjustUserXP(userId: string, amount: number, adminId: string, reason: string): Promise<void>;
  grantGift(userId: string, gift: any, adminId: string, reason: string): Promise<void>;
  revokeSubmission(submissionId: string, penalty: number, adminId: string): Promise<void>;
  grantResubmission(submissionId: string, graceDeadline: number, adminId: string): Promise<void>;
  assessSubmission(submissionId: string, score: number, feedback: string, adminId: string): Promise<void>;
  getRecentAssessedMissions(userId: string, limit: number): Promise<{ submission: Submission, assignment: Assignment }[]>;
  sendBroadcastNotification(message: string, adminId: string): Promise<void>;
  giftItem(senderId: string, receiverId: string, itemId: string): Promise<void>;
  spendCoins(userId: string, amount: number, type: TransactionType, message: string): Promise<void>;
  transferCoins(senderId: string, receiverId: string, amount: number): Promise<void>;
  claimDailyReward(userId: string, reward: { type: string, value: number | string }): Promise<void>;
  claimCollectorReward(userId: string, coins: number, diamonds: number): Promise<void>;
  checkAndClaimPreRegistration(email: string, userId: string, defaultName: string): Promise<User | null>;
  redeemInviteCode(code: string, userId: string, name: string, email: string): Promise<User>;
  revokeTransaction(transactionId: string, adminId: string): Promise<void>;
  adjustTransactionAmount(transactionId: string, newAmount: number, adminId: string): Promise<void>;
  getAllRechargeRequests(): Promise<RechargeRequest[]>;
  approveRechargeRequest(requestId: string, adminId: string): Promise<void>;
  rejectRechargeRequest(requestId: string, adminId: string): Promise<void>;
  runPenaltySweep(assignmentId?: string): Promise<{ penalizedCount: number }>;
  processUserSweep(userId: string): Promise<{ coinsDeducted: number, diamondsDeducted: number }>;
  getAllAssessedSubmissions(): Promise<Submission[]>;
  processAssessmentRewards(submissionId: string, score: number): Promise<void>;

  // Syndicate Methods
  getAllSyndicates(): Promise<Syndicate[]>;
  createSyndicate(data: Omit<Syndicate, 'id'>): Promise<string>;
  updateSyndicate(id: string, data: Partial<Syndicate>): Promise<void>;
}
