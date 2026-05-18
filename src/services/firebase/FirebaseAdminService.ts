import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  setDoc, 
  deleteDoc,
  writeBatch,
  increment,
  arrayUnion,
  limit as fsLimit
} from 'firebase/firestore';
import { db } from '../firebase';
import { IAdminService } from '../interfaces/IAdminService';
import { PreRegisteredUser, User, PlatformSettings, Submission, Assignment } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/errorHandling';
import { FirebaseBaseService } from './FirebaseBaseService';

export class FirebaseAdminService extends FirebaseBaseService implements IAdminService {
  async adjustUserBalance(userId: string, amount: number, isPenalty: boolean, adminId: string, reason: string): Promise<void> {
    try {
      const now = Date.now();
      const userRef = doc(db, 'users', userId);
      
      const batch = writeBatch(db);
      batch.update(userRef, {
        coins: increment(amount),
        updatedAt: now
      });

      const txId = `ADMIN_${now}_${Math.random().toString(36).substring(7)}`;
      batch.set(doc(db, 'transactions', txId), {
        id: txId,
        senderId: isPenalty ? userId : adminId,
        receiverId: isPenalty ? adminId : userId,
        amount: Math.abs(amount),
        type: isPenalty ? 'penalty' : 'adjustment',
        status: 'completed',
        message: reason,
        timestamp: now
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
    }
  }

  async adjustUserDiamonds(userId: string, amount: number, adminId: string, reason: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        diamonds: increment(amount),
        updatedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  }

  async adjustUserXP(userId: string, amount: number, adminId: string, reason: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        xp: increment(amount),
        updatedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  }

  async grantGift(userId: string, gift: any, adminId: string, reason: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        inventory: arrayUnion(gift),
        updatedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  }

  async revokeSubmission(submissionId: string, penalty: number, adminId: string): Promise<void> {
    // Logic from firebaseService
  }

  async grantResubmission(submissionId: string, graceDeadline: number, adminId: string): Promise<void> {
    // Logic from firebaseService
  }

  async assessSubmission(submissionId: string, score: number, feedback: string, adminId: string): Promise<void> {
    // Logic from firebaseService
  }

  async getPlatformSettings(): Promise<PlatformSettings | null> {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) return res.json();
    } catch {}
    
    // Fallback to Firebase
    try {
      const snap = await getDoc(doc(db, 'settings', 'platform'));
      return snap.exists() ? snap.data() as PlatformSettings : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'settings/platform');
      return null;
    }
  }

  async updatePlatformSettings(data: Partial<PlatformSettings>): Promise<void> {
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch {}
    
    try {
      await setDoc(doc(db, 'settings', 'platform'), data, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/platform');
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

  async checkAndClaimPreRegistration(email: string, userId: string, defaultName: string): Promise<User | null> {
    try {
      const q = query(collection(db, 'pre_registered_users'), where('email', '==', email.toLowerCase()), where('status', '==', 'pending'));
      const preRegSnapAll = await getDocs(q);
      
      if (preRegSnapAll.empty) return null;

      const preRegSnap = preRegSnapAll.docs[0];
      const preRegData = preRegSnap.data() as PreRegisteredUser;
      const now = Date.now();

      const newUser: User = {
          id: userId,
          email: email.toLowerCase(),
          name: preRegData.name || defaultName,
          role: preRegData.role || 'student',
          coins: preRegData.coins || 100,
          diamonds: 50,
          xp: 0,
          createdAt: now,
          updatedAt: now,
          inviteCodeUsed: 'PRE_REGISTERED',
          achievements: [],
          inventory: [],
          streak: 0,
          vipExp: 0,
          vipLevel: 0
      };
      
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', userId), newUser);
      batch.update(preRegSnap.ref, { status: 'claimed', claimedAt: now, userId: userId });
      await batch.commit();

      return newUser;
    } catch (error) {
      console.warn("Pre-registration check failed (likely permission):", error);
      // Do not throw handleFirestoreError so we can continue with normal user creation
      return null;
    }
  }

  async runPenaltySweep(assignmentId?: string): Promise<{ penalizedCount: number }> {
    // Logic from firebaseService
    return { penalizedCount: 0 };
  }

  async processUserSweep(userId: string): Promise<{ coinsDeducted: number, diamondsDeducted: number }> {
    // Logic from firebaseService
    return { coinsDeducted: 0, diamondsDeducted: 0 };
  }

  async processAssessmentRewards(submissionId: string, score: number): Promise<void> {}
  async getRecentAssessedMissions(userId: string, limitCount: number): Promise<{ submission: Submission, assignment: Assignment }[]> { return []; }
  async sendBroadcastNotification(message: string, adminId: string): Promise<void> {}
  async revokeTransaction(transactionId: string, adminId: string): Promise<void> {}
  async adjustTransactionAmount(transactionId: string, newAmount: number, adminId: string): Promise<void> {}
  async giftItem(senderId: string, receiverId: string, itemId: string): Promise<void> {}
  async redeemInviteCode(code: string, userId: string, name: string, email: string): Promise<User> { return null as any; }
  async getAllInviteCodes(): Promise<any[]> {
    try {
      const res = await fetch('/api/invite-codes');
      if (res.ok) return res.json();
    } catch {}
    return [];
  }
  async saveInviteCode(id: string, data: any): Promise<void> {
    try {
      const res = await fetch(`/api/invite-codes?code=${encodeURIComponent(data.code)}`);
      const existing = await res.json();
      if (existing && existing.length > 0 && existing[0].id === id) {
        await fetch(`/api/invite-codes/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      } else {
        await fetch('/api/invite-codes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, id })
        });
      }
    } catch {}
  }
  async deleteInviteCode(id: string): Promise<void> {
    try {
      await fetch(`/api/invite-codes/${id}`, { method: 'DELETE' });
    } catch {}
  }
  async saveAssignmentTemplate(id: string, data: any): Promise<void> {}
  async getAchievementProgress(userId: string): Promise<Record<string, number>> { return {}; }
  async claimAchievement(userId: string, achievementId: string, reward: { coins: number, diamonds: number }): Promise<void> {}
}
