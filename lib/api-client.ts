import { useRouter } from 'next/navigation';

/**
 * Fetch wrapper that handles 401 responses by redirecting to login
 * Should be used in useEffect or event handlers that run on the client
 */
export async function fetchWithAuth(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  const response = await fetch(url, options);

  // If unauthorized, redirect to login
  if (response.status === 401) {
    // Clear auth data
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

    // Redirect to login - use window.location for immediate redirect
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  return response;
}

/**
 * Hook version for use in components
 */
export function useFetchWithAuth() {
  const router = useRouter();

  return async (
    url: string,
    options?: RequestInit,
  ): Promise<Response> => {
    const response = await fetch(url, options);

    if (response.status === 401) {
      // Clear auth data
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

      // Redirect to login
      router.push('/login');
    }

    return response;
  };
}
