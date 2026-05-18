import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

interface UseAsyncOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  showToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

export function useAsync<T>(
  asyncFn: (...args: any[]) => Promise<T>,
  options: UseAsyncOptions<T> = {}
) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    isLoading: false,
    error: null
  });

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: any[]) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      try {
        const result = await asyncFn(...args);
        
        if (isMounted.current) {
          setState({ data: result, isLoading: false, error: null });
          
          if (options.successMessage && options.showToast !== false) {
            toast.success(options.successMessage);
          }
          
          options.onSuccess?.(result);
        }
        return result;
      } catch (err: any) {
        const error = err instanceof Error ? err : new Error(String(err));
        
        if (isMounted.current) {
          setState({ data: null, isLoading: false, error });
          
          if (options.showToast !== false) {
            toast.error(options.errorMessage || error.message || 'An unexpected error occurred');
          }
          
          options.onError?.(error);
        }
        throw error;
      }
    },
    [asyncFn, options]
  );

  return {
    ...state,
    execute,
    reset: useCallback(() => {
      if (isMounted.current) {
        setState({ data: null, isLoading: false, error: null });
      }
    }, [])
  };
}

// Special hook for list data to handle empty states and caching patterns
export function useAsyncList<T>(
  fetchFn: () => Promise<T[]>,
  options: UseAsyncOptions<T[]> = {}
) {
  const asyncResult = useAsync(fetchFn, options);
  
  const isEmpty = !asyncResult.isLoading && (!asyncResult.data || asyncResult.data.length === 0);
  
  return {
    ...asyncResult,
    isEmpty,
    // Add a refresh alias for execute
    refresh: asyncResult.execute
  };
}
