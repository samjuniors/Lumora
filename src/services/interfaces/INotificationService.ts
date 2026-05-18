import { Notification } from '../../types';

export interface INotificationService {
  getUserNotifications(userId: string, limit?: number): Promise<Notification[]>;
  createNotification(data: Omit<Notification, 'id'>): Promise<string>;
  markNotificationRead(notificationId: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  clearAllNotifications(userId: string): Promise<void>;
  deleteNotification(notificationId: string): Promise<void>;
  subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void): () => void;
  subscribeToNewNotifications(userId: string, callback: (notification: Notification) => void): () => void;
  sendBroadcastNotification(message: string, adminId: string): Promise<void>;
}
