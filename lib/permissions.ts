import type { Role, Permission, SafeUser } from '@/types/auth';

// ============================================================================
// Permission Definitions
// ============================================================================

/**
 * All available permissions in the system
 */
export const ALL_PERMISSIONS: Permission[] = [
  'sprint:read',
  'sprint:write',
  'settings:read',
  'settings:write',
  'developers:read',
  'developers:write',
  'ai:analyze',
  'users:read',
  'users:write',
];

/**
 * Role to permissions mapping
 * 
 * | Role      | sprint:read | sprint:write | settings | developers | ai:analyze | users |
 * |-----------|-------------|--------------|----------|------------|------------|-------|
 * | admin     | ✅          | ✅           | ✅       | ✅         | ✅         | ✅    |
 * | pm        | ✅          | ✅           | ✅       | ✅         | ✅         | ❌    |
 * | developer | ✅          | ❌           | ❌       | own only   | ❌         | ❌    |
 * | viewer    | ✅          | ❌           | ❌       | ❌         | ❌         | ❌    |
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'sprint:read',
    'sprint:write',
    'settings:read',
    'settings:write',
    'developers:read',
    'developers:write',
    'ai:analyze',
    'users:read',
    'users:write',
  ],
  pm: [
    'sprint:read',
    'sprint:write',
    'settings:read',
    'settings:write',
    'developers:read',
    'developers:write',
    'ai:analyze',
  ],
  developer: [
    'sprint:read',
    'developers:read', // Can only see their own data - enforced at API level
  ],
  viewer: [
    'sprint:read',
  ],
};

/**
 * Human-readable role names
 */
export const ROLE_NAMES: Record<Role, string> = {
  admin: 'Administrator',
  pm: 'Project Manager',
  developer: 'Developer',
  viewer: 'Viewer',
};

/**
 * Human-readable permission descriptions
 */
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  'sprint:read': 'View sprint data and reports',
  'sprint:write': 'Create and modify sprint data',
  'settings:read': 'View system settings',
  'settings:write': 'Modify system settings',
  'developers:read': 'View developer performance data',
  'developers:write': 'Modify developer targets and data',
  'ai:analyze': 'Use AI analysis features',
  'users:read': 'View user list and details',
  'users:write': 'Create, modify, and delete users',
};

// ============================================================================
// Permission Helpers
// ============================================================================

/**
 * Get permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: SafeUser | null, permission: Permission): boolean {
  if (!user) return false;
  return user.permissions.includes(permission);
}

/**
 * Check if a user has all specified permissions
 */
export function hasAllPermissions(user: SafeUser | null, permissions: Permission[]): boolean {
  if (!user) return false;
  return permissions.every(p => user.permissions.includes(p));
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(user: SafeUser | null, permissions: Permission[]): boolean {
  if (!user) return false;
  return permissions.some(p => user.permissions.includes(p));
}

/**
 * Check if user is admin
 */
export function isAdmin(user: SafeUser | null): boolean {
  return user?.role === 'admin';
}

/**
 * Check if user is PM or higher
 */
export function isPMOrAbove(user: SafeUser | null): boolean {
  return user?.role === 'admin' || user?.role === 'pm';
}

/**
 * Check if user can access developer data
 * Admins and PMs can access all developer data
 * Developers can only access their own data
 */
export function canAccessDeveloperData(
  user: SafeUser | null, 
  targetDeveloperId?: string
): boolean {
  if (!user) return false;
  
  // Admin and PM can access all
  if (isPMOrAbove(user)) return true;
  
  // Developers can only access their own data
  if (user.role === 'developer') {
    if (!targetDeveloperId) return false;
    return user.id === targetDeveloperId || user.email === targetDeveloperId;
  }
  
  return false;
}

// ============================================================================
// Route Protection Helpers
// ============================================================================

/**
 * Permission requirements for API routes
 */
export const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  // Sprint routes
  '/api/jira/sprints': ['sprint:read'],
  '/api/jira/sprint': ['sprint:read'],
  
  // Developer routes
  '/api/jira/developers': ['developers:read'],
  
  // Customer routes
  '/api/jira/customers': ['sprint:read'],
  '/api/jira/customer-issues': ['sprint:read'],
  '/api/jira/customer-trends': ['sprint:read'],
  
  // Other Jira routes
  '/api/jira/overdue': ['sprint:read'],
  '/api/jira/pm-metrics': ['sprint:read'],
  '/api/jira/test-failures': ['sprint:read'],
  
  // Settings routes (read)
  '/api/settings/sprint-targets': ['settings:read'],
  '/api/settings/customer-targets': ['settings:read'],
  '/api/settings/developer-targets': ['developers:read'],
  
  // AI routes
  '/api/claude/analyze': ['ai:analyze'],
};

