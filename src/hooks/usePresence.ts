import { useEffect } from 'react';
import { dbService } from '../services/dbProvider';

export const usePresence = (userId: string | undefined) => {
  useEffect(() => {
    if (!userId) return;

    let currentStatus: 'online' | 'idle' | 'offline' = 'online';

    const updateStatus = (status: 'online' | 'idle' | 'offline') => {
      if (currentStatus === status && status !== 'online') return; // Don't spam if status matches
      currentStatus = status;
      dbService.updatePresence(userId, status).catch(console.warn);
    };

    // Initial heartbeat
    updateStatus('online');
    
    // Heartbeat every 2 minutes while active
    let heartbeatInterval = setInterval(() => {
       if (currentStatus === 'online') {
          dbService.updatePresence(userId, 'online').catch(console.warn);
       }
    }, 2 * 60 * 1000);

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
      if (currentStatus !== 'online' && !document.hidden) {
        updateStatus('online');
      }
      idleTimer = setTimeout(() => {
        updateStatus('idle');
      }, 5 * 60 * 1000);
    };

    // Throttle mousemove listeners
    let throttleTimer: any;
    const handleActivity = () => {
       if (throttleTimer) return;
       throttleTimer = setTimeout(() => {
         throttleTimer = null;
         resetIdleTimer();
       }, 5000);
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    resetIdleTimer();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      clearInterval(heartbeatInterval);
      clearTimeout(idleTimer);
      if (throttleTimer) clearTimeout(throttleTimer);
      updateStatus('offline');
    };
  }, [userId]);
};
