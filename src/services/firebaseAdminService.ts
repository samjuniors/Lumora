import admin from 'firebase-admin';
import { IDatabaseService } from './dbInterface';
import { User, Assignment, Submission, Transaction, Notification, InviteCode, RechargeRequest, Enrollment, PlatformSettings, AssignmentTemplate, PreRegisteredUser, TransactionType } from '../types';

export class FirebaseAdminService implements IDatabaseService {
  private db = admin.firestore();

  async getUser(userId: string): Promise<User | null> {
    const snap = await this.db.collection('users').doc(userId).get();
    return snap.exists ? snap.data() as User : null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const snap = await this.db.collection('users').where('email', '==', email).limit(1).get();
    return !snap.empty ? snap.docs[0].data() as User : null;
  }

  async updateUser(userId: string, data: Partial<User>): Promise<void> {
    await this.db.collection('users').doc(userId).update({ ...data, updatedAt: Date.now() });
  }

  async createUser(userId: string, data: User): Promise<void> {
    await this.db.collection('users').doc(userId).set(data);
  }

  async getUsersByRole(role: string): Promise<User[]> {
    const snap = await this.db.collection('users').where('role', '==', role).get();
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as User));
  }

  async getAllUsers(): Promise<User[]> {
    const snap = await this.db.collection('users').get();
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as User));
  }

  async deleteUser(userId: string): Promise<void> {
    await this.db.collection('users').doc(userId).delete();
  }

  async getAssignment(assignmentId: string): Promise<Assignment | null> {
    const snap = await this.db.collection('assignments').doc(assignmentId).get();
    return snap.exists ? { ...snap.data(), id: snap.id } as Assignment : null;
  }

  async getAllAssignments(): Promise<Assignment[]> {
    const snap = await this.db.collection('assignments').orderBy('createdAt', 'desc').get();
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Assignment));
  }

  async createAssignment(data: Omit<Assignment, 'id'>): Promise<string> {
    const res = await this.db.collection('assignments').add(data);
    return res.id;
  }

  async updateAssignment(assignmentId: string, data: Partial<Assignment>): Promise<void> {
    await this.db.collection('assignments').doc(assignmentId).update({ ...data, updatedAt: Date.now() });
  }

  async deleteAssignment(assignmentId: string): Promise<void> {
    await this.db.collection('assignments').doc(assignmentId).delete();
  }

  async getSubmission(submissionId: string): Promise<Submission | null> {
    const snap = await this.db.collection('submissions').doc(submissionId).get();
    return snap.exists ? { ...snap.data(), id: snap.id } as Submission : null;
  }

  async getAllSubmissions(): Promise<Submission[]> {
    const snap = await this.db.collection('submissions').orderBy('submittedAt', 'desc').get();
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Submission));
  }

  async getSubmissionsByAssignment(assignmentId: string): Promise<Submission[]> {
    const snap = await this.db.collection('submissions').where('assignmentId', '==', assignmentId).get();
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Submission));
  }

  async getSubmissionsByStudent(studentId: string): Promise<Submission[]> {
    const snap = await this.db.collection('submissions').where('studentId', '==', studentId).orderBy('submittedAt', 'desc').get();
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Submission));
  }

  async createSubmission(data: Omit<Submission, 'id'>): Promise<string> {
    const res = await this.db.collection('submissions').add(data);
    return res.id;
  }

  async updateSubmission(submissionId: string, data: Partial<Submission>): Promise<void> {
    await this.db.collection('submissions').doc(submissionId).update({ ...data, updatedAt: Date.now() });
  }

  async deleteSubmission(submissionId: string): Promise<void> {
    await this.db.collection('submissions').doc(submissionId).delete();
  }

  async createTransaction(data: Omit<Transaction, 'id'>): Promise<string> {
    const res = await this.db.collection('transactions').add(data);
    return res.id;
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    const [snap1, snap2] = await Promise.all([
      this.db.collection('transactions').where('senderId', '==', userId).orderBy('timestamp', 'desc').get(),
      this.db.collection('transactions').where('receiverId', '==', userId).orderBy('timestamp', 'desc').get()
    ]);
    const trx = [...snap1.docs, ...snap2.docs].map(d => ({ ...d.data(), id: d.id } as Transaction));
    return trx.sort((a, b) => b.timestamp - a.timestamp);
  }

  async getAllTransactions(): Promise<Transaction[]> {
    const snap = await this.db.collection('transactions').orderBy('timestamp', 'desc').get();
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Transaction));
  }

  async getUserNotifications(userId: string, limitCount = 20): Promise<Notification[]> {
    const snap = await this.db.collection('notifications').where('userId', '==', userId).orderBy('createdAt', 'desc').limit(limitCount).get();
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Notification));
  }

  async createNotification(data: Omit<Notification, 'id'>): Promise<string> {
    const res = await this.db.collection('notifications').add(data);
    return res.id;
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    await this.db.collection('notifications').doc(notificationId).update({ read: true });
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    const snap = await this.db.collection('notifications').where('userId', '==', userId).where('read', '==', false).get();
    if (snap.empty) return;
    const batch = this.db.batch();
    snap.docs.forEach(d => batch.update(d.ref, { read: true }));
    await batch.commit();
  }

  async clearAllNotifications(userId: string): Promise<void> {
    const snap = await this.db.collection('notifications').where('userId', '==', userId).get();
    if (snap.empty) return;
    const batch = this.db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await this.db.collection('notifications').doc(notificationId).delete();
  }

  async getAchievementProgress(userId: string): Promise<Record<string, number>> {
    const p: Record<string, number> = {};
    const userSnap = await this.db.collection('users').doc(userId).get();
    if (!userSnap.exists) return {};
    const user = userSnap.data() as User;
    
    p['wealth'] = user.coins || 0;
    p['shopaholic'] = user.inventory?.length || 0;
    p['streaker'] = user.streak || 0;
    
    const currentXP = user.xp || 0;
    const currentLevel = Math.floor(Math.sqrt(currentXP / 100)) + 1;
    p['veteran'] = currentLevel;

    const subSnap = await this.db.collection('submissions').where('studentId', '==', userId).where('status', '==', 'assessed').get();
    p['scholar'] = subSnap.docs.length;

    let perfectCount = 0;
    subSnap.docs.forEach(d => {
       if ((d.data().aiScore || 0) >= 100) perfectCount++;
    });
    p['perfectionist'] = perfectCount;

    const txSnap = await this.db.collection('transactions').where('senderId', '==', userId).where('type', '==', 'transfer').get();
    p['socialite'] = txSnap.docs.length;

    return p;
  }

  async claimAchievement(userId: string, achievementId: string, reward: { coins: number, xp: number }): Promise<void> {
    const now = Date.now();
    const batch = this.db.batch();
    const userRef = this.db.collection('users').doc(userId);
    
    batch.update(userRef, {
      achievements: admin.firestore.FieldValue.arrayUnion(achievementId),
      coins: admin.firestore.FieldValue.increment(reward.coins),
      xp: admin.firestore.FieldValue.increment(reward.xp),
      updatedAt: now
    });

    if (reward.coins > 0) {
      const txId = 'tx_achv_' + now;
      batch.set(this.db.collection('transactions').doc(txId), {
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
  }

  subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void): () => void {
    const unsub = this.db.collection('notifications')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .onSnapshot(snapshot => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Notification)));
      });
    return unsub;
  }

  subscribeToNewNotifications(userId: string, callback: (notification: Notification) => void): () => void {
    const unsub = this.db.collection('notifications')
      .where('userId', '==', userId)
      .where('read', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            callback({ ...change.doc.data(), id: change.doc.id } as Notification);
          }
        });
      });
    return unsub;
  }

  async getInviteCode(code: string): Promise<InviteCode | null> {
    const snap = await this.db.collection('inviteCodes').where('code', '==', code).limit(1).get();
    return !snap.empty ? { ...snap.docs[0].data(), id: snap.docs[0].id } as InviteCode : null;
  }

  async getAllInviteCodes(): Promise<InviteCode[]> {
    const snap = await this.db.collection('inviteCodes').orderBy('createdAt', 'desc').get();
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as InviteCode));
  }

  async updateInviteCode(id: string, data: Partial<InviteCode>): Promise<void> {
    await this.db.collection('inviteCodes').doc(id).update({ ...data, updatedAt: Date.now() });
  }

  async saveInviteCode(id: string, data: InviteCode): Promise<void> {
    await this.db.collection('inviteCodes').doc(id).set(data);
  }

  async deleteInviteCode(id: string): Promise<void> {
    await this.db.collection('inviteCodes').doc(id).delete();
  }

  subscribeToUser(userId: string, callback: (user: User | null) => void): () => void {
    return this.db.collection('users').doc(userId).onSnapshot(snap => {
      if (snap.exists) {
        callback({ ...snap.data(), id: snap.id } as User);
      } else {
        callback(null);
      }
    });
  }

  subscribeToStudents(callback: (users: User[]) => void): () => void {
    return this.db.collection('users').where('role', '==', 'student').onSnapshot(snap => {
      callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as User)));
    });
  }

  subscribeToAssessedSubmissions(callback: (submissions: Submission[]) => void): () => void {
    return this.db.collection('submissions').where('status', '==', 'assessed').onSnapshot(snap => {
      callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as Submission)));
    });
  }

  async getRechargeRequests(status?: string): Promise<RechargeRequest[]> {
    let q = this.db.collection('recharge_requests').orderBy('createdAt', 'desc');
    if (status) q = q.where('status', '==', status) as any;
    const snap = await q.get();
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as RechargeRequest));
  }

  async createRechargeRequest(data: Omit<RechargeRequest, 'id'>): Promise<string> {
    const res = await this.db.collection('recharge_requests').add(data);
    return res.id;
  }

  async updateRechargeRequest(id: string, data: Partial<RechargeRequest>): Promise<void> {
    await this.db.collection('recharge_requests').doc(id).update({ ...data, updatedAt: Date.now() });
  }

  async getEnrollmentsByStudent(studentId: string): Promise<Enrollment[]> {
    const snap = await this.db.collection('enrollments').where('studentId', '==', studentId).get();
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Enrollment));
  }

  async getAllEnrollments(): Promise<Enrollment[]> {
    const snap = await this.db.collection('enrollments').get();
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Enrollment));
  }

  async updateEnrollment(id: string, data: Partial<Enrollment>): Promise<void> {
    await this.db.collection('enrollments').doc(id).update({ ...data, updatedAt: Date.now() });
  }

  async createEnrollment(data: Omit<Enrollment, 'id'>): Promise<string> {
    const res = await this.db.collection('enrollments').add(data);
    return res.id;
  }

  async deleteEnrollment(id: string): Promise<void> {
    await this.db.collection('enrollments').doc(id).delete();
  }

  async getPlatformSettings(): Promise<PlatformSettings | null> {
    const snap = await this.db.collection('settings').doc('global').get();
    return snap.exists ? snap.data() as PlatformSettings : null;
  }

  async updatePlatformSettings(data: Partial<PlatformSettings>): Promise<void> {
    await this.db.collection('settings').doc('global').set(data, { merge: true });
  }

  async getAssignmentTemplates(): Promise<AssignmentTemplate[]> {
    const snap = await this.db.collection('assignment_templates').get();
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as AssignmentTemplate));
  }

  async createAssignmentTemplate(data: Omit<AssignmentTemplate, 'id'>): Promise<string> {
    const res = await this.db.collection('assignment_templates').add(data);
    return res.id;
  }

  async saveAssignmentTemplate(id: string, data: AssignmentTemplate): Promise<void> {
    await this.db.collection('assignment_templates').doc(id).set(data);
  }

  async deleteAssignmentTemplate(id: string): Promise<void> {
    await this.db.collection('assignment_templates').doc(id).delete();
  }

  async getPreRegisteredUsers(): Promise<PreRegisteredUser[]> {
    const snap = await this.db.collection('pre_registered_users').get();
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as PreRegisteredUser));
  }

  async savePreRegisteredUser(id: string, data: PreRegisteredUser): Promise<void> {
    await this.db.collection('pre_registered_users').doc(id).set(data);
  }

  async deletePreRegisteredUser(id: string): Promise<void> {
    await this.db.collection('pre_registered_users').doc(id).delete();
  }

  async adjustUserBalance(userId: string, amount: number, isPenalty: boolean, adminId: string, reason: string): Promise<void> {
    const now = Date.now();
    const batch = this.db.batch();
    const userRef = this.db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    const currentCoins = userSnap.exists ? (userSnap.data() as User).coins || 0 : 0;

    let val = amount;
    if (isPenalty) {
      const penaltyAmount = Math.min(Math.abs(amount), 50);
      val = -Math.min(penaltyAmount, currentCoins);
    }
    
    batch.update(userRef, {
      coins: admin.firestore.FieldValue.increment(val),
      updatedAt: now,
      ...(val > 0 ? { vipExp: admin.firestore.FieldValue.increment(val) } : {})
    });
    
    const txId = `ADMIN_${now}_${Math.random().toString(36).substring(7)}`;
    batch.set(this.db.collection('transactions').doc(txId), {
      id: txId, senderId: isPenalty ? userId : adminId, receiverId: isPenalty ? 'SYSTEM' : userId, amount: Math.abs(val), type: isPenalty ? 'penalty' : 'assignment_reward', status: 'completed', message: reason, timestamp: now, utr: 'ADMIN_MANUAL'
    });

    const nr = this.db.collection('notifications').doc();
    batch.set(nr, { id: nr.id, userId, title: val > 0 ? '🎁 Admin Reward' : '⚠️ Wallet Alert', message: val > 0 ? `Admin granted you ${val} coins for: ${reason}` : `Penalty applied: Deducted ${Math.abs(val)} coins for: ${reason}. (Note: Penalties are capped at 50 coins and balance cannot go below 0)`, type: val > 0 ? 'success' : 'alert', read: false, createdAt: now });
    await batch.commit();
  }

  async adjustUserXP(userId: string, amount: number, adminId: string, reason: string): Promise<void> {
    const now = Date.now();
    const batch = this.db.batch();
    batch.update(this.db.collection('users').doc(userId), { xp: admin.firestore.FieldValue.increment(amount), updatedAt: now });
    const nr = this.db.collection('notifications').doc();
    batch.set(nr, { id: nr.id, userId, title: '⚡ XP Boost Received', message: `Admin granted you ${amount} bonus XP for: ${reason}`, type: 'info', read: false, createdAt: now });
    await batch.commit();
  }

  async grantGift(userId: string, gift: any, adminId: string, reason: string): Promise<void> {
    const now = Date.now();
    const batch = this.db.batch();
    batch.update(this.db.collection('users').doc(userId), { inventory: admin.firestore.FieldValue.arrayUnion(gift), updatedAt: now });
    const nr = this.db.collection('notifications').doc();
    batch.set(nr, { id: nr.id, userId, title: '🎁 Item Received', message: `Admin granted you ${gift.label}: ${reason}`, type: 'success', read: false, createdAt: now });
    await batch.commit();
  }

  async revokeSubmission(submissionId: string, penalty: number, adminId: string): Promise<void> {
    const now = Date.now();
    const subRef = this.db.collection('submissions').doc(submissionId);
    const subSnap = await subRef.get();
    if (!subSnap.exists) throw new Error("Submission not found");
    const sub = subSnap.data() as Submission;
    
    const userRef = this.db.collection('users').doc(sub.studentId);
    const userSnap = await userRef.get();
    const currentCoins = userSnap.exists ? (userSnap.data() as User).coins || 0 : 0;
    
    const batch = this.db.batch();

    const finalPenalty = Math.min(Math.abs(penalty), 50);
    const penaltyToApply = Math.min(finalPenalty, currentCoins);

    batch.update(subRef, { status: 'rejected', aiFeedback: `Submission REVOKED by admin. Penalty applied: ${penaltyToApply} coins.`, updatedAt: now });
    const enrSnap = await this.db.collection('enrollments').where('studentId', '==', sub.studentId).where('assignmentId', '==', sub.assignmentId).get();
    if (!enrSnap.empty) batch.update(enrSnap.docs[0].ref, { status: 'active', grade: 0, updatedAt: now });

    if (penaltyToApply > 0) {
      batch.update(userRef, { coins: admin.firestore.FieldValue.increment(-penaltyToApply), updatedAt: now });
      const txId = `pen_rev_${now}`;
      batch.set(this.db.collection('transactions').doc(txId), { id: txId, senderId: sub.studentId, receiverId: 'SYSTEM', amount: penaltyToApply, type: 'penalty', status: 'completed', timestamp: now, message: `Revoke penalty` });
    }
    const nid = `NR_${now}`;
    batch.set(this.db.collection('notifications').doc(nid), { id: nid, userId: sub.studentId, title: "⚠️ Submission Revoked", message: `Admin revoked your submission. ${penaltyToApply > 0 ? `Penalty of ${penaltyToApply} applied. (Max 50)` : ''}`, type: 'alert', read: false, createdAt: now });
    await batch.commit();
  }

  async grantResubmission(submissionId: string, graceDeadline: number, adminId: string): Promise<void> {
    const now = Date.now();
    const subRef = this.db.collection('submissions').doc(submissionId);
    const subSnap = await subRef.get();
    if (!subSnap.exists) throw new Error("Submission not found");
    const sub = subSnap.data() as Submission;
    const batch = this.db.batch();

    batch.update(subRef, { status: 'rejected', aiFeedback: `Admin requested a re-submission. You have 48 hours.`, updatedAt: now });
    const enrSnap = await this.db.collection('enrollments').where('studentId', '==', sub.studentId).where('assignmentId', '==', sub.assignmentId).get();
    if (!enrSnap.empty) batch.update(enrSnap.docs[0].ref, { status: 'active', graceDeadline, updatedAt: now });

    const nid = `NR_RES_${now}`;
    batch.set(this.db.collection('notifications').doc(nid), { id: nid, userId: sub.studentId, title: "Re-submission Requested", message: `Admin requested re-submission. 48-hour grace period granted.`, type: 'info', read: false, createdAt: now });
    await batch.commit();
  }

  async assessSubmission(submissionId: string, score: number, feedback: string, adminId: string): Promise<void> {
    const now = Date.now();
    const subRef = this.db.collection('submissions').doc(submissionId);
    const subSnap = await subRef.get();
    if (!subSnap.exists) throw new Error("Submission not found");
    const sub = subSnap.data() as Submission;
    
    const assRef = this.db.collection('assignments').doc(sub.assignmentId);
    const assSnap = await assRef.get();
    const studentRef = this.db.collection('users').doc(sub.studentId);
    const studentSnap = await studentRef.get();
    
    if (!assSnap.exists || !studentSnap.exists) throw new Error("Data missing");
    const assignment = assSnap.data() as Assignment;
    const student = studentSnap.data() as User;

    const enrSnap = await this.db.collection('enrollments').where('studentId', '==', sub.studentId).where('assignmentId', '==', sub.assignmentId).get();
    let grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F' = 'F';
    if (score >= 95) grade = 'A+';
    else if (score >= 90) grade = 'A';
    else if (score >= 85) grade = 'B+';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';

    const batch = this.db.batch();
    if (grade === 'F') {
      const gdl = now + 172800000;
      batch.update(subRef, { aiScore: score, aiFeedback: `[GRADE F] ${feedback}`, status: 'rejected', updatedAt: now });
      if (!enrSnap.empty) batch.update(enrSnap.docs[0].ref, { status: 'active', graceDeadline: gdl, updatedAt: now });
      const nid = `RETEST_${submissionId}`;
      batch.set(this.db.collection('notifications').doc(nid), { id: nid, userId: studentRef.id, title: '⚠️ Compulsory Retest Required!', message: `You received Grade F for "${assignment.title}". Retake required.`, type: 'info', read: false, createdAt: now });
    } else {
      batch.update(subRef, { aiScore: score, aiFeedback: feedback, status: 'assessed', updatedAt: now });
      const mult = grade === 'A+' ? 1.2 : grade === 'A' ? 1.0 : grade === 'B+' ? 0.9 : grade === 'B' ? 0.8 : grade === 'C' ? 0.5 : 0;
      const gd = !enrSnap.empty ? enrSnap.docs[0].data().graceDeadline : null;
      const isLate = gd ? sub.submittedAt > gd : sub.submittedAt > assignment.dueDate;
      const bonus = (!isLate && mult > 0) ? Math.floor(assignment.bonusReward * mult) : 0;
      const xp = (student.xpBoosterUntil && student.xpBoosterUntil > now) ? (assignment.xpReward || 50) * 2 : (assignment.xpReward || 50);

      if (!enrSnap.empty) batch.update(enrSnap.docs[0].ref, { status: 'graded', grade: score, rewardEarned: bonus, updatedAt: now });
      batch.update(studentRef, { coins: admin.firestore.FieldValue.increment(bonus), xp: admin.firestore.FieldValue.increment(xp), updatedAt: now });
      if (bonus > 0) {
        batch.set(this.db.collection('transactions').doc(`REWARD_${submissionId}`), { id: `REWARD_${submissionId}`, senderId: 'SYSTEM', receiverId: studentRef.id, amount: bonus, type: 'assignment_reward', status: 'completed', timestamp: now, message: `Reward: ${assignment.title}` });
      }
      const nid = `GRADE_${submissionId}`;
      batch.set(this.db.collection('notifications').doc(nid), { id: nid, userId: studentRef.id, title: `Graded: ${grade}`, message: `${assignment.title} score: ${score}%. ${bonus > 0 ? `Earned ${bonus} coins!` : ''}`, type: 'success', read: false, createdAt: now });
    }
    await batch.commit();
  }

  async getRecentAssessedMissions(userId: string, limitCount: number): Promise<{ submission: Submission, assignment: Assignment }[]> {
    const snap = await this.db.collection('submissions').where('studentId', '==', userId).where('status', '==', 'assessed').orderBy('updatedAt', 'desc').limit(limitCount).get();
    const res = [];
    for (const d of snap.docs) {
      const sub = { id: d.id, ...d.data() } as Submission;
      const asnap = await this.db.collection('assignments').doc(sub.assignmentId).get();
      if (asnap.exists) res.push({ submission: sub, assignment: { id: asnap.id, ...asnap.data() } as Assignment });
    }
    return res;
  }

  async sendBroadcastNotification(message: string, adminId: string): Promise<void> {
    const snap = await this.db.collection('users').where('role', '==', 'student').get();
    const batch = this.db.batch();
    const now = Date.now();
    snap.docs.forEach(d => {
      const nr = this.db.collection('notifications').doc();
      batch.set(nr, { id: nr.id, userId: d.id, title: '📢 Admin Announcement', message, type: 'alert', read: false, createdAt: now });
    });
    await batch.commit();
  }

  async revokeTransaction(transactionId: string, adminId: string): Promise<void> {
    const tref = this.db.collection('transactions').doc(transactionId);
    const tsnap = await tref.get();
    if (!tsnap.exists) throw new Error("Not found");
    const tx = tsnap.data() as Transaction;
    if (tx.status === 'revoked') return;
    const batch = this.db.batch();
    if (tx.receiverId && tx.receiverId.toLowerCase() !== 'system') batch.update(this.db.collection('users').doc(tx.receiverId), { coins: admin.firestore.FieldValue.increment(-tx.amount) });
    if (tx.senderId && tx.senderId.toLowerCase() !== 'system') batch.update(this.db.collection('users').doc(tx.senderId), { coins: admin.firestore.FieldValue.increment(tx.amount) });
    batch.update(tref, { status: 'revoked', revokedAt: Date.now(), revokedBy: adminId });
    await batch.commit();
  }

  async adjustTransactionAmount(transactionId: string, newAmount: number, adminId: string): Promise<void> {
    const tref = this.db.collection('transactions').doc(transactionId);
    const tsnap = await tref.get();
    if (!tsnap.exists) throw new Error("Not found");
    const tx = tsnap.data() as Transaction;
    const diff = newAmount - tx.amount;
    const batch = this.db.batch();
    if (tx.receiverId && tx.receiverId.toLowerCase() !== 'system') batch.update(this.db.collection('users').doc(tx.receiverId), { coins: admin.firestore.FieldValue.increment(diff) });
    if (tx.senderId && tx.senderId.toLowerCase() !== 'system') batch.update(this.db.collection('users').doc(tx.senderId), { coins: admin.firestore.FieldValue.increment(-diff) });
    batch.update(tref, { amount: newAmount, updatedAt: Date.now(), updatedBy: adminId });
    await batch.commit();
  }

  async getAllRechargeRequests(): Promise<RechargeRequest[]> {
     const snap = await this.db.collection('recharge_requests').orderBy('createdAt', 'desc').get();
     return snap.docs.map(d => ({ id: d.id, ...d.data() } as RechargeRequest));
  }

  async approveRechargeRequest(requestId: string, adminId: string): Promise<void> {
    const rref = this.db.collection('recharge_requests').doc(requestId);
    const rsnap = await rref.get();
    if (!rsnap.exists) throw new Error("Not found");
    const req = rsnap.data() as RechargeRequest;
    if (req.status !== 'pending') return;
    const uref = this.db.collection('users').doc(req.studentId);
    const batch = this.db.batch();
    batch.update(uref, { coins: admin.firestore.FieldValue.increment(req.coins), vipExp: admin.firestore.FieldValue.increment(req.coins), updatedAt: Date.now() });
    batch.update(rref, { status: 'approved', processedAt: Date.now(), processedBy: adminId });
    const tid = `RECHARGE_${requestId}`;
    batch.set(this.db.collection('transactions').doc(tid), { id: tid, senderId: 'SYSTEM', receiverId: req.studentId, amount: req.coins, type: 'recharge', status: 'completed', timestamp: Date.now(), message: `Approved` });
    await batch.commit();
  }

  async rejectRechargeRequest(requestId: string, adminId: string): Promise<void> {
    await this.db.collection('recharge_requests').doc(requestId).update({ status: 'rejected', processedAt: Date.now(), processedBy: adminId });
  }

  async runPenaltySweep(assignmentId?: string): Promise<{ penalizedCount: number }> {
    const now = Date.now();
    let penalizedCount = 0;
    const studentsSnap = await this.db.collection('users').where('role', '==', 'student').get();
    const students = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as User));
    
    let aSnap;
    if (assignmentId) {
      const doc = await this.db.collection('assignments').doc(assignmentId).get();
      aSnap = doc.exists ? [doc] : [];
    } else {
      const snap = await this.db.collection('assignments').where('dueDate', '<', now).get();
      aSnap = snap.docs;
    }

    const subsSnap = await this.db.collection('submissions').get();
    const subs = subsSnap.docs.map(d => d.data() as Submission);

    for (const aDoc of aSnap) {
      const a = { id: aDoc.id, ...aDoc.data() } as Assignment;
      if (!a.dueDate || a.dueDate > now) continue;
      const submittedIds = subs.filter(s => s.assignmentId === a.id).map(s => s.studentId);
      const targets = students.filter(s => !submittedIds.includes(s.id)).filter(s => a.isGlobal || a.allowedStudents?.includes(s.id));
      
      for (const s of targets) {
        // Double check they don't already have a missed enrollment for this assignment
        const enrSnap = await this.db.collection('enrollments')
            .where('studentId', '==', s.id)
            .where('assignmentId', '==', a.id)
            .get();
        
        if (!enrSnap.empty) {
            const currentEnr = enrSnap.docs[0].data();
            if (currentEnr.status === 'missed') continue;
        }

        penalizedCount++;
        const batch = this.db.batch();
        const enrId = enrSnap.empty ? `pen_${now}_${s.id}_${a.id}` : enrSnap.docs[0].id;
        
        const finalPenalty = Math.min(a.penaltyFee || 0, 50);
        const currentCoins = s.coins || 0;
        const penaltyToApply = Math.min(finalPenalty, currentCoins);

        // Update local state to avoid stale balance in next assignment iteration
        s.coins = currentCoins - penaltyToApply;

        if (enrSnap.empty) {
            batch.set(this.db.collection('enrollments').doc(enrId), { 
                id: enrId, 
                assignmentId: a.id, 
                studentId: s.id, 
                enrolledAt: now, 
                status: 'missed', 
                rewardEarned: -penaltyToApply, 
                updatedAt: now 
            });
        } else {
            batch.update(this.db.collection('enrollments').doc(enrId), { 
                status: 'missed', 
                rewardEarned: -penaltyToApply, 
                updatedAt: now 
            });
        }

        if (penaltyToApply > 0) {
            batch.update(this.db.collection('users').doc(s.id), { 
                coins: admin.firestore.FieldValue.increment(-penaltyToApply), 
                updatedAt: now 
            });
            const tid = `tx_pen_${now}_${s.id}_${a.id}`;
            batch.set(this.db.collection('transactions').doc(tid), { 
                id: tid, 
                senderId: s.id, 
                receiverId: 'SYSTEM', 
                amount: penaltyToApply, 
                type: 'assignment_penalty', 
                status: 'completed', 
                timestamp: now, 
                message: `Missed ${a.title} (Penalty capped at 50)` 
            });
        }
        await batch.commit();
    }
    }
    return { penalizedCount };
  }

  async checkAndClaimPreRegistration(email: string, userId: string, defaultName: string): Promise<User | null> {
    const snap = await this.db.collection('pre_registered_users').where('email', '==', email).where('status', '==', 'pending').get();
    if (snap.empty) return null;
    const data = snap.docs[0].data();
    const now = Date.now();
    const user = { email, name: data.name || defaultName, role: data.role || 'student', coins: data.coins || 100, createdAt: now, updatedAt: now, inviteCodeUsed: 'PRE' };
    await this.db.batch().set(this.db.collection('users').doc(userId), user).update(snap.docs[0].ref, { status: 'claimed', claimedAt: now, userId }).commit();
    return { id: userId, ...user } as User;
  }

  async redeemInviteCode(code: string, userId: string, name: string, email: string): Promise<User> {
    const codeRef = this.db.collection('inviteCodes').doc(code.trim().toUpperCase());
    const codeSnap = await codeRef.get();
    if (!codeSnap.exists) throw new Error('Invalid code');
    const codeData = codeSnap.data() as InviteCode;
    const now = Date.now();
    const user = { email, name, role: codeData.role, coins: 100, inviteCodeUsed: code.trim(), createdAt: now, updatedAt: now };
    const batch = this.db.batch();
    batch.set(this.db.collection('users').doc(userId), user);
    batch.update(codeRef, { 
       currentUses: admin.firestore.FieldValue.increment(1),
       usedBy: admin.firestore.FieldValue.arrayUnion(userId),
       updatedAt: now
    });
    await batch.commit();
    return { id: userId, ...user } as User;
  }

  async giftItem(senderId: string, receiverId: string, itemId: string): Promise<void> {
    const senderRef = this.db.collection('users').doc(senderId);
    const receiverRef = this.db.collection('users').doc(receiverId);
    const senderSnap = await senderRef.get();
    const sender = senderSnap.data() as User;
    const inv = [...(sender.inventory || [])];
    const idx = inv.indexOf(itemId);
    if (idx === -1) throw new Error("Not in inventory");
    inv.splice(idx, 1);
    const now = Date.now();
    const batch = this.db.batch();
    batch.update(senderRef, { inventory: inv, updatedAt: now });
    batch.update(receiverRef, { inventory: admin.firestore.FieldValue.arrayUnion(itemId), updatedAt: now });
    const txId = `gift_${now}`;
    batch.set(this.db.collection('transactions').doc(txId), { id: txId, senderId, receiverId, amount: 0, type: 'transfer', status: 'completed', timestamp: now, message: `Gifted item` });
    await batch.commit();
  }

  async spendCoins(userId: string, amount: number, type: TransactionType, message: string): Promise<void> {
    const now = Date.now();
    const userRef = this.db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    const currentCoins = userSnap.exists ? (userSnap.data() as User).coins || 0 : 0;
    
    if (currentCoins < amount) {
      throw new Error("Insufficient coins");
    }

    const batch = this.db.batch();
    batch.update(userRef, { coins: admin.firestore.FieldValue.increment(-amount), updatedAt: now });
    const txId = `spend_${now}`;
    batch.set(this.db.collection('transactions').doc(txId), { id: txId, senderId: userId, receiverId: 'SYSTEM', amount, type, status: 'completed', timestamp: now, message });
    await batch.commit();
  }

  async transferCoins(senderId: string, receiverId: string, amount: number): Promise<void> {
    const now = Date.now();
    const senderRef = this.db.collection('users').doc(senderId);
    const receiverRef = this.db.collection('users').doc(receiverId);
    const tax = Math.floor(amount * 0.3);
    const receive = amount - tax;
    const batch = this.db.batch();
    batch.update(senderRef, { coins: admin.firestore.FieldValue.increment(-amount), xp: admin.firestore.FieldValue.increment(amount), updatedAt: now });
    batch.update(receiverRef, { coins: admin.firestore.FieldValue.increment(receive), updatedAt: now });
    const txId = `trans_${now}`;
    batch.set(this.db.collection('transactions').doc(txId), { id: txId, senderId, receiverId, amount: receive, type: 'transfer', status: 'completed', timestamp: now });
    await batch.commit();
  }

  async convertDiamondsToCoins(userId: string, diamondsAmount: number): Promise<void> {
    // Unimplemented for admin side at the moment
  }

  async claimDailyReward(userId: string, reward: { type: string, value: number | string }): Promise<void> {
    const now = Date.now();
    const batch = this.db.batch();
    const userRef = this.db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    const currentCoins = userSnap.exists ? (userSnap.data() as User).coins || 0 : 0;

    const updates: any = { updatedAt: now };
    let finalValue = reward.value;

    if (reward.type === 'coins') {
      updates.coins = admin.firestore.FieldValue.increment(reward.value as number);
    } else if (reward.type === 'xp') {
      updates.xp = admin.firestore.FieldValue.increment(reward.value as number);
    } else if (reward.type === 'item') {
      updates.inventory = admin.firestore.FieldValue.arrayUnion(reward.value);
    } else if (reward.type === 'penalty') {
       const penaltyAmount = Math.min(Math.abs(reward.value as number), 50);
       const penaltyToApply = Math.min(penaltyAmount, currentCoins);
       updates.coins = admin.firestore.FieldValue.increment(-penaltyToApply);
       finalValue = penaltyToApply;
    }

    batch.update(userRef, updates);

    if (reward.type === 'coins' || reward.type === 'penalty') {
      const txId = 'tx_daily_' + now;
      batch.set(this.db.collection('transactions').doc(txId), {
        id: txId,
        senderId: reward.type === 'penalty' ? userId : 'SYSTEM',
        receiverId: reward.type === 'penalty' ? 'SYSTEM' : userId,
        amount: Math.abs(finalValue as number),
        type: reward.type === 'penalty' ? 'penalty' : 'daily_reward',
        status: 'completed',
        message: reward.type === 'penalty' ? 'Daily Penalty (Capped)' : 'Daily Reward',
        timestamp: now,
      });
    }

    await batch.commit();
  }
}
