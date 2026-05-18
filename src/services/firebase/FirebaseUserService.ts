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
      const [fsResult, pgResult] = await Promise.allSettled([
        getDoc(doc(db, 'users', userId)),
        fetch(`/api/users/${userId}`).then(res => res.ok ? res.json() : Promise.reject(`Status: ${res.status}`))
      ]);

      let firestoreUser: User | null = null;
      if (fsResult.status === 'fulfilled' && fsResult.value.exists()) {
        firestoreUser = { id: fsResult.value.id, ...fsResult.value.data() } as User;
      } else if (fsResult.status === 'rejected') {
        handleFirestoreError(fsResult.reason, OperationType.GET, `users/${userId}`);
      }

      if (pgResult.status === 'fulfilled' && pgResult.value && pgResult.value.id) {
        console.info(`[Pg Read] Successfully read user ${userId} from SQL`);
        const pgUser = pgResult.value;
        return {
           ...(firestoreUser || {}), // Fallback arrays and unmapped fields
           id: pgUser.id,
           email: pgUser.email,
           name: pgUser.name,
           role: pgUser.role,
           coins: pgUser.coins,
           diamonds: pgUser.diamonds,
           xp: pgUser.xp,
           level: pgUser.level,
           streak: pgUser.streak,
           avatar: pgUser.avatar || firestoreUser?.avatar,
           theme: pgUser.theme || firestoreUser?.theme,
        } as User;
      } else {
        console.warn(`[Pg Read] Fallback to Firestore for user ${userId}. Reason: ${pgResult.status === 'rejected' ? pgResult.reason : 'Not found in SQL'}`);
        return firestoreUser;
      }
    } catch (error) {
      console.error("Hybrid getUser error", error);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const q = query(collection(db, 'users'), where('email', '==', email), fsLimit(1));
      
      const [fsResult, pgResult] = await Promise.allSettled([
        getDocs(q),
        fetch(`/api/users?email=${encodeURIComponent(email)}&limit=1`).then(res => res.ok ? res.json() : Promise.reject(`Status: ${res.status}`))
      ]);

      let firestoreUser: User | null = null;
      if (fsResult.status === 'fulfilled' && !fsResult.value.empty) {
        firestoreUser = { id: fsResult.value.docs[0].id, ...fsResult.value.docs[0].data() } as User;
      } else if (fsResult.status === 'rejected') {
        handleFirestoreError(fsResult.reason, OperationType.LIST, 'users');
      }

      if (pgResult.status === 'fulfilled' && Array.isArray(pgResult.value) && pgResult.value.length > 0) {
        const pgUser = pgResult.value[0];
        console.info(`[Pg Read] Successfully read user by email ${email} from SQL`);
        return {
           ...(firestoreUser || {}),
           id: pgUser.id,
           email: pgUser.email,
           name: pgUser.name,
           role: pgUser.role,
           coins: pgUser.coins,
           diamonds: pgUser.diamonds,
           xp: pgUser.xp,
           level: pgUser.level,
           streak: pgUser.streak,
           avatar: pgUser.avatar || firestoreUser?.avatar,
           theme: pgUser.theme || firestoreUser?.theme,
        } as User;
      } else {
        console.warn(`[Pg Read] Fallback to Firestore for email ${email}. Reason: ${pgResult.status === 'rejected' ? pgResult.reason : 'Not found in SQL'}`);
        return firestoreUser;
      }
    } catch (error) {
      console.error("Hybrid getUserByEmail error", error);
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
      
      const [fsResult, pgResult] = await Promise.allSettled([
        getDocs(q),
        fetch(`/api/users?role=${encodeURIComponent(role)}`).then(res => res.ok ? res.json() : Promise.reject(`Status: ${res.status}`))
      ]);

      let firestoreUsers: Record<string, User> = {};
      if (fsResult.status === 'fulfilled') {
        fsResult.value.docs.forEach(d => {
          firestoreUsers[d.id] = { ...d.data(), id: d.id } as User;
        });
      } else {
        handleFirestoreError(fsResult.reason, OperationType.LIST, 'users');
      }

      if (pgResult.status === 'fulfilled' && Array.isArray(pgResult.value)) {
        console.info(`[Pg Read] Successfully read ${pgResult.value.length} users by role ${role} from SQL`);
        
        // Merge Postgres source of truth onto Firestore arrays per user
        return pgResult.value.map((pgUser: any) => {
          const fsUser = firestoreUsers[pgUser.id];
          return {
             ...(fsUser || {}),
             id: pgUser.id,
             email: pgUser.email,
             name: pgUser.name,
             role: pgUser.role,
             coins: pgUser.coins,
             diamonds: pgUser.diamonds,
             xp: pgUser.xp,
             level: pgUser.level,
             streak: pgUser.streak,
             avatar: pgUser.avatar || fsUser?.avatar,
             theme: pgUser.theme || fsUser?.theme,
          } as User;
        });
      }

      console.warn(`[Pg Read] Fallback to Firestore list for role ${role}`);
      return Object.values(firestoreUsers);
    } catch (error) {
      console.error("Hybrid getUsersByRole error", error);
      return [];
    }
  }

  async getAllUsers(): Promise<User[]> {
    return this.fetchWithCache(
      'all_users',
      300000,
      async () => {
        const [fsResult, pgResult] = await Promise.allSettled([
          getDocs(collection(db, 'users')),
          fetch(`/api/users?limit=1000`).then(res => res.ok ? res.json() : Promise.reject(`Status: ${res.status}`))
        ]);

        let firestoreUsers: Record<string, User> = {};
        if (fsResult.status === 'fulfilled') {
          fsResult.value.docs.forEach(d => {
            firestoreUsers[d.id] = { ...d.data(), id: d.id } as User;
          });
        }
        
        if (pgResult.status === 'fulfilled' && Array.isArray(pgResult.value)) {
           console.info(`[Pg Read] Successfully read ${pgResult.value.length} total users from SQL`);
           return pgResult.value.map((pgUser: any) => {
             const fsUser = firestoreUsers[pgUser.id];
             return {
               ...(fsUser || {}),
               id: pgUser.id,
               email: pgUser.email,
               name: pgUser.name,
               role: pgUser.role,
               coins: pgUser.coins,
               diamonds: pgUser.diamonds,
               xp: pgUser.xp,
               level: pgUser.level,
               streak: pgUser.streak,
               avatar: pgUser.avatar || fsUser?.avatar,
               theme: pgUser.theme || fsUser?.theme,
             } as User;
           });
        }
        
        console.warn(`[Pg Read] Fallback to Firestore for getAllUsers`);
        return Object.values(firestoreUsers);
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
