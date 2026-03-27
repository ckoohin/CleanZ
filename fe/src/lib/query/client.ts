import { QueryClient } from '@tanstack/react-query';

const defaultStaleTime = 5 * 60 * 1000; // 5 minutes
const defaultGcTime = 10 * 60 * 1000;   // 10 minutes (formerly cacheTime)

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: defaultStaleTime,
        gcTime: defaultGcTime,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Don't retry on 401 - auth errors
          const status = (error as { response?: { status?: number } })?.response?.status;
          if (status === 401) return false;
          return failureCount < 2;
        },
      },
    },
  });
}
