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
import { pgFetch, HybridDiagnostics } from './hybridDiagnostics';
import { mapPgUser, checkDrift } from './hybridUtils';

export class FirebaseUserService extends FirebaseBaseService implements IUserService {
  
  async getUser(userId: string): Promise<User | null> {
    const startTime = Date.now();
    try {
      const pgResult = await pgFetch(`/api/users/${userId}`);
      if (pgResult.data && pgResult.data.id) {
        const pgUser = pgResult.data;
        const latency = Date.now() - startTime;
        
        HybridDiagnostics.logRead({ entity: 'User', entityId: userId, source: 'pg', latencyMs: latency, success: true });

        // Best effort async fetch for drift detection (temporary)
        getDoc(doc(db, 'users', userId)).then(snap => {
          if (snap.exists()) {
            checkDrift('User', userId, { id: snap.id, ...snap.data() }, pgUser, ['email', 'role', 'coins', 'diamonds', 'xp', 'level', 'streak']);
          }
        }).catch(() => {});

        return mapPgUser(pgUser);
      }
      throw new Error("Invalid SQL response");
    } catch (error: any) {
      console.warn("[Operation Fallback] User read failed in SQL, falling back to Firestore:", error.message);
      HybridDiagnostics.logRead({ entity: 'User', entityId: userId, source: 'pg', latencyMs: Date.now() - startTime, success: false, reason: error.message });
      
      try {
        const fsStartTime = Date.now();
        const snap = await getDoc(doc(db, 'users', userId));
        if (snap.exists()) {
          HybridDiagnostics.logRead({ entity: 'User', entityId: userId, source: 'fs', latencyMs: Date.now() - fsStartTime, success: true });
          return { id: snap.id, ...snap.data() } as User;
        }
        return null;
      } catch (fsError) {
        handleFirestoreError(fsError, OperationType.GET, `users/${userId}`);
        return null;
      }
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const startTime = Date.now();
    try {
      const pgResult = await pgFetch(`/api/users?email=${encodeURIComponent(email)}&limit=1`);
      
      if (pgResult.data && Array.isArray(pgResult.data) && pgResult.data.length > 0) {
        const pgUser = pgResult.data[0];
        const latency = Date.now() - startTime;
        
        HybridDiagnostics.logRead({ entity: 'User', entityId: email, source: 'pg', latencyMs: latency, success: true });

        // Best effort async fetch for drift detection (temporary)
        const q = query(collection(db, 'users'), where('email', '==', email), fsLimit(1));
        getDocs(q).then(snap => {
          if (!snap.empty) {
            checkDrift('User', pgUser.id, { id: snap.docs[0].id, ...snap.docs[0].data() }, pgUser, ['email', 'role', 'coins', 'diamonds', 'xp', 'level', 'streak']);
          }
        }).catch(() => {});

        return mapPgUser(pgUser);
      }
      throw new Error("Invalid SQL response or user not found");
    } catch (error: any) {
      console.warn("[Operation Fallback] User getUserByEmail failed in SQL, falling back to Firestore:", error.message);
      HybridDiagnostics.logRead({ entity: 'User', entityId: email, source: 'pg', latencyMs: Date.now() - startTime, success: false, reason: error.message });
      
      try {
        const fsStartTime = Date.now();
        const q = query(collection(db, 'users'), where('email', '==', email), fsLimit(1));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          HybridDiagnostics.logRead({ entity: 'User', entityId: email, source: 'fs', latencyMs: Date.now() - fsStartTime, success: true });
          return { id: snap.docs[0].id, ...snap.docs[0].data() } as User;
        }
        return null;
      } catch (fsError) {
        handleFirestoreError(fsError, OperationType.LIST, 'users');
        return null;
      }
    }
  }

