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
import { useNotifications } from '../hooks/queries/useNotifications';

export const NotificationDropdown = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: notifications = [], refetch } = useNotifications();
  
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

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    if (!user || notifications.length === 0) return;
    try {
      await dbService.markAllNotificationsRead(user.id);
      refetch();
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
      refetch();
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
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const markRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await dbService.markNotificationRead(id);
      refetch();
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
            "w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center transition-all duration-300 rounded-full relative group shadow-sm",
            unreadCount > 0 ? "bg-brand-gold text-[#0A0F1A] shadow-lg shadow-brand-gold/20 ring-2 ring-brand-gold" : "bg-transparent text-text-secondary hover:text-white hover:bg-white/10"
        )}
        title="Notifications"
      >
        <motion.div
           animate={unreadCount > 0 ? { rotate: [0, -15, 15, -15, 15, 0] } : {}}
           transition={unreadCount > 0 ? { repeat: Infinity, duration: 1.5, repeatDelay: 3, ease: 'easeInOut' } : {}}
           style={{ originX: 0.5, originY: 0 }}
        >
            <Bell className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
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
          <div className="px-5 py-4 bg-bg-surface border-b border-border-main flex justify-between items-center rounded-t-3xl shadow-sm z-10 relative">
            <div>
              <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">Notifications</h3>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button 
                  onClick={markAllRead}
                  className="text-[10px] font-bold text-brand-gold bg-brand-gold/10 hover:bg-brand-gold/20 px-2 py-1 rounded transition-colors"
                >
                  Mark Read
                </button>
              )}
              {notifications.length > 0 && (
                <button 
                  onClick={clearAll}
                  className="p-1.5 text-text-secondary hover:text-rose-500 rounded transition-colors"
                  title="Clear All"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-[22rem] overflow-y-auto hide-scrollbar bg-bg-main">
            {notifications.length === 0 ? (
              <div className="px-6 py-16 text-center flex flex-col items-center">
                <div className="w-14 h-14 bg-bg-surface rounded-full flex items-center justify-center mb-3 shadow-inner">
                    <Bell className="w-6 h-6 text-text-secondary/40" />
                </div>
                <p className="text-text-primary text-sm font-bold">You're all caught up!</p>
                <p className="text-xs text-text-secondary mt-1">No new notifications.</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div 
                  key={notif.id} 
                  className={cn(
                      "group px-5 py-4 border-b border-border-main/50 transition-all flex gap-4 hover:bg-bg-surface relative",
                      !notif.read ? "bg-brand-gold/5" : "opacity-80"
                  )}
                >
                  {!notif.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-gold" />}
                  <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                      notif.type === 'success' ? "bg-emerald-500/10 text-emerald-500" :
                      notif.type === 'alert' ? "bg-rose-500/10 text-rose-500" :
                      "bg-brand-gold/10 text-brand-gold"
                  )}>
                      {notif.type === 'success' ? <CheckCircle size={18} /> : 
                       notif.type === 'alert' ? <AlertCircle size={18} /> : 
                       <Info size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-sm text-text-primary leading-tight truncate pr-4">{notif.title}</span>
                        <span className="text-[10px] text-text-secondary font-medium shrink-0">
                            {format(notif.createdAt, 'MMM dd, HH:mm')}
                        </span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">{notif.message}</p>
                    
                    <div className="flex items-center gap-4 mt-2">
                        {!notif.read && (
                            <button onClick={(e) => markRead(e, notif.id)} className="flex items-center gap-1 text-[10px] font-bold text-brand-gold hover:text-amber-400 transition-colors">
                                <Check size={12} /> Mark read
                            </button>
                        )}
                        <button onClick={(e) => deleteNotif(e, notif.id)} className="flex items-center gap-1 text-[10px] font-medium text-text-secondary hover:text-rose-500 transition-colors">
                            <Trash2 size={12} /> Delete
                        </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};
