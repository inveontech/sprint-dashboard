import { NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira';

export const dynamic = 'force-dynamic';

interface TestFailureData {
  key: string;
  summary: string;
  customer: string;
  taskOwner: string;
  issueType: string;
  status: string;
  created: string;
  dueDate?: string | null;
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
    
    const details = await jiraClient.getSprintDetails(sprint.id);
    const testFailures: TestFailureData[] = [];
    
    // For each issue, check if it ever had "Test Failed" status
    // Use a batch approach with delays to avoid rate limiting
    for (let i = 0; i < details.issues.length; i++) {
      const issue = details.issues[i];
      
      try {
        // Add delay every 5 requests to avoid rate limiting
        if (i > 0 && i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        const changelog = await jiraClient.getIssueChangelog(issue.key);
        
        // Check if issue ever had "Test Failed" status
        const hasTestFailed = changelog.some(
          (entry: any) => 
            entry.toString?.().includes('Test Failed') ||
            entry.status?.toLowerCase?.().includes('test failed')
        );
        
        if (hasTestFailed) {
          testFailures.push({
            key: issue.key,
            summary: issue.summary,
            customer: issue.customer || 'Unknown',
            taskOwner: issue.taskOwner || issue.assignee?.displayName || 'Unassigned',
            issueType: issue.issueType?.name || 'Unknown',
            status: issue.status,
            created: issue.created,
            dueDate: issue.dueDate,
          });
        }
      } catch (err) {
        console.warn(`Failed to get changelog for ${issue.key}:`, err);
        // Continue with next issue instead of failing
      }
      
      // Stop if we have enough results
      if (testFailures.length >= 10) break;
    }
    
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