  async updateUser(userId: string, data: Partial<User>): Promise<void> {
    if (this.shouldThrottle(`user/update/${userId}`, 5000, data)) return;
    try {
      // Primary Write to SQL
      await pgFetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      HybridDiagnostics.logWrite({ entity: 'User', entityId: userId, success: true });

      // Fallback Dual-Write to Firestore
      updateDoc(doc(db, 'users', userId), { ...data, updatedAt: Date.now() })
        .catch(e => console.error("[Sync Drift] Firestore fallback update failed for user", userId, e));
      
    } catch (pgError: any) {
      HybridDiagnostics.logWrite({ entity: 'User', entityId: userId, success: false, reason: String(pgError) });
      
      // If SQL fails, try Firestore (Rollback safety)
      try {
        await updateDoc(doc(db, 'users', userId), { ...data, updatedAt: Date.now() });
      } catch (fsError) {
        handleFirestoreError(fsError, OperationType.UPDATE, `users/${userId}`);
      }
    }
  }

  async createUser(userId: string, data: User): Promise<void> {
    try {
      // Primary Write to SQL
      await pgFetch('/api/sync/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           uid: userId, 
           email: data.email, 
           name: data.name, 
           role: data.role,
           coins: data.coins,
           diamonds: data.diamonds,
           xp: data.xp,
           level: data.level,
           streak: data.streak
        })
      });
      HybridDiagnostics.logWrite({ entity: 'User', entityId: userId, success: true });

      // Fallback Dual-Write to Firestore
      setDoc(doc(db, 'users', userId), data)
        .catch(e => console.error("[Sync Drift] Firestore fallback create failed for user", userId, e));

    } catch (error: any) {
      HybridDiagnostics.logWrite({ entity: 'User', entityId: userId, success: false, reason: String(error) });
      
      // If SQL fails, try Firestore
      try {
        await setDoc(doc(db, 'users', userId), data);
      } catch (fsError) {
        handleFirestoreError(fsError, OperationType.CREATE, `users/${userId}`);
      }
    }
  }

  async getUsersByRole(role: string): Promise<User[]> {
    const startTime = Date.now();
    try {
      const pgResult = await pgFetch(`/api/users?role=${encodeURIComponent(role)}`);
      
      if (pgResult.data && Array.isArray(pgResult.data)) {
        const latency = Date.now() - startTime;
        HybridDiagnostics.logRead({ entity: 'User_List', entityId: role, source: 'pg', latencyMs: latency, success: true });

        // Best effort async fetch for drift detection (temporary)
        const q = query(collection(db, 'users'), where('role', '==', role));
        getDocs(q).then(snap => {
          if (!snap.empty) {
            const fsUsers = Object.fromEntries(snap.docs.map(d => [d.id, { ...d.data(), id: d.id }]));
            pgResult.data.forEach((pgU: any) => {
              checkDrift('User', pgU.id, fsUsers[pgU.id], pgU, ['email', 'role', 'coins', 'diamonds', 'xp', 'level', 'streak']);
            });
          }
        }).catch(() => {});

        return pgResult.data.map(mapPgUser);
      }
      throw new Error("Invalid SQL response");
    } catch (error: any) {
      console.warn(`[Operation Fallback] User getUsersByRole(${role}) failed in SQL, falling back to Firestore:`, error.message);
      HybridDiagnostics.logRead({ entity: 'User_List', entityId: role, source: 'pg', latencyMs: Date.now() - startTime, success: false, reason: error.message });
      
      try {
        const fsStartTime = Date.now();
        const q = query(collection(db, 'users'), where('role', '==', role));
        const snap = await getDocs(q);
        HybridDiagnostics.logRead({ entity: 'User_List', entityId: role, source: 'fs', latencyMs: Date.now() - fsStartTime, success: true });
        return snap.docs.map(d => ({ ...d.data(), id: d.id } as User));
      } catch (fsError) {
        handleFirestoreError(fsError, OperationType.LIST, 'users');
        return [];
      }
    }
  }

  async getAllUsers(): Promise<User[]> {
    return this.fetchWithCache(
      'all_users',
      300000,
      async () => {
        const startTime = Date.now();
        try {
          const pgResult = await pgFetch('/api/users?limit=1000');
          
          if (pgResult.data && Array.isArray(pgResult.data)) {
            const latency = Date.now() - startTime;
            HybridDiagnostics.logRead({ entity: 'User_List', entityId: 'all', source: 'pg', latencyMs: latency, success: true });

            // Best effort async fetch for drift detection
            getDocs(collection(db, 'users')).then(snap => {
              if (!snap.empty) {
                const fsUsers = Object.fromEntries(snap.docs.map(d => [d.id, { ...d.data(), id: d.id }]));
                pgResult.data.forEach((pgU: any) => {
                  checkDrift('User', pgU.id, fsUsers[pgU.id], pgU, ['email', 'role', 'coins', 'diamonds', 'xp', 'level', 'streak']);
                });
              }
            }).catch(() => {});

            return pgResult.data.map(mapPgUser);
          }
          throw new Error("Invalid SQL response");
        } catch (error: any) {
          console.warn("[Operation Fallback] User getAllUsers failed in SQL, falling back to Firestore:", error.message);
          HybridDiagnostics.logRead({ entity: 'User_List', entityId: 'all', source: 'pg', latencyMs: Date.now() - startTime, success: false, reason: error.message });
          
          try {
            const fsStartTime = Date.now();
            const snap = await getDocs(collection(db, 'users'));
            HybridDiagnostics.logRead({ entity: 'User_List', entityId: 'all', source: 'fs', latencyMs: Date.now() - fsStartTime, success: true });
            return snap.docs.map(d => ({ ...d.data(), id: d.id } as User));
          } catch (fsError) {
            handleFirestoreError(fsError, OperationType.LIST, 'users');
            return [];
          }
        }
      },
      { type: OperationType.LIST, path: 'users' }
    );
  }

  async getUsers(): Promise<User[]> {
    return this.getAllUsers();
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      await pgFetch(`/api/users/${userId}`, { method: 'DELETE' });
      HybridDiagnostics.logWrite({ entity: 'User_Delete', entityId: userId, success: true });
      
      deleteDoc(doc(db, 'users', userId)).catch(() => {});
    } catch (pgError: any) {
      HybridDiagnostics.logWrite({ entity: 'User_Delete', entityId: userId, success: false, reason: String(pgError) });
      console.warn("[Operation Fallback] SQL delete failed, falling back to FS", pgError);
      
      try {
        await deleteDoc(doc(db, 'users', userId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
      }
    }
  }

  async initializeUser(userId: string, data: Partial<User>): Promise<void> {
    if (this.shouldThrottle(`init/${userId}`, 86400000, data)) return;
    try {
      // Primary Write to SQL
      await pgFetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      HybridDiagnostics.logWrite({ entity: 'User_Init', entityId: userId, success: true });

      // Fallback Dual-Write to Firestore
      updateDoc(doc(db, 'users', userId), {
        ...data,
        updatedAt: Date.now()
      }).catch(e => console.error("[Sync Drift] Firestore fallback update failed for user init", userId, e));
      
    } catch (pgError: any) {
      HybridDiagnostics.logWrite({ entity: 'User_Init', entityId: userId, success: false, reason: String(pgError) });
      console.warn("[Operation Fallback] SQL initialization failed, falling back to FS", pgError);

      try {
        await updateDoc(doc(db, 'users', userId), {
          ...data,
          updatedAt: Date.now()
        });
      } catch (error) {
         console.error("Initialization failed", error);
      }
    }
  }

  subscribeToUser(userId: string, callback: (user: User | null) => void): () => void {
    HybridDiagnostics.logFirebaseDependency('subscribeToUser');
    const cleanup = this.TRACK_LISTENER(`users/${userId}`);
    const unsub = onSnapshot(doc(db, 'users', userId), (snap) => {
      if (snap.exists()) {
        callback({ ...snap.data(), id: snap.id } as User);
      } else {
        callback(null);
      }
    }, (error) => {
      console.warn("Firestore snapshot error:", error);
      try {
        handleFirestoreError(error, OperationType.GET, `users/${userId}`);
      } catch (e) {
        // Suppress throw to ensure callback is fired
      }
      callback(null);
    });
    return () => {
      unsub();
      cleanup();
    };
  }

  subscribeToStudents(callback: (users: User[]) => void): () => void {
    HybridDiagnostics.logFirebaseDependency('subscribeToStudents');
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
    HybridDiagnostics.logFirebaseDependency('followUser');
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
    HybridDiagnostics.logFirebaseDependency('unfollowUser');
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
    HybridDiagnostics.logFirebaseDependency('generateLumoraId');
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

  async updatePresence(userId: string, presence: 'online' | 'idle' | 'offline'): Promise<void> {}
}
