import { useQuery } from '@tanstack/react-query';
import { userService } from '../../services/dbProvider';
import { useAuth } from '../../context/AuthContext';

export function useProfile() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user', user?.id],
    queryFn: async () => {
      if (!user) return null;
      return userService.getUser(user.id);
    },
    enabled: !!user?.id,
    placeholderData: (prev) => prev,
    refetchInterval: 60000, // Poll every minute for updates
  });
}
