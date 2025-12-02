# Sprint Dashboard - AI Coding Instructions

## 🎯 Development Philosophy

**Production-grade mindset required.** Follow these principles strictly:

- **KISS**: Prefer simple, readable solutions over clever abstractions
- **DRY**: Extract shared logic to `lib/` - never duplicate business logic
- **SOLID**: Single responsibility per file/function, depend on abstractions (interfaces in `types/`)
- **YAGNI**: Don't add features/abstractions until actually needed

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js App Router)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  app/                    │  components/              │  hooks/               │
│  ├── page.tsx (pages)    │  ├── ui/        (shadcn) │  └── usePermissionGuard│
│  └── api/ (routes)       │  ├── charts/    (recharts)│                       │
│                          │  ├── dashboard/ (widgets) │                       │
│                          │  ├── layout/    (Sidebar) │                       │
│                          │  └── providers/ (Auth)    │                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                              BACKEND SERVICES (lib/)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  lib/auth.ts      → User CRUD, JWT tokens (uses Prisma)                      │
│  lib/api-auth.ts  → withAuth() middleware, requireAuth()                     │
│  lib/permissions.ts → RBAC definitions, route guards                         │
│  lib/jira.ts      → Jira API client (with mock mode)                         │
│  lib/redis.ts     → Sessions, tokens, rate limits (with in-memory fallback)  │
│  lib/audit.ts     → Command logging (CQRS - only writes logged)              │
│  lib/prisma.ts    → Database client singleton                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                              DATA STORES                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  PostgreSQL (Prisma)     │  Redis                    │  JSON Files           │
│  ├── users               │  ├── sessions             │  ├── sprint-snapshots/│
│  └── audit_logs          │  ├── access_tokens        │  ├── sprint-targets   │
│                          │  ├── refresh_tokens       │  └── customer-targets │
│                          │  └── rate_limits          │                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Tech Stack:** Next.js 14 (App Router), TypeScript, Prisma (PostgreSQL), Redis (ioredis), Tailwind CSS, Recharts, Zod

## 🔐 Authentication & Authorization

### Hybrid Storage Pattern
| Data Type | Storage | Why |
|-----------|---------|-----|
| Users, Audit Logs | PostgreSQL | Relational, queryable, persistent |
| Sessions, Tokens | Redis | Fast TTL, auto-expiry, distributed |
| Rate Limits | Redis | Per-request checks, atomic counters |

### Role Hierarchy & Permissions
```
admin > pm > developer > viewer

┌──────────┬─────────────┬──────────────┬──────────┬────────────┬────────────┬───────┐
│ Role     │ sprint:read │ sprint:write │ settings │ developers │ ai:analyze │ users │
├──────────┼─────────────┼──────────────┼──────────┼────────────┼────────────┼───────┤
│ admin    │     ✅      │      ✅      │    ✅    │     ✅     │     ✅     │  ✅   │
│ pm       │     ✅      │      ✅      │    ✅    │     ✅     │     ✅     │  ❌   │
│ developer│     ✅      │      ❌      │    ❌    │  own only  │     ❌     │  ❌   │
│ viewer   │     ✅      │      ❌      │    ❌    │     ❌     │     ❌     │  ❌   │
└──────────┴─────────────┴──────────────┴──────────┴────────────┴────────────┴───────┘
```

**Viewer Restrictions:** Can ONLY access `/`, `/sprint-reports`, `/sprint-comparison`
- Enforced in: `Sidebar.tsx` (`VIEWER_ALLOWED_PAGES`), `usePermissionGuard` hook, `middleware.ts`

## 📊 Jira Integration & Mock Mode

### Custom Fields (environment variables)
```env
JIRA_CUSTOMER_FIELD=customfield_10000    # Customer/tenant name
JIRA_STORY_POINTS_FIELD=customfield_10002 # Story points
JIRA_TASK_OWNER_FIELD=customfield_10656   # Task owner (may differ from assignee)
```

### Sprint Snapshot System
Closed sprints are saved as JSON snapshots in `data/sprint-snapshots/{sprintId}.json`:
```json
{
  "sprint": {
    "id": 3550,
    "name": "2025.11.17 | Sprint 41",
    "state": "closed",
    "startDate": "...",
    "endDate": "...",
    "completeDate": "..."
  },
  "issues": [
    {
      "key": "INC-81959",
      "summary": "...",
      "status": "Done",
      "storyPoints": 3,
      "customer": "Hotiç",
      "assignee": { "displayName": "..." },
      "taskOwner": "...",
      "issueType": { "name": "Change Request" },
      "created": "...",
      "dueDate": "...",
      "resolutionDate": "..."
    }
  ]
}
```

### Mock Mode
Auto-enabled when Jira credentials are missing OR `JIRA_MOCK=true`:
- Reads from `data/sprint-snapshots/*.json`
- No real Jira API calls
- Perfect for local development

## 📁 Dependency Map (What Affects What)

### When Adding a New Page
```
1. app/{page-name}/page.tsx          → Create the page component
2. components/layout/Sidebar.tsx     → Add to menuItems array with permission
3. lib/permissions.ts                → Add to ROUTE_PERMISSIONS if protected
4. hooks/usePermissionGuard.ts       → Add to PAGE_PERMISSIONS if role-restricted
5. middleware.ts                     → Add to PUBLIC_ROUTES if unauthenticated access needed
```

