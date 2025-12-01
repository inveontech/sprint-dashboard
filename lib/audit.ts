import { prisma } from './prisma';
import { AuditAction, Prisma } from '@prisma/client';

// Re-export AuditAction enum for use in other files
export { AuditAction };

// ============================================================================
// Audit Log Types
// ============================================================================

export interface AuditLogDetails {
  // Generic key-value for flexible audit data
  [key: string]: unknown;
}

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  userId: string;
  targetId: string | null;
  details: AuditLogDetails | null;
  ipAddress: string | null;
  createdAt: Date;
}

// ============================================================================
// Audit Log Functions
// ============================================================================

/**
 * Log a command (create, update, delete operations)
 * Only commands are logged, queries are not (CQRS principle)
 */
export async function logCommand(
  action: AuditAction,
  userId: string,
  targetId?: string,
  details?: AuditLogDetails,
  ipAddress?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId,
        targetId: targetId ?? null,
        // Prisma requires explicit JsonNull for null JSON values
        details: details ? (details as Prisma.InputJsonValue) : Prisma.JsonNull,
        ipAddress: ipAddress ?? null,
      },
    });
  } catch (error) {
    // Don't throw - audit logging should not break the main operation
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Get audit logs for a specific user (who performed the action)
 */
export async function getAuditLogsByUser(
  userId: string,
  limit: number = 100
): Promise<AuditLogEntry[]> {
  const logs = await prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return logs.map(log => ({
    id: log.id,
    action: log.action,
    userId: log.userId,
    targetId: log.targetId,
    details: log.details as AuditLogDetails | null,
    ipAddress: log.ipAddress,
    createdAt: log.createdAt,
  }));
}

/**
 * Get audit logs for a specific target (the user being acted upon)
 */
export async function getAuditLogsByTarget(
  targetId: string,
  limit: number = 100
): Promise<AuditLogEntry[]> {
  const logs = await prisma.auditLog.findMany({
    where: { targetId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return logs.map(log => ({
    id: log.id,
    action: log.action,
    userId: log.userId,
    targetId: log.targetId,
    details: log.details as AuditLogDetails | null,
    ipAddress: log.ipAddress,
    createdAt: log.createdAt,
  }));
}

/**
 * Get recent audit logs (admin dashboard)
 */
export async function getRecentAuditLogs(
  limit: number = 100
): Promise<AuditLogEntry[]> {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return logs.map(log => ({
    id: log.id,
    action: log.action,
    userId: log.userId,
    targetId: log.targetId,
    details: log.details as AuditLogDetails | null,
    ipAddress: log.ipAddress,
    createdAt: log.createdAt,
  }));
}

/**
 * Delete audit logs older than specified days
 * Called by cleanup cron job
 * Default: Keep last 14 days of logs
 */
export async function cleanupOldAuditLogs(
  daysOld: number = 14
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.auditLog.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  return result.count;
}

/**
 * Get audit log count (for admin stats)
 */
export async function getAuditLogCount(): Promise<number> {
  return prisma.auditLog.count();
}
