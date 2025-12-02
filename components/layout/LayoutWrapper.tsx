'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/components/providers/AuthProvider';

// Pages that don't need the sidebar
const NO_SIDEBAR_PAGES = ['/', '/login', '/signup'];

// Pages that viewers can access (restricted list)
const VIEWER_ALLOWED_PAGES = ['/', '/sprint-reports', '/sprint-comparison', '/login', '/signup'];

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const isNoSidebarPage = NO_SIDEBAR_PAGES.includes(pathname);
  const isLoginPage = pathname === '/login';
  const isSignupPage = pathname === '/signup';

  // Permission guard effect - redirect viewers from restricted pages
  useEffect(() => {
    if (isLoading || !user) return;
    
    // Viewer role - strict page access
    if (user.role === 'viewer') {
      const isAllowed = VIEWER_ALLOWED_PAGES.some(page => 
        pathname === page || pathname?.startsWith(page + '/')
      );
      
      if (!isAllowed) {
        router.replace('/sprint-reports');
      }
    }
  }, [user, isLoading, pathname, router]);

  // Show login/signup page without sidebar
  if (isLoginPage || isSignupPage) {
    return <>{children}</>;
  }

  // Show homepage without sidebar
  if (pathname === '/') {
    return <>{children}</>;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Regular pages with sidebar
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-72 bg-gray-50 dark:bg-gray-950">
        {children}
      </main>
    </div>
  );
}
