import cron from 'node-cron';
import { JiraClient } from './jira';
import fs from 'fs';
import path from 'path';

let isRunning = false;

export function initializeSnapshotScheduler() {
  // Run every Monday at 8:00 AM (0 8 * * 1)
  // Cron format: minute hour day month dayOfWeek
  const task = cron.schedule('0 8 * * 1', async () => {
    if (isRunning) {
      console.log('⏳ Snapshot job already running, skipping...');
      return;
    }

    isRunning = true;
    console.log('📸 [SCHEDULED] Starting weekly snapshot capture...');

    try {
      const jiraClient = new JiraClient();
      
      // Get all closed sprints (last 50)
      const closedSprints = await jiraClient.getClosedSprints(50);
      
      if (closedSprints.length === 0) {
        console.log('⚠️  No closed sprints found');
        return;
      }

      const snapshotDir = path.join(process.cwd(), 'data', 'sprint-snapshots');
      if (!fs.existsSync(snapshotDir)) {
        fs.mkdirSync(snapshotDir, { recursive: true });
      }

      let capturedCount = 0;
      let skippedCount = 0;

      // Capture snapshots for all closed sprints
      for (const sprint of closedSprints) {
        const snapshotPath = path.join(snapshotDir, `${sprint.id}.json`);
        
        // Skip if snapshot already exists (only capture new sprints)
        if (fs.existsSync(snapshotPath)) {
          skippedCount++;
          continue;
        }

        try {
          console.log(`  → Capturing sprint ${sprint.id} (${sprint.name})`);
          const details = await jiraClient.getSprintDetails(sprint.id);

          const snapshotData = {
            sprint: {
              id: sprint.id,
              name: sprint.name,
              state: sprint.state,
              startDate: sprint.startDate,
              endDate: sprint.endDate,
              completeDate: sprint.completeDate,
            },
            issues: details.issues,
            metrics: details.metrics,
            issueTypes: details.issueTypes,
            capturedAt: new Date().toISOString(),
          };

          fs.writeFileSync(snapshotPath, JSON.stringify(snapshotData, null, 2), 'utf-8');
          capturedCount++;
          console.log(`    ✅ Snapshot saved (${details.issues.length} issues)`);
        } catch (error) {
          console.error(`    ❌ Failed to capture sprint ${sprint.id}:`, error);
        }
      }

      console.log(`\n✅ [SCHEDULED] Snapshot capture completed`);
      console.log(`   Captured: ${capturedCount} new snapshots`);
      console.log(`   Skipped: ${skippedCount} existing snapshots`);
      console.log(`   Total processed: ${closedSprints.length} sprints\n`);
    } catch (error) {
      console.error('❌ [SCHEDULED] Snapshot scheduler error:', error);
    } finally {
      isRunning = false;
    }
  });

  task.start();
  console.log('📅 Snapshot scheduler initialized (every Monday 8:00 AM)');
  return task;
}
