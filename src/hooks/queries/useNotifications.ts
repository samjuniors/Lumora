import { useQuery } from '@tanstack/react-query';
import { notificationService } from '../../services/dbProvider';
import { useAuth } from '../../context/AuthContext';

export function useNotifications() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Replace with fetching method on dbService instead of using the interface specifically 
      // if it's abstracted. It's `userService.getUserNotifications(user.id);`
      return notificationService.getUserNotifications(user.id);
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Poll every 30 seconds
  });
}
