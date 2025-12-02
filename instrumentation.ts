// This file is required for Next.js instrumentation and server initialization
// It runs once when the server starts

export async function register() {
  // Only initialize on server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🔧 Initializing server services...');
    
    // Initialize audit log cleanup scheduler (daily at 3:00 AM, keeps last 14 days)
    try {
      const { initializeAuditCleanupScheduler } = await import('@/lib/audit-scheduler');
      initializeAuditCleanupScheduler();
    } catch (error) {
      console.error('❌ Failed to initialize audit cleanup scheduler:', error);
    }
    
    // Initialize snapshot scheduler (every Monday at 8:00 AM)
    try {
      const { initializeSnapshotScheduler } = await import('@/lib/snapshot-scheduler');
      initializeSnapshotScheduler();
    } catch (error) {
      console.error('❌ Failed to initialize snapshot scheduler:', error);
    }
  }
}
