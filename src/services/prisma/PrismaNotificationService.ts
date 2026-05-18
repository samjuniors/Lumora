import { INotificationService } from '../interfaces/INotificationService';
import { Notification } from '../../types';

export class PrismaNotificationService implements INotificationService {
  async getUserNotifications(userId: string, limit?: number): Promise<Notification[]> {
    const res = await fetch(`/api/notifications?userId=${userId}`);
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  }

  async createNotification(data: Omit<Notification, 'id'>): Promise<string> {
    const res = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, id: crypto.randomUUID() })
    });
    if (!res.ok) throw new Error('Failed to create notification');
    const result = await res.json();
    return result.id;
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    await fetch(`/api/notifications/${notificationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true })
    });
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    const notifs = await this.getUserNotifications(userId);
    const unread = notifs.filter(n => !n.read);
    await Promise.all(unread.map(n => this.markNotificationRead(n.id)));
  }

  async clearAllNotifications(userId: string): Promise<void> {
    const notifs = await this.getUserNotifications(userId);
    await Promise.all(notifs.map(n => this.deleteNotification(n.id)));
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await fetch(`/api/notifications/${notificationId}`, {
      method: 'DELETE'
    });
  }

  subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void): () => void {
    let active = true;
    const fetchNotifs = async () => {
      try {
        if (!active) return;
        const notifs = await this.getUserNotifications(userId);
        if (active) callback(notifs);
      } catch (err) {
        console.error(err);
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }

  subscribeToNewNotifications(userId: string, callback: (notification: Notification) => void): () => void {
    let active = true;
    let lastSeenId = '';
    const fetchNotifs = async () => {
      try {
        if (!active) return;
        const notifs = await this.getUserNotifications(userId, 1);
        if (active && notifs.length > 0 && notifs[0].id !== lastSeenId) {
          if (lastSeenId !== '') {
             callback(notifs[0]);
          }
          lastSeenId = notifs[0].id;
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }

  async sendBroadcastNotification(message: string, adminId: string): Promise<void> {
     // Fetch all users somehow from somewhere else or dedicated endpoint
     console.warn('sendBroadcastNotification not fully optimal in SQL without dedicated endpoint');
     const res = await fetch('/api/users');
     const users = await res.json();
     await Promise.all(users.map((u: any) => this.createNotification({
         userId: u.id,
         title: 'Platform Announcement',
         message,
         type: 'info',
         read: false,
         createdAt: Date.now()
     })));
  }
}
