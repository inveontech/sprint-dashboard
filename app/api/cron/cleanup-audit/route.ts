import { NextResponse } from 'next/server';
import { cleanupOldAuditLogs, getAuditLogCount } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// Secret key for cron job authentication (optional but recommended)
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * POST /api/cron/cleanup-audit
 * 
 * Cleanup audit logs older than 90 days.
 * Can be called by:
 * - Vercel Cron (with CRON_SECRET header)
 * - Manual trigger (admin only, with Authorization header)
 * - External cron service (with CRON_SECRET query param)
 */
export async function POST(request: Request) {
  try {
    // Verify cron secret if configured
    if (CRON_SECRET) {
      const authHeader = request.headers.get('authorization');
      const url = new URL(request.url);
      const querySecret = url.searchParams.get('secret');
      
      // Check header or query param for secret
      const providedSecret = authHeader?.replace('Bearer ', '') || querySecret;
      
      if (providedSecret !== CRON_SECRET) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Get count before cleanup
    const countBefore = await getAuditLogCount();
    
    // Delete logs older than 90 days
    const deletedCount = await cleanupOldAuditLogs(90);
    
    // Get count after cleanup
    const countAfter = await getAuditLogCount();

    return NextResponse.json({
      success: true,
      message: `Audit log cleanup completed`,
      stats: {
        deletedCount,
        countBefore,
        countAfter,
        retentionDays: 90,
        executedAt: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Audit cleanup failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to cleanup audit logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/cleanup-audit
 * 
 * Get audit log stats without cleanup (for monitoring)
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret if configured
    if (CRON_SECRET) {
      const authHeader = request.headers.get('authorization');
      const url = new URL(request.url);
      const querySecret = url.searchParams.get('secret');
      
      const providedSecret = authHeader?.replace('Bearer ', '') || querySecret;
      
      if (providedSecret !== CRON_SECRET) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const count = await getAuditLogCount();

    return NextResponse.json({
      success: true,
      stats: {
        totalCount: count,
        retentionDays: 90,
        queriedAt: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Audit stats failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get audit stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
