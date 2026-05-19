import { useQuery } from '@tanstack/react-query';
import { userService, submissionService } from '../../services/dbProvider';

export function useLeaderboardData() {
  return useQuery({
    queryKey: ['leaderboard-full'],
    queryFn: async () => {
      const [users, submissions] = await Promise.all([
        userService.getAllUsers(1000),
        submissionService.getAllAssessedSubmissions()
      ]);
      return { 
        users: users.filter(u => u.role === 'student'), 
        submissions 
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    placeholderData: (prev) => prev,
  });
}