### When Adding a New API Endpoint
```
1. app/api/{route}/route.ts          → Create route handler
2. lib/api-auth.ts                   → Use withAuth() for protection
3. lib/permissions.ts                → Add to ROUTE_PERMISSIONS / WRITE_ROUTE_PERMISSIONS
4. middleware.ts                     → Add to PROTECTED_API_ROUTES if needed
```

### When Adding a New User Role
```
1. types/auth.ts                     → Add to Role type
2. prisma/schema.prisma              → Add to Role enum, run migration
3. lib/permissions.ts                → Add to ROLE_PERMISSIONS, ROLE_NAMES, ROLE_HIERARCHY
4. components/layout/Sidebar.tsx     → Update hasPermission() if special rules
5. hooks/usePermissionGuard.ts       → Update if page restrictions needed
```

### When Adding a New Permission
```
1. types/auth.ts                     → Add to Permission type
2. lib/permissions.ts                → Add to ALL_PERMISSIONS, update ROLE_PERMISSIONS
3. lib/permissions.ts                → Add to ROUTE_PERMISSIONS for relevant routes
```

### When Modifying User Schema
```
1. prisma/schema.prisma              → Update User model
2. npx prisma migrate dev            → Create migration
3. lib/auth.ts                       → Update createUser, updateUser functions
4. types/auth.ts                     → Update User and SafeUser interfaces
5. prisma/seed.ts                    → Update if seed data affected
```

### When Adding Audit Logging
```
1. prisma/schema.prisma              → Add to AuditAction enum if new action
2. npx prisma migrate dev            → Create migration
3. lib/audit.ts                      → logCommand() already handles it
4. app/api/auth/users/*.ts           → Call logCommand() after mutations
```

## 🗃️ Data Files

| File | Purpose | Used By |
|------|---------|---------|
| `data/sprint-snapshots/{id}.json` | Cached sprint data | `lib/jira.ts`, mock mode |
| `data/sprint-targets.json` | Target SP per sprint | `app/api/settings/sprint-targets/` |
| `data/customer-targets.json` | Target SP per customer | `app/api/settings/customer-targets/` |
| `public/developer-targets.json` | Target metrics per dev | `app/api/settings/developer-targets/` |

## 🔑 Key Patterns

### API Route Protection
```typescript
// lib/api-auth.ts - withAuth pattern
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    // user is SafeUser with permissions array
    return NextResponse.json({ data });
  }, { 
    permissions: ['sprint:read'],  // Required permission(s)
    requireAll: false              // ANY permission (default) vs ALL
  });
}
```

### Client-Side Auth
```typescript
// components/providers/AuthProvider.tsx
const { user, login, logout, isLoading } = useAuth();
const hasAccess = usePermission('ai:analyze');
const isManager = useIsManager(); // admin or pm
const role = useRole();
```

### Audit Logging (Commands Only - CQRS)
```typescript
// Only log mutations, not queries
import { logCommand, AuditAction } from '@/lib/audit';

await logCommand(
  AuditAction.USER_CREATE,
  currentUser.id,
  newUser.id,
  { email: newUser.email, role: newUser.role },
  clientIP
);
```

### Zod Validation
```typescript
// Always validate request bodies
const schema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'pm', 'developer', 'viewer'] as const),
});
const result = schema.safeParse(body);
if (!result.success) {
  return NextResponse.json({ error: result.error }, { status: 400 });
}
```

## ⚙️ Development Commands

```bash
nvm use 20                    # Required Node version (see .nvmrc)
npm run dev                   # Runs on port 3010
npx prisma migrate dev        # Run migrations
npx prisma db seed            # Create admin user
npx prisma studio             # Database GUI (port 5555)
npx prisma generate           # Regenerate client after schema changes
```

## 🌍 Environment Variables

### Required
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/sprint_dashboard
JWT_SECRET=your-super-secret-key-change-in-production
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure-password
```

### Optional (with fallbacks)
```env
REDIS_URL=redis://localhost:6379       # Falls back to in-memory
JIRA_MOCK=true                         # Auto-detected if credentials missing
OPENAI_API_KEY=sk-...                  # For AI analysis feature
ANTHROPIC_API_KEY=sk-...               # Alternative AI provider
```

## 🚨 Common Pitfalls

1. **Never use `User` in API responses** - Always use `SafeUser` (excludes passwordHash)
2. **Always call `toSafeUser()`** before returning user data
3. **Token storage**: Access tokens in cookies (for middleware), refresh tokens in localStorage
4. **Login redirect**: Use `window.location.href` not `router.push()` to ensure cookies are set
5. **Permission checks**: Both middleware AND route handler should verify (defense in depth)
6. **Prisma in Next.js**: Use singleton from `lib/prisma.ts` to avoid connection exhaustion

## 📋 Checklist for PRs

- [ ] No `console.log` in production code (use proper logging)
- [ ] All API routes use `withAuth()` or explicitly public
- [ ] New pages added to Sidebar with correct permission
- [ ] Mutations have audit logging via `logCommand()`
- [ ] Request bodies validated with Zod
- [ ] Types updated in `types/` if data structures changed
- [ ] `SafeUser` used in all API responses (not `User`)
- [ ] Error responses use `AuthError` type: `{ code: string, message: string }`

