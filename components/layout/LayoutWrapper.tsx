'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  if (isHomePage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 bg-gray-50 dark:bg-gray-950">
        {children}
      </main>
    </div>
  );
}
