import { NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // Jira webhook sends sprint close event
    if (payload.webhookEvent === 'sprint:closed') {
      const sprint = payload.sprint;
      
      if (!sprint || !sprint.id) {
        return NextResponse.json(
          { error: 'Invalid sprint data in webhook' },
          { status: 400 }
        );
      }

      console.log(`📸 Capturing snapshot for sprint ${sprint.id} (${sprint.name})`);

      // Fetch sprint details and create snapshot
      const jiraClient = new JiraClient();
      const details = await jiraClient.getSprintDetails(sprint.id);

      // Prepare snapshot data
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

      // Save snapshot to file
      const snapshotDir = path.join(process.cwd(), 'data', 'sprint-snapshots');
      if (!fs.existsSync(snapshotDir)) {
        fs.mkdirSync(snapshotDir, { recursive: true });
      }

      const snapshotPath = path.join(snapshotDir, `${sprint.id}.json`);
      fs.writeFileSync(snapshotPath, JSON.stringify(snapshotData, null, 2), 'utf-8');

      console.log(`✅ Snapshot saved for sprint ${sprint.id}`);
      console.log(`   Issues: ${details.issues.length}`);
      console.log(`   File: ${snapshotPath}`);

      return NextResponse.json({
        success: true,
        sprintId: sprint.id,
        snapshotPath,
        issuesCount: details.issues.length,
        capturedAt: snapshotData.capturedAt,
      });
    }

    // Handle other webhook events gracefully
    return NextResponse.json({
      success: true,
      message: 'Webhook received but not a sprint:closed event',
    });
  } catch (error) {
    console.error('Failed to capture snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to capture snapshot', details: String(error) },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to manually trigger snapshot capture
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sprintId = searchParams.get('sprintId');

    if (!sprintId) {
      return NextResponse.json(
        { error: 'Missing sprintId parameter' },
        { status: 400 }
      );
    }

    console.log(`📸 Manual snapshot capture for sprint ${sprintId}`);

    const jiraClient = new JiraClient();
    const details = await jiraClient.getSprintDetails(parseInt(sprintId));

    const snapshotData = {
      sprint: {
        id: parseInt(sprintId),
        name: details.sprint?.name || `Sprint ${sprintId}`,
        state: 'closed',
        startDate: details.sprint?.startDate,
        endDate: details.sprint?.endDate,
        completeDate: details.sprint?.completeDate,
      },
      issues: details.issues,
      metrics: details.metrics,
      issueTypes: details.issueTypes,
      capturedAt: new Date().toISOString(),
    };

    const snapshotDir = path.join(process.cwd(), 'data', 'sprint-snapshots');
    if (!fs.existsSync(snapshotDir)) {
      fs.mkdirSync(snapshotDir, { recursive: true });
    }

    const snapshotPath = path.join(snapshotDir, `${sprintId}.json`);
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshotData, null, 2), 'utf-8');

    console.log(`✅ Snapshot saved for sprint ${sprintId}`);

    return NextResponse.json({
      success: true,
      sprintId,
      snapshotPath,
      issuesCount: details.issues.length,
      capturedAt: snapshotData.capturedAt,
    });
  } catch (error) {
    console.error('Failed to capture snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to capture snapshot', details: String(error) },
      { status: 500 }
    );
  }
}
