import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit as fsLimit,
  onSnapshot,
  deleteDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../firebase';
import { IUserService } from '../interfaces/IUserService';
import { User } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/errorHandling';
import { FirebaseBaseService } from './FirebaseBaseService';

export class FirebaseUserService extends FirebaseBaseService implements IUserService {
  async getUser(userId: string): Promise<User | null> {
    try {
      const snap = await getDoc(doc(db, 'users', userId));
      return snap.exists() ? { id: snap.id, ...snap.data() } as User : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${userId}`);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const q = query(collection(db, 'users'), where('email', '==', email), fsLimit(1));
      const snap = await getDocs(q);
      return !snap.empty ? { id: snap.docs[0].id, ...snap.docs[0].data() } as User : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
      return null;
    }
  }

  async updateUser(userId: string, data: Partial<User>): Promise<void> {
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
    return this.fetchWithCache(
      'all_users',
      300000,
      async () => {
        const snap = await getDocs(collection(db, 'users'));
        return snap.docs.map(d => ({ ...d.data(), id: d.id } as User));
      },
      { type: OperationType.LIST, path: 'users' }
    );
  }

  async getUsers(): Promise<User[]> {
    return this.getAllUsers();
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    }
  }

  async initializeUser(userId: string, data: Partial<User>): Promise<void> {
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

  async followUser(followerId: string, targetId: string): Promise<void> {
    try {
      const { writeBatch } = await import('firebase/firestore');
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
      
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        id: notifRef.id,
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
       const { writeBatch } = await import('firebase/firestore');
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
}
