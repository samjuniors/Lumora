import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbProvider';
import { Bell, Check, Trash2, Info, CheckCircle, AlertCircle, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Notification } from '../types';

export const NotificationDropdown = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = dbService.subscribeToNotifications(user.id, (data) => {
      setNotifications(data);
    });

    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    if (!user || notifications.length === 0) return;
    try {
      await dbService.markAllNotificationsRead(user.id);
      toast.success('All marked as read');
    } catch (err) {
      console.error(err);
      toast.error('Failed to mark all as read');
    }
  };

  const clearAll = async () => {
    if (!user || notifications.length === 0) return;
    if (!window.confirm('Clear all notifications? This cannot be undone.')) return;
    
    try {
      await dbService.clearAllNotifications(user.id);
      setNotifications([]);
      toast.success('All notifications cleared');
    } catch (err) {
      console.error(err);
      toast.error('Failed to clear notifications');
    }
  };

  const deleteNotif = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await dbService.deleteNotification(id);
    } catch (err) {
      console.error(err);
    }
  };

  const markRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await dbService.markNotificationRead(id);
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
            "w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center transition-all duration-300 rounded-xl relative",
            unreadCount > 0 ? "bg-brand-gold-hover text-bg-main shadow-lg shadow-indigo-200" : "bg-bg-main text-text-secondary hover:text-brand-gold hover:bg-brand-gold-secondary-hover"
        )}
        title="Notifications"
      >
        <motion.div
           animate={unreadCount > 0 ? { rotate: [0, -15, 15, -15, 15, 0] } : {}}
           transition={unreadCount > 0 ? { repeat: Infinity, duration: 1.5, repeatDelay: 3, ease: 'easeInOut' } : {}}
           style={{ originX: 0.5, originY: 0 }}
        >
            <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
        </motion.div>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] sm:min-w-[24px] sm:h-[24px] bg-rose-500 text-bg-main text-[12px] sm:text-[14px] font-black flex items-center justify-center rounded-full border-2 border-white px-1">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
      {isOpen && (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5, transition: { duration: 0.15, ease: 'easeOut' } }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="absolute top-12 right-0 sm:-right-2 md:right-0 w-[280px] min-[360px]:w-[320px] sm:w-80 md:w-96 bg-bg-surface border border-border-main rounded-3xl shadow-2xl z-50 overflow-hidden origin-top-right"
        >
          <div className="px-6 py-5 bg-bg-main/80 border-b border-border-main flex justify-between items-center">
            <div>
              <h3 className="font-black text-text-primary leading-tight">Notifications</h3>
              <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-0.5">Stay Updated</p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button 
                  onClick={markAllRead}
                  className="text-[10px] font-black text-brand-gold uppercase tracking-widest hover:text-indigo-700 bg-brand-gold-secondary-hover px-3 py-1.5 rounded-lg transition-colors"
                >
                  Mark Read
                </button>
              )}
              {notifications.length > 0 && (
                <button 
                  onClick={clearAll}
                  className="p-1.5 text-text-secondary/80 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="Clear All"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-[28rem] overflow-y-auto hide-scrollbar">
            {notifications.length === 0 ? (
              <div className="px-6 py-20 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-bg-main rounded-full flex items-center justify-center mb-4">
                    <Bell className="w-8 h-8 text-text-secondary/30" />
                </div>
                <p className="text-text-secondary text-sm font-bold">No notifications yet.</p>
                <p className="text-[10px] text-text-secondary/60 font-medium uppercase mt-1">We'll alert you here</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div 
                  key={notif.id} 
                  className={cn(
                      "group px-6 py-5 border-b border-border-main/30 transition-colors flex gap-4",
                      !notif.read ? "bg-brand-gold/5" : "hover:bg-bg-main"
                  )}
                >
                  <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm",
                      notif.type === 'success' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                      notif.type === 'alert' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                      "bg-brand-gold/10 text-brand-gold border-brand-gold/20"
                  )}>
                      {notif.type === 'success' ? <CheckCircle size={18} /> : 
                       notif.type === 'alert' ? <AlertCircle size={18} /> : 
                       <Info size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">
                            {format(notif.createdAt, 'MMM dd, p')}
                        </span>
                        {!notif.read && <span className="w-2 h-2 bg-brand-gold rounded-full"></span>}
                    </div>
                    <p className="font-black text-sm text-text-primary leading-tight mb-1">{notif.title}</p>
                    <p className="text-xs text-text-secondary font-medium leading-relaxed">{notif.message}</p>
                    
                    <div className="flex items-center gap-3 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notif.read && (
                            <button onClick={(e) => markRead(e, notif.id)} className="flex items-center gap-1 text-[10px] font-black text-brand-gold uppercase hover:underline">
                                <Check size={12} /> Read
                            </button>
                        )}
                        <button onClick={(e) => deleteNotif(e, notif.id)} className="flex items-center gap-1 text-[10px] font-black text-text-secondary/80 hover:text-rose-500 uppercase">
                            <Trash2 size={12} /> Remove
                        </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {notifications.length > 0 && (
              <div className="p-4 bg-bg-main border-t border-border-main text-center">
                   <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">Showing latest 5 updates</p>
              </div>
          )}
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};
