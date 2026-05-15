import { useEffect } from 'react';
import { dbService } from '../services/dbProvider';

export const usePresence = (userId: string | undefined) => {
  useEffect(() => {
    if (!userId) return;

    const updateStatus = (status: 'online' | 'idle' | 'offline') => {
      dbService.updatePresence(userId, status);
    };

    // Set online
    updateStatus('online');

    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateStatus('idle');
      } else {
        updateStatus('online');
      }
    };

    const handleBeforeUnload = () => {
      updateStatus('offline');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Idle timeout (5 minutes)
    let idleTimer: any;
    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      if (!document.hidden) {
        updateStatus('online');
      }
      idleTimer = setTimeout(() => {
        updateStatus('idle');
      }, 5 * 60 * 1000);
    };

    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);
    resetIdleTimer();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      clearTimeout(idleTimer);
      updateStatus('offline');
    };
  }, [userId]);
};
