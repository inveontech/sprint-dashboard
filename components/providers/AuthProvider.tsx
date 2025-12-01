'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { SafeUser, LoginResponse } from '@/types/auth';

interface AuthContextType {
  user: SafeUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Check if current path is login page
  const isLoginPage = pathname === '/login';

  // Initialize auth state
  const initAuth = useCallback(async () => {
    try {
      const storedUser = localStorage.getItem('user');
      const accessToken = localStorage.getItem('access_token');

      if (!storedUser || !accessToken) {
        setIsLoading(false);
        return;
      }

      // Verify token is still valid
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        
        // Update stored user data
        localStorage.setItem('user', JSON.stringify(data.user));
      } else if (response.status === 401) {
        // Token expired, try refresh
        const refreshed = await refreshAuthInternal();
        if (!refreshed && !isLoginPage) {
          clearAuth();
          router.push('/login');
        }
      } else {
        clearAuth();
      }
    } catch (error) {
      console.error('Auth init error:', error);
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  }, [isLoginPage, router]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!tokenExpiry) return;

    const timeUntilRefresh = tokenExpiry - Date.now() - TOKEN_REFRESH_THRESHOLD;
    
    if (timeUntilRefresh <= 0) {
      refreshAuthInternal();
      return;
    }

    const timer = setTimeout(() => {
      refreshAuthInternal();
    }, timeUntilRefresh);

    return () => clearTimeout(timer);
  }, [tokenExpiry]);

  const clearAuth = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    setUser(null);
    setTokenExpiry(null);
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'Login failed' };
      }

      const loginResponse = data as LoginResponse;

      // Store tokens
      localStorage.setItem('access_token', loginResponse.accessToken);
      localStorage.setItem('refresh_token', loginResponse.refreshToken);
      localStorage.setItem('user', JSON.stringify(loginResponse.user));

      // Set cookie for middleware
      document.cookie = `access_token=${loginResponse.accessToken}; path=/; max-age=${loginResponse.expiresIn}; SameSite=Lax`;

      // Set token expiry
      setTokenExpiry(Date.now() + loginResponse.expiresIn * 1000);

      // Set user
      setUser(loginResponse.user);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');

      if (accessToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
      router.push('/login');
    }
  };

  const refreshAuthInternal = async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken) {
        return false;
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json() as LoginResponse;

      // Update tokens
      localStorage.setItem('access_token', data.accessToken);
      localStorage.setItem('refresh_token', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Update cookie
      document.cookie = `access_token=${data.accessToken}; path=/; max-age=${data.expiresIn}; SameSite=Lax`;

      // Update state
      setUser(data.user);
      setTokenExpiry(Date.now() + data.expiresIn * 1000);

      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  };

  const refreshAuth = async (): Promise<boolean> => {
    const success = await refreshAuthInternal();
    if (!success && !isLoginPage) {
      clearAuth();
      router.push('/login');
    }
    return success;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for permission checking
export function usePermission(permission: string): boolean {
  const { user } = useAuth();
  if (!user) return false;
  return user.permissions.includes(permission as SafeUser['permissions'][number]);
}

// Hook for role checking
export function useRole(): SafeUser['role'] | null {
  const { user } = useAuth();
  return user?.role || null;
}

// Hook for checking if user is admin or PM
export function useIsManager(): boolean {
  const role = useRole();
  return role === 'admin' || role === 'pm';
}
