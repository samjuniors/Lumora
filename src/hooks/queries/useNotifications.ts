import { useQuery } from '@tanstack/react-query';
import { dbService } from '../../services/dbProvider';
import { useAuth } from '../../context/AuthContext';

export function useNotifications() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Replace with fetching method on dbService instead of using the interface specifically 
      // if it's abstracted. It's `dbService.getUserNotifications(user.id);`
      return dbService.getUserNotifications(user.id);
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Poll every 30 seconds
  });
}
