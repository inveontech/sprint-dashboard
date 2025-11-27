import { NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira';

export const dynamic = 'force-dynamic';

interface TestFailureData {
  key: string;
  summary: string;
  customer: string;
  taskOwner: string; // Task owner at the time of test failure
  issueType: string;
  currentStatus: string;
  failureCount: number;
  firstFailureDate: string;
  lastFailureDate: string;
  timeInTestFailed: number; // in hours
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sprintId = searchParams.get('sprintId');
    
    const jiraClient = new JiraClient();
    
    // Get sprint by ID or latest sprint
    let sprint;
    if (sprintId) {
      const allSprints = await jiraClient.getClosedSprints(200);
      sprint = allSprints.find(s => s.id.toString() === sprintId);
    } else {
      const allSprints = await jiraClient.getClosedSprints(1);
      sprint = allSprints[0];
    }
    
    if (!sprint) {
      return NextResponse.json([]);
    }
    
    console.log(`Processing sprint: ${sprint.name}`);
    
    // getSprintDetails uses snapshot with status at sprint end
    const details = await jiraClient.getSprintDetails(sprint.id);
    const testFailures: TestFailureData[] = [];
    
    // Analyze changelog for Test Failed during sprint period
    const sprintStart = new Date(sprint.startDate);
    const sprintEnd = new Date(sprint.completeDate || sprint.endDate);
    
    // Check each issue's changelog for "Test Failed" status DURING sprint
    for (const issue of details.issues) {
      const changelog = await jiraClient.getIssueChangelog(issue.key);
      
      const testFailedEntries: Array<{ 
        date: string; 
        from: string; 
        to: string;
        taskOwnerAtFailure: string; // Track who was assigned when it failed
      }> = [];
      let totalTimeInTestFailed = 0;
      
      // Build a timeline of task owner changes
      const taskOwnerTimeline: Array<{ date: Date; owner: string }> = [];
      
      // Analyze changelog for Test Failed status transitions DURING SPRINT ONLY
      for (const history of changelog.histories) {
        const historyDate = new Date(history.created);
        
        // Only consider changes that happened during the sprint
        if (historyDate < sprintStart || historyDate > sprintEnd) {
          continue;
        }
        
        // Track task owner changes
        for (const item of history.items) {
          if (item.field === 'Task Owner') {
            taskOwnerTimeline.push({
              date: historyDate,
              owner: item.toString || 'Unassigned'
            });
          }
        }
        
        for (const item of history.items) {
          if (item.field === 'status') {
            // Check if transitioned TO "Test Failed" during sprint
            if (item.toString === 'Test Failed') {
              // Find who was the task owner at this moment
              let taskOwnerAtFailure = issue.taskOwner || issue.assignee?.displayName || 'Unassigned';
              
              // Look backwards in timeline to find task owner at this date
              for (let i = taskOwnerTimeline.length - 1; i >= 0; i--) {
                if (taskOwnerTimeline[i].date <= historyDate) {
                  taskOwnerAtFailure = taskOwnerTimeline[i].owner;
                  break;
                }
              }
              
              testFailedEntries.push({
                date: history.created,
                from: item.fromString || '',
                to: item.toString || '',
                taskOwnerAtFailure: taskOwnerAtFailure.replace(/ - Inveon$/, '')
              });
            }
            
            // Calculate time spent in Test Failed during sprint
            if (item.fromString === 'Test Failed') {
              const exitDate = new Date(history.created);
              const prevEntry = testFailedEntries[testFailedEntries.length - 1];
              if (prevEntry) {
                const entryDate = new Date(prevEntry.date);
                const hoursInStatus = (exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60);
                totalTimeInTestFailed += Math.abs(hoursInStatus);
              }
            }
          }
        }
      }
      
      // If issue ever went through Test Failed, add it to results
      if (testFailedEntries.length > 0) {
        // Use task owner from FIRST test failure (the one who caused it)
        const firstFailureOwner = testFailedEntries[0].taskOwnerAtFailure;
        
        testFailures.push({
          key: issue.key,
          summary: issue.summary,
          customer: issue.customer || 'Unknown',
          taskOwner: firstFailureOwner, // Owner when it FIRST failed
          issueType: issue.issueType?.name || 'Unknown',
          currentStatus: issue.status,
          failureCount: testFailedEntries.length,
          firstFailureDate: testFailedEntries[0].date,
          lastFailureDate: testFailedEntries[testFailedEntries.length - 1].date,
          timeInTestFailed: Math.round(totalTimeInTestFailed),
        });
      }
    }
    
    // Sort by failure count (most failures first)
    testFailures.sort((a, b) => b.failureCount - a.failureCount);
    
    console.log(`Found ${testFailures.length} issues with test failures`);
    
    return NextResponse.json(testFailures);
  } catch (error) {
    console.error('Test failures API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test failures' },
      { status: 500 }
    );
  }
}
