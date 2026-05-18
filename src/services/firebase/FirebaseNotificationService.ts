import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  orderBy, 
  onSnapshot,
  limit as fsLimit,
  writeBatch,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { INotificationService } from '../interfaces/INotificationService';
import { Notification } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/errorHandling';
import { FirebaseBaseService } from './FirebaseBaseService';

export class FirebaseNotificationService extends FirebaseBaseService implements INotificationService {
  async getUserNotifications(userId: string, limitCount: number = 50): Promise<Notification[]> {
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
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.update(d.ref, { read: true }));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'notifications');
    }
  }

  async clearAllNotifications(userId: string): Promise<void> {
    try {
      const q = query(collection(db, 'notifications'), where('userId', '==', userId));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
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

  subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void): () => void {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      fsLimit(50)
    );
    const cleanup = this.TRACK_LISTENER(`notifications/${userId}`);
    const unsub = onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Notification));
      callback(notifications);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
      callback([]);
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
      fsLimit(1)
    );
    const cleanup = this.TRACK_LISTENER(`notifications/new/${userId}`);
    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        callback({ ...snapshot.docs[0].data(), id: snapshot.docs[0].id } as Notification);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });
    return () => {
      unsub();
      cleanup();
    };
  }

  async sendBroadcastNotification(message: string, adminId: string): Promise<void> {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const batch = writeBatch(db);
      const now = Date.now();
      
      usersSnap.docs.forEach(userDoc => {
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          id: notifRef.id,
          userId: userDoc.id,
          title: '📢 BROADCAST',
          message,
          type: 'info',
          read: false,
          createdAt: now
        });
      });
      
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'notifications/broadcast');
    }
  }
}
