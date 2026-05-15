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
  arrayUnion
} from 'firebase/firestore';
import { db } from './firebase';
import { IDatabaseService } from './dbInterface';
import { User, Assignment, Submission, Transaction, Notification, InviteCode, RechargeRequest, Enrollment, PlatformSettings, AssignmentTemplate, PreRegisteredUser, TransactionType } from '../types';
import { handleFirestoreError, OperationType } from '../lib/errorHandling';

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
    try {
      const snap = await getDocs(collection(db, 'users'));
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as User));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
      return [];
    }
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

  async getAllAssignments(): Promise<Assignment[]> {
    try {
      const q = query(collection(db, 'assignments'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Assignment));
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
      const currentXP = user.xp || 0;
      const currentLevel = Math.floor(Math.sqrt(currentXP / 100)) + 1;
      p['veteran'] = currentLevel;

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

  async claimAchievement(userId: string, achievementId: string, reward: { coins: number, xp: number }): Promise<void> {
    try {
      const now = Date.now();
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', userId);
      
      batch.update(userRef, {
        achievements: arrayUnion(achievementId),
        coins: increment(reward.coins),
        xp: increment(reward.xp),
        updatedAt: now
      });

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
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Notification)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
    });
  }

  subscribeToNewNotifications(userId: string, callback: (notification: Notification) => void): () => void {
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', userId), 
      where('read', '==', false),
      orderBy('createdAt', 'desc'), 
      fsLimit(10)
    );
    return onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          callback({ ...change.doc.data(), id: change.doc.id } as Notification);
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
    });
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
    return onSnapshot(doc(db, 'users', userId), (snap) => {
      if (snap.exists()) {
        callback({ ...snap.data(), id: snap.id } as User);
      } else {
        callback(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}`);
      callback(null);
    });
  }

  subscribeToStudents(callback: (users: User[]) => void): () => void {
    const q = query(collection(db, 'users'), where('role', '==', 'student'));
    return onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
      callback(users);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      callback([]);
    });
  }

  subscribeToAssessedSubmissions(callback: (submissions: Submission[]) => void): () => void {
    const q = query(collection(db, 'submissions'), where('status', '==', 'assessed'));
    return onSnapshot(q, (snapshot) => {
      const submissions = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Submission));
      callback(submissions);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'submissions');
      callback([]);
    });
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

  async adjustUserXP(userId: string, amount: number, adminId: string, reason: string): Promise<void> {
    try {
      const now = Date.now();
      const batch = writeBatch(db);
      batch.update(doc(db, 'users', userId), { xp: increment(amount), updatedAt: now });
      
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        id: notifRef.id,
        userId,
        title: '⚡ XP Boost Received',
        message: `Admin granted you ${amount} bonus XP for: ${reason}`,
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
      let graceDeadline = enrSnap.empty ? null : enrSnap.docs[0].data().graceDeadline;

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
        batch.set(doc(db, 'notifications', `NOTIF_RETEST_${submissionId}`), {
          id: `NOTIF_RETEST_${submissionId}`, userId: student.id, title: '⚠️ Compulsory Retest Required!', message: `You received Grade F for "${assignment.title}". You MUST retake it. 48h grace period.`, type: 'info', read: false, createdAt: now
        });
      } else {
        batch.update(doc(db, 'submissions', submissionId), { aiScore: score, aiFeedback: feedback, status: 'assessed', updatedAt: now });
        
        const multiplier = grade === 'A+' ? 1.2 : grade === 'A' ? 1.0 : grade === 'B+' ? 0.9 : grade === 'B' ? 0.8 : grade === 'C' ? 0.5 : 0;
        const isLate = graceDeadline ? (sub.submittedAt > graceDeadline) : (sub.submittedAt > assignment.dueDate);
        let bonusEarned = (!isLate && multiplier > 0) ? Math.floor(assignment.bonusReward * multiplier) : 0;
        
        const baseXP = assignment.xpReward || (assignment.isBonus ? 100 : 50);
        const xpToAward = (student.xpBoosterUntil && student.xpBoosterUntil > now) ? baseXP * 2 : baseXP;

        if (enrollmentId) batch.update(doc(db, 'enrollments', enrollmentId), { status: 'graded', grade: score, rewardEarned: bonusEarned, updatedAt: now });
        
        batch.update(doc(db, 'users', student.id), { coins: increment(bonusEarned), xp: increment(xpToAward), updatedAt: now });

        if (bonusEarned > 0) {
          batch.set(doc(db, 'transactions', `reward_${submissionId}`), {
            id: `reward_${submissionId}`, senderId: 'SYSTEM', receiverId: student.id, amount: bonusEarned, type: 'assignment_reward', status: 'completed', timestamp: now, message: `Reward: ${assignment.title} (Grade ${grade})`
          });
        }

        batch.set(doc(db, 'notifications', `NOTIF_GRADE_${submissionId}`), {
          id: `NOTIF_GRADE_${submissionId}`, userId: student.id, title: `Assignment Graded: ${grade}`, message: `Your submission for "${assignment.title}" scored ${score}%. ${bonusEarned > 0 ? `Earned 🪙${bonusEarned} coins!` : 'Mission completed.'}`, type: 'success', read: false, createdAt: now
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
          
          const finalPenalty = Math.min(a.penaltyFee || 0, 50);
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
              xp: increment(-Math.floor((a.xpReward || 50) * 0.5)),
              updatedAt: now
            });
            opCount++;

            const txId = `tx_pen_${now}_${s.id}_${a.id}`;
            batch.set(doc(db, 'transactions', txId), {
              id: txId, senderId: s.id, receiverId: 'SYSTEM', amount: penaltyToApply, type: 'assignment_penalty', status: 'completed', timestamp: now, message: `Auto-penalty: Missed ${a.title} (Capped at 50)`
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

      if (!codeSnap.exists()) throw new Error('Invalid invite code');

      const codeData = codeSnap.data() as InviteCode;
      
      if (codeData.used || (codeData.maxUses && (codeData.currentUses || 0) >= codeData.maxUses)) {
        throw new Error('This invite code has reached its maximum uses');
      }

      const now = Date.now();
      const newUserInfo: Omit<User, 'id'> = {
        email,
        name,
        role: codeData.role,
        coins: 100,
        inviteCodeUsed: code.trim(),
        createdAt: now,
        updatedAt: now
      };

      const newCurrentUses = (codeData.currentUses || 0) + 1;
      const isExhausted = codeData.maxUses ? newCurrentUses >= codeData.maxUses : false;

      await writeBatch(db)
        .set(doc(db, 'users', userId), newUserInfo)
        .update(codeRef, {
          used: isExhausted,
          currentUses: newCurrentUses,
          usedBy: [...(codeData.usedBy || []), userId],
          updatedAt: now
        })
        .commit();

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
        batch.update(senderRef, {
          coins: increment(-amount),
          xp: increment(amount),
          updatedAt: now
        });
      }

      batch.update(receiverRef, {
        diamonds: increment(receiveAmount),
        updatedAt: now
      });

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

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  }

  async convertDiamondsToCoins(userId: string, diamondsAmount: number): Promise<void> {
    try {
      const now = Date.now();
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) throw new Error("User not found");
      const user = userSnap.data() as User;
      
      const currentDiamonds = user.diamonds || 0;
      if (currentDiamonds < diamondsAmount) throw new Error("Insufficient diamonds");

      const coinsToAdd = diamondsAmount * 0.7;

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
        type: 'transfer',
        status: 'completed',
        message: 'Converted ' + diamondsAmount + ' diamonds to ' + coinsToAdd + ' coins',
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

      if (reward.type === 'coins' || reward.type === 'penalty') {
        const txId = 'tx_rew_' + now;
        batch.set(doc(db, 'transactions', txId), {
          id: txId,
          senderId: reward.type === 'penalty' ? userId : 'SYSTEM',
          receiverId: reward.type === 'penalty' ? 'SYSTEM' : userId,
          amount: Math.abs(finalValue as number),
          type: (reward.type === 'penalty' ? 'penalty' : 'daily_reward') as any,
          status: 'completed',
          message: reward.type === 'penalty' ? 'Daily Drop Penalty (Capped)' : 'Daily Drop collect',
          timestamp: now
        });
      }
      
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
    }
  }
}
