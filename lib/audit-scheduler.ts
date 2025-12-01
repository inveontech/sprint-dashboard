import cron from 'node-cron';
import { cleanupOldAuditLogs, getAuditLogCount } from './audit';

let isInitialized = false;

/**
 * Initialize audit log cleanup scheduler
 * Runs daily at 3:00 AM to clean up logs older than 14 days
 */
export function initializeAuditCleanupScheduler() {
  if (isInitialized) {
    console.log('⏳ Audit cleanup scheduler already initialized');
    return;
  }

  // Run daily at 3:00 AM (0 3 * * *)
  // Cron format: minute hour day month dayOfWeek
  const task = cron.schedule('0 3 * * *', async () => {
    console.log('🧹 [SCHEDULED] Starting daily audit log cleanup...');

    try {
      const countBefore = await getAuditLogCount();
      
      // Keep last 14 days of logs
      const RETENTION_DAYS = 14;
      const deletedCount = await cleanupOldAuditLogs(RETENTION_DAYS);
      
      const countAfter = await getAuditLogCount();

      console.log(`✅ [SCHEDULED] Audit log cleanup completed`);
      console.log(`   Deleted: ${deletedCount} logs older than ${RETENTION_DAYS} days`);
      console.log(`   Before: ${countBefore} | After: ${countAfter}`);
    } catch (error) {
      console.error('❌ [SCHEDULED] Audit log cleanup failed:', error);
    }
  });

  task.start();
  isInitialized = true;
  
  console.log('📅 Audit cleanup scheduled: Daily at 3:00 AM (keeps last 14 days)');
}
