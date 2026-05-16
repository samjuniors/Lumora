import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  orderBy, 
  limit as fsLimit,
  onSnapshot,
  deleteDoc,
  writeBatch,
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from './firebase';
import { IDatabaseService } from './dbInterface';
import { User, Assignment, Submission, Transaction, Notification, InviteCode, RechargeRequest, Enrollment, PlatformSettings, AssignmentTemplate, PreRegisteredUser, TransactionType, Syndicate } from '../types';
import { handleFirestoreError, OperationType } from '../lib/errorHandling';
import { checkLevelUp } from '../lib/utils';

export class FirebaseService implements IDatabaseService {
  async getUser(userId: string): Promise<User | null> {
    try {
      const snap = await getDoc(doc(db, 'users', userId));
      return snap.exists() ? snap.data() as User : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${userId}`);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const q = query(collection(db, 'users'), where('email', '==', email), fsLimit(1));
      const snap = await getDocs(q);
      return !snap.empty ? snap.docs[0].data() as User : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
      return null;
    }
  }

  async updateUser(userId: string, data: Partial<User>): Promise<void> {
    // Static fields throttle: 5 seconds. State reactive updates should be handled by components.
    if (this.shouldThrottle(`user/update/${userId}`, 5000, data)) return;
    try {
      await updateDoc(doc(db, 'users', userId), { ...data, updatedAt: Date.now() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  }

  async createUser(userId: string, data: User): Promise<void> {
    try {
      await setDoc(doc(db, 'users', userId), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${userId}`);
    }
  }

  async getUsersByRole(role: string): Promise<User[]> {
    try {
      const q = query(collection(db, 'users'), where('role', '==', role));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as User));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
      return [];
    }
  }

  async getAllUsers(): Promise<User[]> {
    const now = Date.now();
    if (this.usersCache && (now - this.usersCache.timestamp) < this.CACHE_TTL) {
      return this.usersCache.data;
    }
    try {
      const snap = await getDocs(collection(db, 'users'));
      const data = snap.docs.map(d => ({ ...d.data(), id: d.id } as User));
      this.usersCache = { data, timestamp: now };
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
      return [];
    }
  }

  async getUsers(): Promise<User[]> {
    return this.getAllUsers();
  }

  private applyLevelUpNotifications(batch: any, userId: string, levelUpData: ReturnType<typeof checkLevelUp>) {
    if (!levelUpData.leveledUp) return;
    
    const now = Date.now();
    
    // Notification for the level up
    batch.set(doc(db, 'notifications', `LEVEL_UP_${userId}_${levelUpData.newLevel}_${now}`), {
      id: `LEVEL_UP_${userId}_${levelUpData.newLevel}_${now}`,
      userId,
      title: `🎖️ LEVEL UP: ${levelUpData.newLevel}`,
      message: `Congratulations! You've reached Level ${levelUpData.newLevel}. Your power has increased!`,
      type: 'success',
      read: false,
      createdAt: now
    });

    // Special rewards for 10th levels
    levelUpData.rewards.forEach((reward, index) => {
      batch.set(doc(db, 'notifications', `LEVEL_REWARD_${userId}_${reward.level}_${now}_${index}`), {
        id: `LEVEL_REWARD_${userId}_${reward.level}_${now}_${index}`,
        userId,
        title: `🎁 LEGENDARY REWARD`,
        message: `For reaching Level ${reward.level}, you've received: ${reward.badge} badge, a new frame, and permanent status boost!`,
        type: 'alert',
        read: false,
        createdAt: now
      });

      // Grant badge
      batch.update(doc(db, 'users', userId), {
        achievements: arrayUnion(reward.badge),
        inventory: arrayUnion({
          id: reward.frame,
          name: `Level ${reward.level} Frame`,
          type: 'frame',
          rarity: 'legendary',
          acquiredAt: now
        })
      });
    });
  }

  private calculateResourceUpdates(user: User, diamondsToAdd: number, xpToAdd: number = 0) {
    const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const today = `${nowIST.getFullYear()}-${String(nowIST.getMonth() + 1).padStart(2, '0')}-${String(nowIST.getDate()).padStart(2, '0')}`;
    
    const d = new Date(nowIST);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    const thisWeek = `${d.getFullYear()}-W${weekNo}`;

    const updates: any = {
      updatedAt: Date.now()
    };

    // Calculate level up before applying increments
    const oldTotalXP = (user.xp || 0) + (user.lifetimeDiamonds || 0);
    const hasXpBooster = user.xpBoosterUntil && user.xpBoosterUntil > Date.now();
    const effectiveXpToAdd = hasXpBooster ? Math.floor(xpToAdd * 1.5) : xpToAdd;
    const newTotalXP = oldTotalXP + effectiveXpToAdd + Math.max(0, diamondsToAdd);
    const levelUpData = checkLevelUp(oldTotalXP, newTotalXP);

    if (diamondsToAdd !== 0) {
      updates.diamonds = increment(diamondsToAdd);
      if (diamondsToAdd > 0) {
        updates.lifetimeDiamonds = increment(diamondsToAdd);
        
        if (user.lastResetDay !== today) {
          updates.dailyDiamonds = diamondsToAdd;
          updates.lastResetDay = today;
        } else {
          updates.dailyDiamonds = increment(diamondsToAdd);
        }

        if (user.lastResetWeek !== thisWeek) {
          updates.weeklyDiamonds = diamondsToAdd;
          updates.lastResetWeek = thisWeek;
        } else {
          updates.weeklyDiamonds = increment(diamondsToAdd);
        }
      }
    }

    if (effectiveXpToAdd !== 0) {
      updates.xp = increment(effectiveXpToAdd);
    }
    
    return { updates, levelUpData };
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    }
  }

  async getAssignment(assignmentId: string): Promise<Assignment | null> {
    try {
      const snap = await getDoc(doc(db, 'assignments', assignmentId));
      return snap.exists() ? { ...snap.data(), id: snap.id } as Assignment : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `assignments/${assignmentId}`);
      return null;
    }
  }

  private assignmentCache: { data: Assignment[], timestamp: number } | null = null;
  private usersCache: { data: User[], timestamp: number } | null = null;
  private CACHE_TTL = 30000; // 30 seconds
  private lastWriteTimes: Map<string, number> = new Map();
  private lastWriteData: Map<string, string> = new Map();
  private writeCounts: Map<string, number> = new Map();
  private totalWrites = 0;
  private MAX_SESSION_WRITES = 500; // Hard stop for a single session to prevent runaway loops from burning daily quota
  private activeListeners = 0;
  private totalListenersCreated = 0;

  private LOG_WRITE(path: string, data?: any) {
    this.totalWrites++;
    const count = (this.writeCounts.get(path) || 0) + 1;
    this.writeCounts.set(path, count);
    
    // Detailed profiling for quota monitoring
    if (this.totalWrites % 5 === 0 || count > 20) {
      const dataPreview = data ? JSON.stringify(data).substring(0, 50) + '...' : 'no-data';
      console.log(`[Firestore Quota Monitor] Total Writes: ${this.totalWrites}/${this.MAX_SESSION_WRITES}, Active Listeners: ${this.activeListeners}`);
      console.log(`[Firestore Path Analysis] Path: ${path} (Count: ${count}). Data: ${dataPreview}`);
    }
    
    if (this.totalWrites >= this.MAX_SESSION_WRITES) {
      console.error(`[CRITICAL] SESSION WRITE CAP REACHED (${this.MAX_SESSION_WRITES}). Blocking further writes to protect daily quota.`);
    }

    if (count > 50) {
      console.warn(`[CRITICAL] Runaway write detected on path: ${path}. Hits: ${count}`);
    }
  }

  private TRACK_LISTENER(path: string) {
    this.activeListeners++;
    this.totalListenersCreated++;
    console.log(`[Firestore Analytics] New Listener on ${path}. Total Active: ${this.activeListeners}, Lifetime: ${this.totalListenersCreated}`);
    
    // If we have too many active listeners, it's a sign of a leak
    if (this.activeListeners > 15) {
      console.warn(`[Firestore Analytics] High number of active listeners detected: ${this.activeListeners}. Possible leak!`);
    }

    const cleanup = () => {
      this.activeListeners--;
      console.log(`[Firestore Analytics] Listener closed on ${path}. Total Active: ${this.activeListeners}`);
    };
    return cleanup;
  }

  private shouldThrottle(path: string, interval: number, data?: any): boolean {
    // Hard stop if session limit reached
    if (this.totalWrites >= this.MAX_SESSION_WRITES) return true;

    const now = Date.now();
    
    // Deduplication: prevent identical writes to the same path
    if (data) {
      const dataStr = JSON.stringify(data);
      if (this.lastWriteData.get(path) === dataStr) {
        // console.debug(`[Firestore] Deduplicated write to ${path}`);
        return true;
      }
      this.lastWriteData.set(path, dataStr);
    }

    const lastWrite = this.lastWriteTimes.get(path) || 0;
    if (now - lastWrite < interval) {
      // console.debug(`[Firestore] Throttled write to ${path}`);
      return true;
    }
    this.lastWriteTimes.set(path, now);
    this.LOG_WRITE(path, data);
    return false;
  }

  async updatePresence(userId: string, presence: 'online' | 'idle' | 'offline'): Promise<void> {
    try {
      // Heartbeat Throttle: 15 minutes (was 5). Saves Quota.
      const throttleInterval = presence === 'offline' ? 0 : 15 * 60 * 1000;
      // We pass { presence } specifically for deduplication to ignore the oscillating timestamp
      if (this.shouldThrottle(`presence/${userId}`, throttleInterval, { presence })) return;

      await updateDoc(doc(db, 'users', userId), {
        presence,
        lastSeen: Date.now()
      });
    } catch (error) {
       // Suppress presence errors to avoid UI noise
    }
  }

  async initializeUser(userId: string, data: Partial<User>): Promise<void> {
    // Consolidated update to set role, luminaId, etc. in one go. Throttle: 24 hours (was 1 hour)
    // Initialization should only happen once per session ideally
    if (this.shouldThrottle(`init/${userId}`, 86400000, data)) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        ...data,
        updatedAt: Date.now()
      });
    } catch (error) {
       console.error("Initialization failed", error);
    }
  }

  async getAllAssignments(): Promise<Assignment[]> {
    const now = Date.now();
    if (this.assignmentCache && (now - this.assignmentCache.timestamp) < this.CACHE_TTL) {
      return this.assignmentCache.data;
    }
    try {
      const q = query(collection(db, 'assignments'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ ...d.data(), id: d.id } as Assignment));
      this.assignmentCache = { data, timestamp: now };
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'assignments');
      return [];
    }
  }

  async createAssignment(data: Omit<Assignment, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'assignments'), data);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'assignments');
      return '';
    }
  }

  async updateAssignment(assignmentId: string, data: Partial<Assignment>): Promise<void> {
    try {
      await updateDoc(doc(db, 'assignments', assignmentId), { ...data, updatedAt: Date.now() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `assignments/${assignmentId}`);
    }
  }

  async deleteAssignment(assignmentId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'assignments', assignmentId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `assignments/${assignmentId}`);
    }
  }

  async getSubmission(submissionId: string): Promise<Submission | null> {
    try {
      const snap = await getDoc(doc(db, 'submissions', submissionId));
      return snap.exists() ? { ...snap.data(), id: snap.id } as Submission : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `submissions/${submissionId}`);
      return null;
    }
  }

  async getAllSubmissions(): Promise<Submission[]> {
    try {
      const q = query(collection(db, 'submissions'), orderBy('submittedAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Submission));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'submissions');
      return [];
    }
  }

  async getAllAssessedSubmissions(): Promise<Submission[]> {
    try {
      const q = query(
        collection(db, 'submissions'),
        where('status', '==', 'assessed'),
        orderBy('submittedAt', 'desc'),
        fsLimit(200)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Submission));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'assessed_submissions');
      return [];
    }
  }

  async processAssessmentRewards(submissionId: string, score: number): Promise<void> {
    try {
      const subSnap = await getDoc(doc(db, 'submissions', submissionId));
      if (!subSnap.exists()) return;
      const sub = subSnap.data() as Submission;
      
      const assignmentSnap = await getDoc(doc(db, 'assignments', sub.assignmentId));
      if (!assignmentSnap.exists()) return;
      const assignment = assignmentSnap.data() as Assignment;

      const batch = writeBatch(db);
      const now = Date.now();
      
      // Calculate reward based on score
      const rewardMultiplier = score / 100;
      const baseReward = assignment.xpReward || 50;
      const finalXp = Math.floor(baseReward * rewardMultiplier);
      const finalCoins = Math.floor((assignment.bonusReward || 100) * rewardMultiplier);

      // Update user
      const userRef = doc(db, 'users', sub.studentId);
      batch.update(userRef, {
        coins: increment(finalCoins),
        xp: increment(finalXp),
        gradedCount: increment(1),
        updatedAt: now
      });

      // Update enrollment
      const enrollmentsSnap = await getDocs(query(
        collection(db, 'enrollments'), 
        where('assignmentId', '==', sub.assignmentId),
        where('studentId', '==', sub.studentId)
      ));

      if (!enrollmentsSnap.empty) {
        batch.update(enrollmentsSnap.docs[0].ref, {
          status: 'graded',
          grade: score,
          rewardEarned: finalCoins,
          updatedAt: now
        });
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `rewards/${submissionId}`);
    }
  }

  async getSubmissionsByAssignment(assignmentId: string): Promise<Submission[]> {
    try {
      const q = query(collection(db, 'submissions'), where('assignmentId', '==', assignmentId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Submission));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'submissions');
      return [];
    }
  }

  async getSubmissionsByStudent(studentId: string): Promise<Submission[]> {
    try {
      const q = query(collection(db, 'submissions'), where('studentId', '==', studentId), orderBy('submittedAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Submission));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'submissions');
      return [];
    }
  }

  async createSubmission(data: Omit<Submission, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'submissions'), data);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'submissions');
      return '';
    }
  }

  async updateSubmission(submissionId: string, data: Partial<Submission>): Promise<void> {
    try {
      await updateDoc(doc(db, 'submissions', submissionId), { ...data, updatedAt: Date.now() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `submissions/${submissionId}`);
    }
  }

  async deleteSubmission(submissionId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'submissions', submissionId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `submissions/${submissionId}`);
    }
  }

  async createTransaction(data: Omit<Transaction, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'transactions'), data);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'transactions');
      return '';
    }
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    try {
      const q1 = query(collection(db, 'transactions'), where('senderId', '==', userId), orderBy('timestamp', 'desc'));
      const q2 = query(collection(db, 'transactions'), where('receiverId', '==', userId), orderBy('timestamp', 'desc'));
      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const trx = [...snap1.docs, ...snap2.docs].map(d => ({ ...d.data(), id: d.id } as Transaction));
      return trx.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
      return [];
    }
  }

  async getAllTransactions(): Promise<Transaction[]> {
    try {
      const q = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Transaction));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
      return [];
    }
  }

  async getUserNotifications(userId: string, limitCount = 20): Promise<Notification[]> {
    try {
      const q = query(
        collection(db, 'notifications'), 
        where('userId', '==', userId), 
        orderBy('createdAt', 'desc'), 
        fsLimit(limitCount)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Notification));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
      return [];
    }
  }

  async createNotification(data: Omit<Notification, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'notifications'), data);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'notifications');
      return '';
    }
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${notificationId}`);
    }
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    try {
      const q = query(collection(db, 'notifications'), where('userId', '==', userId), where('read', '==', false));
      const snap = await getDocs(q);
      if (snap.empty) return;
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.update(doc(db, 'notifications', d.id), { read: true }));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'notifications');
    }
  }

  async clearAllNotifications(userId: string): Promise<void> {
    try {
      const q = query(collection(db, 'notifications'), where('userId', '==', userId));
      const snap = await getDocs(q);
      if (snap.empty) return;
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(doc(db, 'notifications', d.id)));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'notifications');
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notifications/${notificationId}`);
    }
  }

  async getAchievementProgress(userId: string): Promise<Record<string, number>> {
    try {
      const p: Record<string, number> = {};
      const userSnap = await getDoc(doc(db, 'users', userId));
      const user = userSnap.data() as User;
      
      p['wealth'] = user.coins || 0;
      p['shopaholic'] = user.inventory?.length || 0;
      p['streaker'] = user.streak || 0;
      
      // Level calculation
      const { getUserLevelAndXP } = await import('../lib/utils');
      const levelData = getUserLevelAndXP(user);
      p['veteran'] = levelData.currentLevel;

      // Fetch submissions
      const subSnap = await getDocs(query(collection(db, 'submissions'), where('studentId', '==', userId), where('status', '==', 'assessed')));
      p['scholar'] = subSnap.docs.length;

      let perfectCount = 0;
      subSnap.docs.forEach(d => {
         if ((d.data().aiScore || 0) >= 100) perfectCount++;
      });
      p['perfectionist'] = perfectCount;

      // Fetch transactions
      const txSnap = await getDocs(query(collection(db, 'transactions'), where('senderId', '==', userId), where('type', '==', 'transfer')));
      p['socialite'] = txSnap.docs.length;

      return p;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${userId}`);
      return {};
    }
  }

  async claimAchievement(userId: string, achievementId: string, reward: { coins: number, diamonds: number }): Promise<void> {
    try {
      const now = Date.now();
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) throw new Error("User not found");
      const user = userSnap.data() as User;
      
      const batch = writeBatch(db);
      
      const { updates, levelUpData } = this.calculateResourceUpdates(user, reward.diamonds || 0);
      
      batch.update(userRef, {
        ...updates,
        achievements: arrayUnion(achievementId),
        coins: increment(reward.coins),
      });

      this.applyLevelUpNotifications(batch, userId, levelUpData);

      if (reward.coins > 0) {
        const txId = 'tx_achv_' + now;
        batch.set(doc(db, 'transactions', txId), {
          id: txId,
          senderId: 'SYSTEM',
          receiverId: userId,
          amount: Math.round(reward.coins),
          type: 'achievement_reward',
          status: 'completed',
          message: `Claimed Achievement - ${achievementId.replace('_', ' Tier ')}`,
          timestamp: now,
        });
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'achievements');
    }
  }

  subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void): () => void {
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', userId), 
      orderBy('createdAt', 'desc'), 
      fsLimit(50)
    );
    const cleanup = this.TRACK_LISTENER('notifications');
    const unsub = onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Notification)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
    });
    return () => {
      unsub();
      cleanup();
    };
  }

  subscribeToNewNotifications(userId: string, callback: (notification: Notification) => void): () => void {
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', userId), 
      where('read', '==', false),
      orderBy('createdAt', 'desc'), 
      fsLimit(10)
    );
    const cleanup = this.TRACK_LISTENER('notifications/new');
    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          callback({ ...change.doc.data(), id: change.doc.id } as Notification);
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
    });
    return () => {
      unsub();
      cleanup();
    };
  }

  async getInviteCode(code: string): Promise<InviteCode | null> {
    try {
      const q = query(collection(db, 'inviteCodes'), where('code', '==', code), fsLimit(1));
      const snap = await getDocs(q);
      return !snap.empty ? { ...snap.docs[0].data(), id: snap.docs[0].id } as InviteCode : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'inviteCodes');
      return null;
    }
  }

  async getAllInviteCodes(): Promise<InviteCode[]> {
    try {
      const q = query(collection(db, 'inviteCodes'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as InviteCode));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'inviteCodes');
      return [];
    }
  }

  async updateInviteCode(id: string, data: Partial<InviteCode>): Promise<void> {
    try {
      await updateDoc(doc(db, 'inviteCodes', id), { ...data, updatedAt: Date.now() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `inviteCodes/${id}`);
    }
  }

  async saveInviteCode(id: string, data: InviteCode): Promise<void> {
    try {
      await setDoc(doc(db, 'inviteCodes', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `inviteCodes/${id}`);
    }
  }

  async deleteInviteCode(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'inviteCodes', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `inviteCodes/${id}`);
    }
  }

  subscribeToUser(userId: string, callback: (user: User | null) => void): () => void {
    const cleanup = this.TRACK_LISTENER(`users/${userId}`);
    const unsub = onSnapshot(doc(db, 'users', userId), (snap) => {
      if (snap.exists()) {
        callback({ ...snap.data(), id: snap.id } as User);
      } else {
        callback(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}`);
      callback(null);
    });
    return () => {
      unsub();
      cleanup();
    };
  }

  subscribeToStudents(callback: (users: User[]) => void): () => void {
    const q = query(collection(db, 'users'), where('role', '==', 'student'));
    const cleanup = this.TRACK_LISTENER('users/students');
    const unsub = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
      callback(users);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      callback([]);
    });
    return () => {
      unsub();
      cleanup();
    };
  }

  subscribeToAssessedSubmissions(callback: (submissions: Submission[]) => void): () => void {
    const q = query(collection(db, 'submissions'), where('status', '==', 'assessed'));
    const cleanup = this.TRACK_LISTENER('submissions/assessed');
    const unsub = onSnapshot(q, (snapshot) => {
      const submissions = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Submission));
      callback(submissions);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'submissions');
      callback([]);
    });
    return () => {
      unsub();
      cleanup();
    };
  }

  async getRechargeRequests(status?: string): Promise<RechargeRequest[]> {
    try {
      let q = query(collection(db, 'recharge_requests'), orderBy('createdAt', 'desc'));
      if (status) {
        q = query(collection(db, 'recharge_requests'), where('status', '==', status), orderBy('createdAt', 'desc'));
      }
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as RechargeRequest));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'recharge_requests');
      return [];
    }
  }

  async createRechargeRequest(data: Omit<RechargeRequest, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'recharge_requests'), data);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'recharge_requests');
      return '';
    }
  }

  async updateRechargeRequest(id: string, data: Partial<RechargeRequest>): Promise<void> {
    try {
      await updateDoc(doc(db, 'recharge_requests', id), { ...data, updatedAt: Date.now() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `recharge_requests/${id}`);
    }
  }

  async getEnrollmentsByStudent(studentId: string): Promise<Enrollment[]> {
    try {
      const q = query(collection(db, 'enrollments'), where('studentId', '==', studentId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Enrollment));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'enrollments');
      return [];
    }
  }

  async getAllEnrollments(): Promise<Enrollment[]> {
    try {
      const snap = await getDocs(collection(db, 'enrollments'));
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Enrollment));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'enrollments');
      return [];
    }
  }

  async updateEnrollment(id: string, data: Partial<Enrollment>): Promise<void> {
    try {
      await updateDoc(doc(db, 'enrollments', id), { ...data, updatedAt: Date.now() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `enrollments/${id}`);
    }
  }

  async createEnrollment(data: Omit<Enrollment, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'enrollments'), data);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'enrollments');
      return '';
    }
  }

  async deleteEnrollment(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'enrollments', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `enrollments/${id}`);
    }
  }

  async getPlatformSettings(): Promise<PlatformSettings | null> {
    try {
      const snap = await getDoc(doc(db, 'settings', 'global'));
      return snap.exists() ? snap.data() as PlatformSettings : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
      return null;
    }
  }

  async updatePlatformSettings(data: Partial<PlatformSettings>): Promise<void> {
    try {
      await setDoc(doc(db, 'settings', 'global'), data, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/global');
    }
  }

  async getAssignmentTemplates(): Promise<AssignmentTemplate[]> {
    try {
      const snap = await getDocs(collection(db, 'assignment_templates'));
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as AssignmentTemplate));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'assignment_templates');
      return [];
    }
  }

  async createAssignmentTemplate(data: Omit<AssignmentTemplate, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'assignment_templates'), data);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'assignment_templates');
      return '';
    }
  }

  async saveAssignmentTemplate(id: string, data: AssignmentTemplate): Promise<void> {
    try {
      await setDoc(doc(db, 'assignment_templates', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `assignment_templates/${id}`);
    }
  }

  async deleteAssignmentTemplate(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'assignment_templates', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `assignment_templates/${id}`);
    }
  }

  async getPreRegisteredUsers(): Promise<PreRegisteredUser[]> {
    try {
      const snap = await getDocs(collection(db, 'pre_registered_users'));
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as PreRegisteredUser));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'pre_registered_users');
      return [];
    }
  }

  async savePreRegisteredUser(id: string, data: PreRegisteredUser): Promise<void> {
    try {
      await setDoc(doc(db, 'pre_registered_users', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `pre_registered_users/${id}`);
    }
  }

  async deletePreRegisteredUser(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'pre_registered_users', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `pre_registered_users/${id}`);
    }
  }

  async adjustUserBalance(userId: string, amount: number, isPenalty: boolean, adminId: string, reason: string): Promise<void> {
    try {
      const now = Date.now();
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const currentCoins = userSnap.exists() ? (userSnap.data() as User).coins || 0 : 0;

      let val = amount;
      if (isPenalty) {
        const penaltyAmount = Math.min(Math.abs(amount), 50);
        val = -Math.min(penaltyAmount, currentCoins);
      }
      
      const batch = writeBatch(db);
      batch.update(userRef, {
        coins: increment(val),
        updatedAt: now,
        ...(val > 0 ? { vipExp: increment(val) } : {})
      });
      
      const txId = `ADMIN_${now}_${Math.random().toString(36).substring(7)}`;
      batch.set(doc(db, 'transactions', txId), {
        id: txId,
        senderId: isPenalty ? userId : adminId,
        receiverId: isPenalty ? 'SYSTEM' : userId,
        amount: Math.abs(val),
        type: isPenalty ? 'penalty' : 'assignment_reward',
        status: 'completed',
        message: reason,
        timestamp: now,
        utr: 'ADMIN_MANUAL'
      });

      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        id: notifRef.id,
        userId,
        title: val > 0 ? '🎁 Admin Reward' : '⚠️ Wallet Alert',
        message: val > 0 ? `Admin granted you ${val} coins for: ${reason}` : `Penalty applied: Deducted ${Math.abs(val)} coins for: ${reason}. (Capped at 50, Min 0)`,
        type: val > 0 ? 'success' : 'alert',
        read: false,
        createdAt: now
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  }

  async adjustUserDiamonds(userId: string, amount: number, adminId: string, reason: string): Promise<void> {
    try {
      const now = Date.now();
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) throw new Error("User not found");
      const user = userSnap.data() as User;
      
      const batch = writeBatch(db);
      const { updates, levelUpData } = this.calculateResourceUpdates(user, amount);
      
      batch.update(userRef, {
        ...updates,
      });

      this.applyLevelUpNotifications(batch, userId, levelUpData);
      
      const txId = `ADMIN_DIA_${now}_${Math.random().toString(36).substring(7)}`;
      batch.set(doc(db, 'transactions', txId), {
        id: txId,
        senderId: amount < 0 ? userId : adminId,
        receiverId: amount < 0 ? 'SYSTEM' : userId,
        amount: Math.abs(amount),
        type: amount < 0 ? 'penalty' : 'assignment_reward',
        status: 'completed',
        message: reason,
        timestamp: now,
        utr: 'ADMIN_MANUAL_DIAMONDS'
      });

      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        id: notifRef.id,
        userId,
        title: amount > 0 ? '💎 Diamonds Received' : '⚠️ Diamonds Adjusted',
        message: amount > 0 ? `Admin granted you ${amount} diamonds for: ${reason}` : `Admin deducted ${Math.abs(amount)} diamonds. Reason: ${reason}`,
        type: amount > 0 ? 'success' : 'alert',
        read: false,
        createdAt: now
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  }

  async adjustUserXP(userId: string, amount: number, adminId: string, reason: string): Promise<void> {
    try {
      const now = Date.now();
      const batch = writeBatch(db);
      batch.update(doc(db, 'users', userId), { xp: increment(amount), updatedAt: now });
      
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        id: notifRef.id,
        userId,
        title: '✨ XP Boost Received',
        message: `Admin granted you ${amount} XP for: ${reason}`,
        type: 'info',
        read: false,
        createdAt: now
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  }

  async grantGift(userId: string, gift: any, adminId: string, reason: string): Promise<void> {
    try {
      const now = Date.now();
      const batch = writeBatch(db);
      batch.update(doc(db, 'users', userId), {
        inventory: arrayUnion(gift),
        updatedAt: now
      });

      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        id: notifRef.id,
        userId,
        title: '🎁 Item Received',
        message: `Admin granted you ${gift.label}: ${reason}`,
        type: 'success',
        read: false,
        createdAt: now
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  }

  async revokeSubmission(submissionId: string, penalty: number, adminId: string): Promise<void> {
    try {
      const now = Date.now();
      const subSnap = await getDoc(doc(db, 'submissions', submissionId));
      if (!subSnap.exists()) throw new Error("Submission not found");
      const sub = subSnap.data() as Submission;

      const userRef = doc(db, 'users', sub.studentId);
      const userSnap = await getDoc(userRef);
      const currentCoins = userSnap.exists() ? (userSnap.data() as User).coins || 0 : 0;

      const finalPenalty = Math.min(Math.abs(penalty), 50);
      const penaltyToApply = Math.min(finalPenalty, currentCoins);

      const batch = writeBatch(db);

      batch.update(doc(db, 'submissions', submissionId), {
        status: 'rejected',
        aiFeedback: `Submission REVOKED by admin. Penalty applied: ${penaltyToApply} coins.`,
        updatedAt: now
      });

      const enrSnap = await getDocs(query(collection(db, 'enrollments'), where('studentId', '==', sub.studentId), where('assignmentId', '==', sub.assignmentId)));
      if (!enrSnap.empty) {
        batch.update(doc(db, 'enrollments', enrSnap.docs[0].id), { status: 'active', grade: 0, updatedAt: now });
      }

      if (penaltyToApply > 0) {
        batch.update(userRef, { coins: increment(-penaltyToApply), updatedAt: now });
        const txId = `pen_rev_${now}`;
        batch.set(doc(db, 'transactions', txId), {
          id: txId, senderId: sub.studentId, receiverId: 'SYSTEM', amount: penaltyToApply, type: 'penalty', status: 'completed', timestamp: now, message: `Revoke penalty`
        });
      }

      const notifId = `NOTIF_REV_${now}`;
      batch.set(doc(db, 'notifications', notifId), {
        id: notifId, userId: sub.studentId, title: "⚠️ Submission Revoked", message: `Admin revoked your submission. ${penaltyToApply > 0 ? `Penalty of ${penaltyToApply} applied. (Max 50)` : ''}`, type: 'alert', read: false, createdAt: now
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'submissions');
    }
  }

  async grantResubmission(submissionId: string, graceDeadline: number, adminId: string): Promise<void> {
    try {
      const now = Date.now();
      const subSnap = await getDoc(doc(db, 'submissions', submissionId));
      if (!subSnap.exists()) throw new Error("Submission not found");
      const sub = subSnap.data() as Submission;
      const batch = writeBatch(db);

      batch.update(doc(db, 'submissions', submissionId), {
        status: 'rejected',
        aiFeedback: `Admin requested a re-submission. You have 48 hours.`,
        updatedAt: now
      });

      const enrSnap = await getDocs(query(collection(db, 'enrollments'), where('studentId', '==', sub.studentId), where('assignmentId', '==', sub.assignmentId)));
      if (!enrSnap.empty) {
        batch.update(doc(db, 'enrollments', enrSnap.docs[0].id), { status: 'active', graceDeadline, updatedAt: now });
      }

      const notifId = `NOTIF_RES_${now}`;
      batch.set(doc(db, 'notifications', notifId), {
        id: notifId, userId: sub.studentId, title: "Re-submission Requested", message: `Admin requested re-submission. 48-hour grace period granted.`, type: 'info', read: false, createdAt: now
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'submissions');
    }
  }

  async assessSubmission(submissionId: string, score: number, feedback: string, adminId: string): Promise<void> {
    try {
      const now = Date.now();
      const subSnap = await getDoc(doc(db, 'submissions', submissionId));
      if (!subSnap.exists()) throw new Error("Submission not found");
      const sub = subSnap.data() as Submission;
      
      const assSnap = await getDoc(doc(db, 'assignments', sub.assignmentId));
      if (!assSnap.exists()) throw new Error("Assignment not found");
      const assignment = assSnap.data() as Assignment;

      const studentSnap = await getDoc(doc(db, 'users', sub.studentId));
      if (!studentSnap.exists()) throw new Error("Student not found");
      const student = studentSnap.data() as User;

      const enrSnap = await getDocs(query(collection(db, 'enrollments'), where('studentId', '==', sub.studentId), where('assignmentId', '==', sub.assignmentId)));
      let enrollmentId = enrSnap.empty ? null : enrSnap.docs[0].id;
      let enrollmentData = enrSnap.empty ? null : enrSnap.docs[0].data() as Enrollment;
      let graceDeadline = enrollmentData?.graceDeadline;

      // determine grade
      let grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F' = 'F';
      if (score >= 95) grade = 'A+';
      else if (score >= 90) grade = 'A';
      else if (score >= 85) grade = 'B+';
      else if (score >= 80) grade = 'B';
      else if (score >= 70) grade = 'C';
      else if (score >= 60) grade = 'D';

      const batch = writeBatch(db);

      if (grade === 'F') {
        const gdl = now + (48 * 60 * 60 * 1000);
        batch.update(doc(db, 'submissions', submissionId), { aiScore: score, aiFeedback: `[GRADE F - COMPULSORY RETEST REQUIRED] ${feedback}`, status: 'rejected', updatedAt: now });
        if (enrollmentId) batch.update(doc(db, 'enrollments', enrollmentId), { status: 'active', graceDeadline: gdl, updatedAt: now });
        
        // Fail penalty: small XP reduction
        batch.update(doc(db, 'users', student.id), { xp: increment(-20), updatedAt: now });

        batch.set(doc(db, 'notifications', `NOTIF_RETEST_${submissionId}`), {
          id: `NOTIF_RETEST_${submissionId}`, userId: student.id, title: '⚠️ Mission Failed!', message: `You received Grade F for "${assignment.title}". Deducted 20 XP. You MUST retake it within 48h.`, type: 'alert', read: false, createdAt: now
        });
      } else {
        batch.update(doc(db, 'submissions', submissionId), { aiScore: score, aiFeedback: feedback, status: 'assessed', updatedAt: now });
        
        const gradeMultiplier = grade === 'A+' ? 1.0 : grade === 'A' ? 0.8 : grade === 'B+' ? 0.6 : grade === 'B' ? 0.4 : grade === 'C' ? 0.2 : grade === 'D' ? 0.1 : 0;
        
        // Late Penalty: 10% per day late
        const dueDate = graceDeadline || assignment.dueDate;
        const diff = sub.submittedAt - dueDate;
        const daysLate = Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
        const lateMultiplier = Math.max(0.1, 1 - (daysLate * 0.1)); // Minimum 10% reward for any success
        
        const rewardMultiplier = gradeMultiplier * lateMultiplier;
        let bonusEarned = Math.floor(assignment.bonusReward * rewardMultiplier);
        
        // Double Down? (2.5x Reward)
        if (enrollmentData?.isDoubleDown) {
           bonusEarned = Math.floor(bonusEarned * 2.5);
        }

        // --- 30% Platform Tax for Admin Profit ---
        const hasTaxHaven = student.taxHavenUntil && student.taxHavenUntil > now;
        const taxRate = hasTaxHaven ? 0.2 : 0.3; // 10% reduction (30% -> 20%)
        const platformTax = Math.floor(bonusEarned * taxRate);
        bonusEarned = bonusEarned - platformTax;
        // ------------------------------------------

        // Diamonds earned through academic success (Slightly boosted to offset coins)
        const diamondsEarned = Math.floor((score / 5) * (gradeMultiplier)); 

        const gradeXpBonus = grade === 'A+' ? 100 : grade === 'A' ? 75 : grade === 'B+' ? 50 : grade === 'B' ? 25 : 0;
        const baseXP = (assignment.xpReward || (assignment.isBonus ? 100 : 50)) + gradeXpBonus;
        const xpAwarded = (student.xpBoosterUntil && student.xpBoosterUntil > now) ? baseXP * 2 : baseXP;

        if (enrollmentId) batch.update(doc(db, 'enrollments', enrollmentId), { status: 'graded', grade: score, rewardEarned: bonusEarned, updatedAt: now });
        
        const { updates, levelUpData } = this.calculateResourceUpdates(student, diamondsEarned, xpAwarded);

        batch.update(doc(db, 'users', student.id), { 
          ...updates,
          coins: increment(bonusEarned), 
          taxWallet: increment(platformTax),
        });

        this.applyLevelUpNotifications(batch, student.id, levelUpData);

        if (bonusEarned > 0) {
          batch.set(doc(db, 'transactions', `reward_${submissionId}`), {
            id: `reward_${submissionId}`, senderId: 'SYSTEM', receiverId: student.id, amount: bonusEarned, type: 'assignment_reward', status: 'completed', timestamp: now, message: `Reward: ${assignment.title} (Grade ${grade}${daysLate > 0 ? `, ${daysLate}d Late` : ''})`
          });
        }
        
        if (diamondsEarned > 0) {
           const dTxId = `dia_reward_${submissionId}`;
           batch.set(doc(db, 'transactions', dTxId), {
             id: dTxId, senderId: 'SYSTEM', receiverId: student.id, amount: diamondsEarned, currency: 'diamonds', type: 'assignment_reward', status: 'completed', timestamp: now, message: `Diamonds: Academic Success (${grade})`
           });
        }

        batch.set(doc(db, 'notifications', `NOTIF_GRADE_${submissionId}`), {
          id: `NOTIF_GRADE_${submissionId}`, userId: student.id, title: `Mission Rated: ${grade}`, message: `Score: ${score}%. ${bonusEarned > 0 ? `Earnt 🪙${bonusEarned} coins!` : 'Mission completed.'} +${xpAwarded} XP ${diamondsEarned > 0 ? `& 💎${diamondsEarned} Diamonds` : ''}`, type: 'success', read: false, createdAt: now
        });
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'submissions');
    }
  }

  async getRecentAssessedMissions(userId: string, limitCount: number): Promise<{ submission: Submission, assignment: Assignment }[]> {
    const q = query(
      collection(db, 'submissions'),
      where('studentId', '==', userId),
      where('status', '==', 'assessed'),
      orderBy('updatedAt', 'desc'),
      fsLimit(limitCount)
    );
    const snap = await getDocs(q);
    const results: { submission: Submission, assignment: Assignment }[] = [];
    
    for (const d of snap.docs) {
      const sub = { id: d.id, ...d.data() } as Submission;
      const aDoc = await getDoc(doc(db, 'assignments', sub.assignmentId));
      if (aDoc.exists()) {
        results.push({
          submission: sub,
          assignment: { id: aDoc.id, ...aDoc.data() } as Assignment
        });
      }
    }
    return results;
  }

  async sendBroadcastNotification(message: string, adminId: string): Promise<void> {
    try {
      const studentsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
      const batch = writeBatch(db);
      const now = Date.now();
      studentsSnap.docs.forEach(d => {
        const nr = doc(collection(db, 'notifications'));
        batch.set(nr, {
          id: nr.id, userId: d.id, title: '📢 Admin Announcement', message, type: 'alert', read: false, createdAt: now
        });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'notifications');
    }
  }

  async revokeTransaction(transactionId: string, adminId: string): Promise<void> {
    try {
      const txSnap = await getDoc(doc(db, 'transactions', transactionId));
      if (!txSnap.exists()) throw new Error("Transaction not found");
      const tx = txSnap.data() as Transaction;
      if (tx.status === 'revoked') return;

      const batch = writeBatch(db);
      const lowRec = tx.receiverId?.toLowerCase();
      const lowSen = tx.senderId?.toLowerCase();

      if (tx.receiverId && lowRec !== 'system') {
        batch.update(doc(db, 'users', tx.receiverId), { coins: increment(-tx.amount) });
      }
      if (tx.senderId && lowSen !== 'system') {
        batch.update(doc(db, 'users', tx.senderId), { coins: increment(tx.amount) });
      }

      batch.update(doc(db, 'transactions', transactionId), { 
        status: 'revoked',
        revokedAt: Date.now(),
        revokedBy: adminId
      });
      
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `transactions/${transactionId}`);
    }
  }

  async adjustTransactionAmount(transactionId: string, newAmount: number, adminId: string): Promise<void> {
    try {
      const txSnap = await getDoc(doc(db, 'transactions', transactionId));
      if (!txSnap.exists()) throw new Error("Transaction not found");
      const tx = txSnap.data() as Transaction;
      
      const diff = newAmount - tx.amount;
      const batch = writeBatch(db);
      const lowRec = tx.receiverId?.toLowerCase();
      const lowSen = tx.senderId?.toLowerCase();

      if (tx.receiverId && lowRec !== 'system') {
        batch.update(doc(db, 'users', tx.receiverId), { coins: increment(diff) });
      }
      if (tx.senderId && lowSen !== 'system') {
        batch.update(doc(db, 'users', tx.senderId), { coins: increment(-diff) });
      }

      batch.update(doc(db, 'transactions', transactionId), { 
        amount: newAmount,
        updatedAt: Date.now(),
        updatedBy: adminId
      });
      
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `transactions/${transactionId}`);
    }
  }

  async getAllRechargeRequests(): Promise<RechargeRequest[]> {
    const q = query(collection(db, 'recharge_requests'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RechargeRequest));
  }

  async approveRechargeRequest(requestId: string, adminId: string): Promise<void> {
    try {
      const reqRef = doc(db, 'recharge_requests', requestId);
      const reqSnap = await getDoc(reqRef);
      if (!reqSnap.exists()) throw new Error("Request not found");
      const req = reqSnap.data() as RechargeRequest;
      if (req.status !== 'pending') return;

      const userRef = doc(db, 'users', req.studentId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) throw new Error("User not found");
      const userData = userSnap.data() as User;

      const batch = writeBatch(db);

      const newVipExp = (userData.vipExp || 0) + req.coins;
      
      batch.update(userRef, {
        coins: increment(req.coins),
        vipExp: increment(req.coins),
        updatedAt: Date.now()
      });

      batch.update(reqRef, {
        status: 'approved',
        processedAt: Date.now(),
        processedBy: adminId
      });

      const txId = `RECHARGE_${requestId}`;
      batch.set(doc(db, 'transactions', txId), {
        id: txId,
        senderId: 'SYSTEM',
        receiverId: req.studentId,
        amount: req.coins,
        type: 'recharge',
        status: 'completed',
        timestamp: Date.now(),
        message: `Recharge approved`
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `recharge_requests/${requestId}`);
    }
  }

  async rejectRechargeRequest(requestId: string, adminId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'recharge_requests', requestId), {
        status: 'rejected',
        processedAt: Date.now(),
        processedBy: adminId
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `recharge_requests/${requestId}`);
    }
  }

  async runPenaltySweep(assignmentId?: string): Promise<{ penalizedCount: number }> {
    try {
      const now = Date.now();
      let penalizedCount = 0;

      // Fetch dependencies
      const [usersSnap, assignmentsSnap, submissionsSnap, enrollmentsSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
        assignmentId 
          ? getDoc(doc(db, 'assignments', assignmentId)).then(d => d.exists() ? [d] : [])
          : getDocs(query(collection(db, 'assignments'), where('dueDate', '<', now))).then(s => s.docs),
        getDocs(collection(db, 'submissions')),
        getDocs(collection(db, 'enrollments'))
      ]);

      const students = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as User));
      const assignments = assignmentsSnap.map(d => ({ id: d.id, ...d.data() } as Assignment));
      const submissions = submissionsSnap.docs.map(d => d.data() as Submission);
      const enrollments = enrollmentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment));

      let batch = writeBatch(db);
      let opCount = 0;

      for (const a of assignments) {
        if (!a.dueDate || a.dueDate > now) continue;

        const submissionsForA = submissions.filter(s => s.assignmentId === a.id);
        const submittedUserIds = submissionsForA.map(s => s.studentId);

        const targets = students
          .filter(s => !submittedUserIds.includes(s.id))
          .filter(s => a.isGlobal || a.allowedStudents?.includes(s.id));

        for (const s of targets) {
          const enr = enrollments.find(e => e.studentId === s.id && e.assignmentId === a.id);
          if (enr && (enr.status === 'missed' || (enr.graceDeadline && now <= enr.graceDeadline))) continue;

          penalizedCount++;
          const enrId = enr?.id || `enr_pen_${now}_${s.id}_${a.id}`;
          
          let basePenalty = a.penaltyFee || 0;
          if (enr?.isDoubleDown) {
            const hasShield = s.doubleDownShieldUntil && s.doubleDownShieldUntil > now;
            if (hasShield) {
              basePenalty = Math.floor(basePenalty * 1.0); // Penalty is 2x usually, shield makes it 1x (50% refund effectively on the penalty part)
              // Wait, description says "50% stake refund".
              // Double Down penalty is 2x. 1x would be 50% refund.
            } else {
              basePenalty *= 2;
            }
          }
          const finalPenalty = Math.min(basePenalty, 100);
          
          const currentCoins = s.coins || 0;
          const penaltyToApply = Math.min(finalPenalty, currentCoins);
          
          // Update local state to avoid stale balance in next iteration of assignments
          s.coins = (s.coins || 0) - penaltyToApply;

          if (!enr) {
            batch.set(doc(db, 'enrollments', enrId), {
              id: enrId, assignmentId: a.id, studentId: s.id, enrolledAt: now, status: 'missed', rewardEarned: -penaltyToApply, updatedAt: now
            });
          } else {
            batch.update(doc(db, 'enrollments', enrId), { status: 'missed', rewardEarned: -penaltyToApply, updatedAt: now });
          }
          opCount++;

          if (penaltyToApply > 0) {
            batch.update(doc(db, 'users', s.id), {
              coins: increment(-penaltyToApply),
              diamonds: increment(-Math.floor((a.xpReward || 50) * 0.5)),
              updatedAt: now
            });
            opCount++;

            const txId = `tx_pen_${now}_${s.id}_${a.id}`;
            batch.set(doc(db, 'transactions', txId), {
              id: txId, senderId: s.id, receiverId: 'SYSTEM', amount: penaltyToApply, type: 'assignment_penalty', status: 'completed', timestamp: now, message: `Auto-penalty: Missed ${a.title}${enr?.isDoubleDown ? ' (Double Down Failure)' : ''}`
            });
            opCount++;
          }

          if (opCount > 400) {
            await batch.commit();
            batch = writeBatch(db);
            opCount = 0;
          }
        }
      }

      if (opCount > 0) await batch.commit();
      return { penalizedCount };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'penalty_sweep');
      return { penalizedCount: 0 };
    }
  }

  // Syndicate Methods
  async getAllSyndicates(): Promise<Syndicate[]> {
    try {
      const snap = await getDocs(collection(db, 'syndicates'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Syndicate));
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'syndicates');
      return [];
    }
  }

  async createSyndicate(data: Omit<Syndicate, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'syndicates'), data);
      return docRef.id;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'syndicates');
      return '';
    }
  }

  async updateSyndicate(id: string, data: Partial<Syndicate>): Promise<void> {
    try {
      await updateDoc(doc(db, 'syndicates', id), data);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `syndicates/${id}`);
    }
  }

  async checkAndClaimPreRegistration(email: string, userId: string, defaultName: string): Promise<User | null> {
    try {
      const q = query(collection(db, 'pre_registered_users'), where('email', '==', email), where('status', '==', 'pending'));
      const preRegSnapAll = await getDocs(q);
      
      if (preRegSnapAll.empty) return null;

      const preRegSnap = preRegSnapAll.docs[0];
      const preRegData = preRegSnap.data();
      const now = Date.now();

      const newUserInfo: Omit<User, "id"> = {
          email: email,
          name: preRegData.name || defaultName,
          role: preRegData.role || 'student',
          coins: preRegData.coins || 100,
          createdAt: now,
          updatedAt: now,
          inviteCodeUsed: 'PRE_REGISTERED'
      };
      
      await writeBatch(db)
          .set(doc(db, 'users', userId), newUserInfo)
          .update(preRegSnap.ref, { status: 'claimed', claimedAt: now, userId: userId })
          .commit();

      return { id: userId, ...newUserInfo } as User;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
      return null;
    }
  }

  async redeemInviteCode(code: string, userId: string, name: string, email: string): Promise<User> {
    try {
      const codeRef = doc(db, 'inviteCodes', code.trim().toUpperCase());
      const codeSnap = await getDoc(codeRef);

      let codeData: InviteCode;

      if (!codeSnap.exists()) {
        if (code.trim().toUpperCase() === 'TEST') {
          // Hardcoded fallback for 'TEST' code to allow student invites easily
          codeData = {
            id: 'TEST',
            code: 'TEST',
            role: 'student',
            createdBy: 'SYSTEM',
            used: false,
            currentUses: 0,
            maxUses: null,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
        } else {
          throw new Error('Invalid invite code');
        }
      } else {
        codeData = codeSnap.data() as InviteCode;
      }
      
      if (codeData.used || (codeData.maxUses && (codeData.currentUses || 0) >= codeData.maxUses)) {
        throw new Error('This invite code has reached its maximum uses');
      }

      const now = Date.now();
      const newUserInfo: Omit<User, 'id'> = {
        email,
        name,
        role: codeData.role,
        coins: 100,
        diamonds: 0,
        inviteCodeUsed: code.trim(),
        createdAt: now,
        updatedAt: now
      };

      const newCurrentUses = (codeData.currentUses || 0) + 1;
      const isExhausted = codeData.maxUses ? newCurrentUses >= codeData.maxUses : false;

      const batch = writeBatch(db)
        .set(doc(db, 'users', userId), newUserInfo);
        
      if (codeSnap.exists()) {
        batch.update(codeRef, {
          used: isExhausted,
          currentUses: newCurrentUses,
          usedBy: [...(codeData.usedBy || []), userId],
          updatedAt: now
        });
      }

      await batch.commit();

      return { id: userId, ...newUserInfo } as User;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `inviteCodes/${code}`);
      throw error;
    }
  }

  async giftItem(senderId: string, receiverId: string, itemId: string): Promise<void> {
    try {
      const senderRef = doc(db, 'users', senderId);
      const receiverRef = doc(db, 'users', receiverId);
      const now = Date.now();
      
      const senderSnap = await getDoc(senderRef);
      if (!senderSnap.exists()) throw new Error("Sender not found");
      const senderData = senderSnap.data() as User;
      
      const inventory = [...(senderData.inventory || [])];
      const idx = inventory.indexOf(itemId);
      if (idx === -1) throw new Error("Item not found in inventory");
      inventory.splice(idx, 1);
      
      const batch = writeBatch(db);
      batch.update(senderRef, { inventory, updatedAt: now });
      batch.update(receiverRef, { inventory: arrayUnion(itemId), updatedAt: now });
      
      const txId = 'tx_gift_' + now;
      batch.set(doc(db, 'transactions', txId), {
        id: txId,
        senderId,
        receiverId,
        amount: 0,
        itemId,
        type: 'transfer',
        status: 'completed',
        message: `Gifted item`,
        timestamp: now
      });
      
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        id: notifRef.id,
        userId: receiverId,
        title: '🎁 Gift Received!',
        message: `${senderData.name} sent you a gift! Check your inventory.`,
        type: 'success',
        read: false,
        createdAt: now
      });
      
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  }

  async spendCoins(userId: string, amount: number, type: TransactionType, message: string): Promise<void> {
    try {
      if (amount <= 0) throw new Error("Invalid spend amount");
      const now = Date.now();
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) throw new Error("User not found");
      const currentCoins = (userSnap.data() as User).coins || 0;
      
      if (currentCoins < amount) {
        throw new Error("Insufficient coins");
      }

      const batch = writeBatch(db);
      batch.update(userRef, {
        coins: increment(-amount),
        updatedAt: now
      });

      const txId = 'tx_spend_' + now + '_' + Math.random().toString(36).substring(7);
      batch.set(doc(db, 'transactions', txId), {
        id: txId,
        senderId: userId,
        receiverId: 'SYSTEM',
        amount: amount,
        type,
        status: 'completed',
        message,
        timestamp: now
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
    }
  }

  async transferCoins(senderId: string, receiverId: string, amount: number): Promise<void> {
    try {
      if (amount <= 0) throw new Error("Invalid transfer amount");
      const now = Date.now();
      const batch = writeBatch(db);
      
      const senderRef = doc(db, 'users', senderId);
      const receiverRef = doc(db, 'users', receiverId);
      
      const senderSnap = await getDoc(senderRef);
      if (!senderSnap.exists()) throw new Error("Sender not found");
      const sender = senderSnap.data() as User;
      
      // Admins don't spend coins
      const isAdmin = sender.role === 'admin' || sender.role === 'superadmin';
      
      if (!isAdmin && (sender.coins || 0) < amount) {
        throw new Error("Insufficient coins");
      }

      const taxAmount = Math.floor(amount * 0.3);
      const receiveAmount = amount - taxAmount;

      if (!isAdmin) {
        // Gifting earns XP for the sender (10% of amount)
        const xpEarned = Math.floor(amount * 0.1);
        batch.update(senderRef, {
          coins: increment(-amount),
          xp: increment(xpEarned),
          updatedAt: now
        });
        
        if (xpEarned > 0) {
           const xpTxId = 'tx_gift_xp_' + now + Math.random().toString(36).substring(7);
           batch.set(doc(db, 'transactions', xpTxId), {
             id: xpTxId,
             senderId: 'SYSTEM',
             receiverId: senderId,
             amount: xpEarned,
             currency: 'xp',
             type: 'gift',
             status: 'completed',
             message: `XP earned for gifting to ${receiverId}`,
             timestamp: now,
           });
        }
      }

      const receiverSnap = await getDoc(receiverRef);
      if (!receiverSnap.exists()) throw new Error("Receiver not found");
      const receiver = receiverSnap.data() as User;

      const { updates, levelUpData } = this.calculateResourceUpdates(receiver, receiveAmount);

      batch.update(receiverRef, {
        ...updates,
        coins: increment(receiveAmount),
      });

      this.applyLevelUpNotifications(batch, receiver.id, levelUpData);

      // Handle tax
      if (taxAmount > 0) {
        const superAdminQuery = query(collection(db, 'users'), where('role', '==', 'superadmin'));
        const superAdminSnap = await getDocs(superAdminQuery);
        if (!superAdminSnap.empty) {
          const superAdminId = superAdminSnap.docs[0].id;
          batch.update(doc(db, 'users', superAdminId), {
            taxWallet: increment(taxAmount),
            updatedAt: now
          });
          
          const taxTxId = 'tx_tax_' + now + Math.random().toString(36).substring(7);
          batch.set(doc(db, 'transactions', taxTxId), {
            id: taxTxId,
            senderId: senderId,
            receiverId: superAdminId,
            amount: taxAmount,
            type: 'tax' as any,
            status: 'completed',
            timestamp: now,
          });
        }
      }

      const txId = 'tx_trans_' + now + Math.random().toString(36).substring(7);
      batch.set(doc(db, 'transactions', txId), {
        id: txId,
        senderId: senderId,
        receiverId: receiverId,
        amount: receiveAmount,
        type: 'transfer',
        status: 'completed',
        timestamp: now,
      });

      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        id: notifRef.id,
        userId: receiverId,
        title: '💎 Diamonds & Coins Received!',
        message: `You received ${receiveAmount} coins and ${receiveAmount} diamonds!`,
        type: 'success',
        read: false,
        createdAt: now
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  }

  async convertDiamondsToCoins(userId: string, diamondsAmount: number): Promise<void> {
    try {
      if (diamondsAmount <= 0) throw new Error("Invalid conversion amount");
      const now = Date.now();
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) throw new Error("User not found");
      const user = userSnap.data() as User;
      
      const currentDiamonds = user.diamonds || 0;
      if (currentDiamonds < diamondsAmount) throw new Error("Insufficient diamonds");

      const coinsToAdd = Math.floor(diamondsAmount / 7);

      const batch = writeBatch(db);
      batch.update(userRef, {
        diamonds: increment(-diamondsAmount),
        coins: increment(coinsToAdd),
        updatedAt: now
      });

      const txId = 'tx_conv_' + now + '_' + Math.random().toString(36).substring(7);
      batch.set(doc(db, 'transactions', txId), {
        id: txId,
        senderId: userId,
        receiverId: userId,
        amount: diamondsAmount,
        currency: 'diamonds',
        type: 'convert',
        status: 'completed',
        message: 'Converted ' + diamondsAmount + ' diamonds to ' + coinsToAdd + ' coins',
        timestamp: now
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
    }
  }

  async claimCollectorReward(userId: string, coins: number, diamonds: number): Promise<void> {
    try {
      const now = Date.now();
      const userRef = doc(db, 'users', userId);

      // 30% Platform Tax
      const platformTax = Math.floor(coins * 0.3);
      const studentReward = coins - platformTax;
      
      const batch = writeBatch(db);
      const updates: any = {
        lastCollectionTime: now,
        coins: increment(studentReward),
        taxWallet: increment(platformTax),
        updatedAt: now
      };
      
      if (diamonds > 0) {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const user = userSnap.data() as User;
          const { updates: resourceUpdates, levelUpData } = this.calculateResourceUpdates(user, diamonds);
          Object.assign(updates, resourceUpdates);
          this.applyLevelUpNotifications(batch, userId, levelUpData);
        }
      }

      batch.update(userRef, updates);

      const txId = `COL_${now}_${Math.random().toString(36).substring(7)}`;
      batch.set(doc(db, 'transactions', txId), {
        id: txId,
        senderId: 'SYSTEM',
        receiverId: userId,
        amount: coins,
        type: 'daily_reward',
        status: 'completed',
        message: 'Collector Drop',
        timestamp: now
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
    }
  }

  async claimDailyReward(userId: string, reward: { type: string, value: number | string }): Promise<void> {
    try {
      const now = Date.now();
      const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const today = `${nowIST.getFullYear()}-${String(nowIST.getMonth() + 1).padStart(2, '0')}-${String(nowIST.getDate()).padStart(2, '0')}`;
      
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const currentCoins = userSnap.exists() ? (userSnap.data() as User).coins || 0 : 0;

      const batch = writeBatch(db);
      
      const updates: any = {
        lastRewardClaimed: today,
        updatedAt: now
      };

      let finalValue = reward.value;

      if (reward.type === 'coins') {
        updates.coins = increment(reward.value as number);
      } else if (reward.type === 'diamonds') {
        const user = userSnap.data() as User;
        const { updates: resourceUpdates, levelUpData } = this.calculateResourceUpdates(user, reward.value as number);
        Object.assign(updates, resourceUpdates);
        this.applyLevelUpNotifications(batch, user.id, levelUpData);
      } else if (reward.type === 'penalty') {
        const penaltyAmount = Math.min(Math.abs(reward.value as number), 50);
        const penaltyToApply = Math.min(penaltyAmount, currentCoins);
        updates.coins = increment(-penaltyToApply);
        finalValue = penaltyToApply;
      } else if (reward.type === 'xp') {
        updates.xp = increment(reward.value as number);
      } else if (reward.type === 'item') {
        updates.inventory = arrayUnion(reward.value);
      }
      
      batch.update(userRef, updates);

      if (reward.type === 'coins' || reward.type === 'penalty' || reward.type === 'diamonds') {
        const txId = 'tx_rew_' + now;
        batch.set(doc(db, 'transactions', txId), {
          id: txId,
          senderId: reward.type === 'penalty' ? userId : 'SYSTEM',
          receiverId: reward.type === 'penalty' ? 'SYSTEM' : userId,
          amount: Math.abs(finalValue as number),
          type: (reward.type === 'penalty' ? 'penalty' : 'daily_reward') as any,
          status: 'completed',
          message: reward.type === 'penalty' ? 'Daily Drop Penalty (Capped)' : reward.type === 'diamonds' ? 'Daily Drop Diamonds' : 'Daily Drop collect',
          timestamp: now
        });
      }
      
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
    }
  }

  // Social & Presence Methods
  async followUser(followerId: string, targetId: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      const now = Date.now();
      
      batch.update(doc(db, 'users', followerId), { 
        followingIds: arrayUnion(targetId),
        updatedAt: now 
      });
      batch.update(doc(db, 'users', targetId), { 
        followerIds: arrayUnion(followerId),
        updatedAt: now 
      });
      
      const notifId = `NOTIF_FOLLOW_${followerId}_${targetId}_${now}`;
      batch.set(doc(db, 'notifications', notifId), {
        id: notifId,
        userId: targetId,
        title: '👥 New Follower',
        message: 'A peer is now tracking your progress!',
        type: 'info',
        read: false,
        createdAt: now
      });
      
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${followerId}`);
    }
  }

  async unfollowUser(followerId: string, targetId: string): Promise<void> {
    try {
       const batch = writeBatch(db);
       batch.update(doc(db, 'users', followerId), { 
         followingIds: arrayRemove(targetId),
         updatedAt: Date.now() 
       });
       batch.update(doc(db, 'users', targetId), { 
         followerIds: arrayRemove(followerId),
         updatedAt: Date.now() 
       });
       await batch.commit();
    } catch (error) {
       handleFirestoreError(error, OperationType.WRITE, `users/${followerId}`);
    }
  }

  async generateLumoraId(userId: string): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const randomChar = chars.charAt(Math.floor(Math.random() * chars.length));
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const lid = `LMN-${randomChar}${randomNum}`;
    
    // Check if exists
    const q = query(collection(db, 'users'), where('luminaId', '==', lid), fsLimit(1));
    const snap = await getDocs(q);
    if (!snap.empty) return this.generateLumoraId(userId);
    
    await updateDoc(doc(db, 'users', userId), { luminaId: lid });
    return lid;
  }

  async processUserSweep(userId: string): Promise<{ coinsDeducted: number, diamondsDeducted: number }> {
    try {
      const now = Date.now();
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return { coinsDeducted: 0, diamondsDeducted: 0 };
      const user = userSnap.data() as User;

      // Throttle: 6 hours
      const SIX_HOURS = 6 * 60 * 60 * 1000;
      if (user.lastMissedSweep && (now - user.lastMissedSweep) < SIX_HOURS) {
        return { coinsDeducted: 0, diamondsDeducted: 0 };
      }

      const [allAssignments, userEnrollments] = await Promise.all([
        this.getAllAssignments(),
        this.getEnrollmentsByStudent(userId)
      ]);

      const batch = writeBatch(db);
      let totalCoinsPenalty = 0;
      let totalDiamondsPenalty = 0;
      let opCount = 0;

      const relevantAssignments = allAssignments.filter(a => {
        if (a.isGlobal) return true;
        return a.allowedStudents?.includes(userId) || (user.email && a.allowedStudents?.includes(user.email.toLowerCase()));
      });

      for (const a of relevantAssignments) {
        const enr = userEnrollments.find(e => e.assignmentId === a.id);
        if (enr && (enr.status === 'submitted' || enr.status === 'graded')) continue;

        const deadline = enr?.graceDeadline || a.dueDate;
        if (now <= deadline) continue;

        if (!enr && a.isBonus) continue; 
        if (enr && enr.status === 'missed') continue;

        let penalty = a.penaltyFee || 0;
        if (enr?.isDoubleDown) penalty *= 2;
        const finalPenalty = Math.min(penalty, 100);
        const diamondsPenalty = Math.floor((a.xpReward || 50) * 0.5);

        totalCoinsPenalty += finalPenalty;
        totalDiamondsPenalty += diamondsPenalty;

        const enrId = enr?.id || `enr_miss_${now}_${userId}_${a.id}`;
        if (!enr) {
          batch.set(doc(db, 'enrollments', enrId), {
            id: enrId, assignmentId: a.id, studentId: userId, enrolledAt: now, status: 'missed', rewardEarned: -finalPenalty, updatedAt: now
          });
        } else {
          batch.update(doc(db, 'enrollments', enr.id), { status: 'missed', rewardEarned: -finalPenalty, updatedAt: now });
        }
        opCount++;

        const txId = `tx_miss_${now}_${userId}_${a.id}`;
        batch.set(doc(db, 'transactions', txId), {
          id: txId, senderId: userId, receiverId: 'SYSTEM', amount: finalPenalty, type: 'assignment_penalty', status: 'completed', timestamp: now, message: `Missed: ${a.title}`
        });
        opCount++;
        
        if (opCount > 450) {
           break; 
        }
      }

      if (opCount > 0 || totalCoinsPenalty > 0) {
        batch.update(userRef, {
          coins: increment(-Math.min(totalCoinsPenalty, user.coins || 0)),
          diamonds: increment(-totalDiamondsPenalty),
          lastMissedSweep: now,
          updatedAt: now
        });
        await batch.commit();
      } else {
        await updateDoc(userRef, { lastMissedSweep: now, updatedAt: now });
      }

      return { coinsDeducted: totalCoinsPenalty, diamondsDeducted: totalDiamondsPenalty };
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'user_sweep');
      return { coinsDeducted: 0, diamondsDeducted: 0 };
    }
  }
}
