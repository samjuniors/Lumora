import { useEffect } from 'react';
import { User } from '../types';
import { userService, notificationService } from '../services/dbProvider';
import { getCleanInventory } from '../lib/utils';

export const useMaintenance = (user: User | null) => {
  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;

    const performMaintenance = async () => {
      try {
        // Balance cleanup - ensure minimum coins is 0
        if ((user.coins || 0) < 0) {
          await userService.updateUser(user.id, { coins: 0 });
        }

        if (!isMounted) return;

        // Inventory cleanup - only if needed
        const cleanInv = getCleanInventory(user);
        if (cleanInv.length !== (user.inventory?.length || 0)) {
          await userService.updateUser(user.id, { inventory: cleanInv });
        }

        if (!isMounted) return;

        // Welcome notification - strictly once per 24 hours
        const storageKey = `welcome_notified_${user.id}`;
        const lastNotified = localStorage.getItem(storageKey);
        const now = Date.now();
        const ONE_DAY = 24 * 60 * 60 * 1000;

        if (!lastNotified || now - parseInt(lastNotified) > ONE_DAY) {
          localStorage.setItem(storageKey, now.toString());
          await notificationService.createNotification({
            userId: user.id,
            title: `Welcome back, ${user.name}!`,
            message: "Ready for today's research missions?",
            type: 'info',
            read: false,
            createdAt: Date.now()
          });
        }
      } catch (err) {
        // Essential diagnostics preserved but quiet
      }
    };

    performMaintenance();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);
};
