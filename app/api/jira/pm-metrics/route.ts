import { NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira';

export const dynamic = 'force-dynamic';

interface PMMetrics {
  customer: string;
  totalTasks: number;
  pmApproval: {
    count: number;
    avgWaitDays: number;
    totalWaitDays: number;
  };
  waitingPM: {
    count: number;
    avgWaitDays: number;
    totalWaitDays: number;
  };
  merged: {
    count: number;
    avgWaitDays: number;
    totalWaitDays: number;
  };
  issues: Array<{
    key: string;
    summary: string;
    status: string;
    created: string;
    daysOpen: number;
    daysSinceUpdate: number;
    assignee: string | null;
  }>;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerFilter = searchParams.get('customer');
    
    const jiraClient = new JiraClient();
    
    // Get latest sprint and use its issues
    const sprints = await jiraClient.getClosedSprints(1);
    if (!sprints || sprints.length === 0) {
      return NextResponse.json([]);
    }
    
    const latestSprint = sprints[0];
    const sprintDetails = await jiraClient.getSprintDetails(latestSprint.id);
    
    console.log(`Analyzing PM metrics from sprint ${latestSprint.name}`);
    
    // PM statuses we're tracking
    const pmStatuses = ['PM Approval - Marka Dağılımı', 'Waiting PM', 'Merged'];
    
    // Aggregate metrics by customer
    const customerMap = new Map<string, PMMetrics>();
    const now = new Date();
    
    for (const issue of sprintDetails.issues) {
      const customer = issue.customer || 'Unknown';
      
      // Filter by customer if provided
      if (customerFilter && customer !== customerFilter) {
        continue;
      }
      
      // Only include issues currently in PM statuses
      if (!pmStatuses.includes(issue.status)) {
        continue;
      }
      
      const createdDate = new Date(issue.created);
      const updatedDate = new Date(issue.updated || issue.created);
      
      // Calculate days - set time to start of day for accurate day calculation
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const createdDay = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
      const updatedDay = new Date(updatedDate.getFullYear(), updatedDate.getMonth(), updatedDate.getDate());
      
      const daysOpen = Math.round((today.getTime() - createdDay.getTime()) / (1000 * 60 * 60 * 24));
      const daysSinceUpdate = Math.round((today.getTime() - updatedDay.getTime()) / (1000 * 60 * 60 * 24));
      
      // Initialize customer metrics if not exists
      if (!customerMap.has(customer)) {
        customerMap.set(customer, {
          customer,
          totalTasks: 0,
          pmApproval: { count: 0, avgWaitDays: 0, totalWaitDays: 0 },
          waitingPM: { count: 0, avgWaitDays: 0, totalWaitDays: 0 },
          merged: { count: 0, avgWaitDays: 0, totalWaitDays: 0 },
          issues: [],
        });
      }
      
      const metrics = customerMap.get(customer)!;
      metrics.totalTasks++;
      
      // Count by status
      if (issue.status === 'PM Approval - Marka Dağılımı') {
        metrics.pmApproval.count++;
        metrics.pmApproval.totalWaitDays += daysOpen;
      } else if (issue.status === 'Waiting PM') {
        metrics.waitingPM.count++;
        metrics.waitingPM.totalWaitDays += daysOpen;
      } else if (issue.status === 'Merged') {
        metrics.merged.count++;
        metrics.merged.totalWaitDays += daysOpen;
      }
      
      // Add to issues list
      metrics.issues.push({
        key: issue.key,
        summary: issue.summary,
        status: issue.status,
        created: createdDate.toISOString(),
        daysOpen,
        daysSinceUpdate,
        assignee: typeof issue.assignee === 'string' ? issue.assignee : (issue.assignee?.displayName || null),
      });
    }
    
    // Calculate averages
    const results = Array.from(customerMap.values()).map(metrics => {
      if (metrics.pmApproval.count > 0) {
        metrics.pmApproval.avgWaitDays = Math.round((metrics.pmApproval.totalWaitDays / metrics.pmApproval.count) * 10) / 10;
      }
      if (metrics.waitingPM.count > 0) {
        metrics.waitingPM.avgWaitDays = Math.round((metrics.waitingPM.totalWaitDays / metrics.waitingPM.count) * 10) / 10;
      }
      if (metrics.merged.count > 0) {
        metrics.merged.avgWaitDays = Math.round((metrics.merged.totalWaitDays / metrics.merged.count) * 10) / 10;
      }
      
      // Sort issues by days open (descending)
      metrics.issues.sort((a, b) => b.daysOpen - a.daysOpen);
      
      return metrics;
    });
    
    // Sort by total tasks (descending)
    results.sort((a, b) => b.totalTasks - a.totalTasks);
    
    return NextResponse.json(results);
  } catch (error: any) {
    console.error('PM Metrics API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch PM metrics' },
      { status: 500 }
    );
  }
}