/**
 * Write permission requirements (POST, PUT, DELETE)
 */
export const WRITE_ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  '/api/settings/sprint-targets': ['settings:write'],
  '/api/settings/customer-targets': ['settings:write'],
  '/api/settings/developer-targets': ['developers:write'],
};

/**
 * Get required permissions for a route
 */
export function getRoutePermissions(
  pathname: string, 
  method: string
): Permission[] {
  // Normalize pathname (remove trailing slash, handle dynamic routes)
  const normalizedPath = pathname
    .replace(/\/$/, '')
    .replace(/\/\[.*?\]/g, ''); // Remove dynamic segments
  
  // Check write permissions for mutating methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
    const writePerms = WRITE_ROUTE_PERMISSIONS[normalizedPath];
    if (writePerms) return writePerms;
  }
  
  // Return read permissions
  return ROUTE_PERMISSIONS[normalizedPath] || [];
}

/**
 * Check if a route requires authentication
 */
export function isProtectedRoute(pathname: string): boolean {
  // Public routes
  const publicRoutes = [
    '/api/auth/login',
    '/api/auth/refresh',
    '/login',
    '/_next',
    '/favicon.ico',
  ];
  
  return !publicRoutes.some(route => pathname.startsWith(route));
}

/**
 * Check if user can access a route
 */
export function canAccessRoute(
  user: SafeUser | null,
  pathname: string,
  method: string = 'GET'
): boolean {
  if (!isProtectedRoute(pathname)) return true;
  if (!user) return false;
  
  const requiredPermissions = getRoutePermissions(pathname, method);
  
  // If no specific permissions required, just need to be authenticated
  if (requiredPermissions.length === 0) return true;
  
  return hasAnyPermission(user, requiredPermissions);
}

// ============================================================================
// UI Helpers
// ============================================================================

/**
 * Get visible menu items for a user
 */
export function getVisibleMenuItems(user: SafeUser | null): string[] {
  if (!user) return [];
  
  const items: string[] = [];
  
  // All authenticated users can see dashboard
  items.push('/');
  
  // Viewer role - limited access only to sprint-reports and sprint-comparison
  if (user.role === 'viewer') {
    items.push('/sprint-reports');
    items.push('/sprint-comparison');
    return items;
  }
  
  // Sprint-related pages (for pm, developer, admin)
  if (hasPermission(user, 'sprint:read')) {
    items.push('/sprint-comparison');
    items.push('/sprint-reports');
    items.push('/sprint-details');
    items.push('/overdue-tasks');
    items.push('/test-failures');
    items.push('/pm-dashboard');
  }
  
  // Developer performance
  if (hasPermission(user, 'developers:read')) {
    items.push('/developer-performance');
  }
  
  // AI Analysis
  if (hasPermission(user, 'ai:analyze')) {
    items.push('/ai-analysis');
  }
  
  // Settings
  if (hasPermission(user, 'settings:read')) {
    items.push('/settings');
  }
  
  return items;
}

/**
 * Check if a menu item should be visible for user
 */
export function isMenuItemVisible(user: SafeUser | null, path: string): boolean {
  return getVisibleMenuItems(user).includes(path);
}
