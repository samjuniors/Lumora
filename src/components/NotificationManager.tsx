import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/dbProvider';
import { toast } from 'react-hot-toast';
import { playNotificationSound } from '../lib/audio';
import { Bell, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { useNotifications } from '../hooks/queries/useNotifications';

export const NotificationManager: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: notifications = [] } = useNotifications();
  const seenMessages = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user || notifications.length === 0) return;

    // Get the most recent unread notification
    const newestUnread = notifications.find(n => !n.read);
    if (!newestUnread) return;

    const messageKey = `${newestUnread.title}_${newestUnread.message}`;
    
    // Only show if it's recent (to avoid old unread notifications popping up on login)
    const isRecent = (Date.now() - newestUnread.createdAt) < 60000;
    const isDuplicate = seenMessages.current.has(messageKey);
    
    if (isRecent && !isDuplicate) {
      seenMessages.current.add(messageKey);
      // Clear from seenMessages after 10 seconds to allow showing it again if it naturally recurs much later
      setTimeout(() => seenMessages.current.delete(messageKey), 10000);

      playNotificationSound();
      
      const handleNotificationAction = async (tId: string) => {
        toast.dismiss(tId);
        if (newestUnread.metadata?.url) {
          navigate(newestUnread.metadata.url);
        }
        try {
          await notificationService.markNotificationRead(newestUnread.id);
        } catch (err) {
          console.error("Failed to mark as read:", err);
        }
      };

      toast.custom((t) => (
        <div
          onClick={() => handleNotificationAction(t.id)}
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-[#0A0F1E] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] rounded-2xl pointer-events-auto flex ring-1 ring-white/10 overflow-hidden cursor-pointer hover:bg-[#111A33] transition-colors`}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                {newestUnread.type === 'success' ? (
                  <CheckCircle className="h-10 w-10 text-emerald-500" />
                ) : newestUnread.type === 'alert' ? (
                  <AlertCircle className="h-10 w-10 text-rose-500" />
                ) : (
                  <Info className="h-10 w-10 text-brand-gold" />
                )}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-bold text-text-primary">
                  {newestUnread.title}
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {newestUnread.message}
                </p>
                {newestUnread.metadata?.url && (
                  <p className="mt-2 text-[10px] text-brand-gold uppercase font-black tracking-widest flex items-center gap-1">
                    Click to view <Bell className="w-3 h-3" />
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex border-l border-white/5">
            <button
              onClick={async (e) => {
                e.stopPropagation();
                toast.dismiss(t.id);
                try {
                  await notificationService.markNotificationRead(newestUnread.id);
                } catch (err) {
                  console.error("Failed to mark as read:", err);
                }
              }}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-brand-gold hover:text-amber-400 focus:outline-none"
            >
              Close
            </button>
          </div>
        </div>
      ), {
        duration: newestUnread.metadata?.url ? 6000 : 3500,
        position: 'top-center'
      });

      // Request browser notification permission for high-priority alerts
      if (typeof window.Notification !== 'undefined' && window.Notification.permission === 'default') {
        window.Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            subscribeToPushNotifications();
          }
        });
      }
    }
  }, [user?.id, notifications]);

  async function subscribeToPushNotifications() {
    try {
      if (!('serviceWorker' in navigator && 'PushManager' in window)) return;
      
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY
      });
      
      await fetch('/api/push/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscription),
        headers: { 'content-type': 'application/json' }
      });
    } catch (err) {
      console.error("Failed to subscribe to push notifications:", err);
    }
  }

  return null;
};
