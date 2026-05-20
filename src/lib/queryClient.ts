import { QueryClient, keepPreviousData, QueryCache } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: any) => {
      const message = error instanceof Error ? error.message : 'Uplink synchronization unsuccessful';
      console.error('Query error intercepted:', error);
      toast.error(`Sync Failure: ${message}`, { id: 'global-query-error' });
    }
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes default
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      placeholderData: keepPreviousData, // PERSIST data during refetches
    },
    mutations: {
      onError: (error: any) => {
        const message = error instanceof Error ? error.message : 'An error occurred';
        toast.error(message);
      },
    },
  },
});
