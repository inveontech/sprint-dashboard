'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

// Pages that viewers can access (restricted list)
const VIEWER_ALLOWED_PAGES = ['/', '/sprint-reports', '/sprint-comparison', '/login', '/signup'];

// Pages that require specific permissions
const PAGE_PERMISSIONS: Record<string, string[]> = {
  '/ai-analysis': ['ai:analyze'],
  '/developer-performance': ['developers:read'],
  '/settings': ['settings:read'],
  '/pm-dashboard': ['sprint:read'], // But viewers are excluded via role check
  '/overdue-tasks': ['sprint:read'],
  '/test-failures': ['sprint:read'],
  '/sprint-details': ['sprint:read'],
};

/**
 * Hook to guard pages based on user permissions
 * Redirects to home page if user doesn't have access
 */
export function usePermissionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Wait for auth to load
    if (isLoading) return;
    
    // Not logged in - let middleware handle redirect to login
    if (!user) return;
    
    // Viewer role - strict page access
    if (user.role === 'viewer') {
      const isAllowed = VIEWER_ALLOWED_PAGES.some(page => 
        pathname === page || pathname?.startsWith(page + '/')
      );
      
      if (!isAllowed) {
        router.replace('/sprint-reports');
        return;
      }
    }
    
    // Check page-specific permissions for other roles
    const requiredPermissions = Object.entries(PAGE_PERMISSIONS).find(([page]) => 
      pathname === page || pathname?.startsWith(page + '/')
    )?.[1];
    
    if (requiredPermissions) {
      const hasPermission = requiredPermissions.some(p => 
        user.permissions.includes(p as typeof user.permissions[number])
      );
      
      if (!hasPermission) {
        router.replace('/');
        return;
      }
    }
  }, [user, isLoading, pathname, router]);

  return { isLoading, user };
}
