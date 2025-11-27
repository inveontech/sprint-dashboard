import { NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira';
import { parseISO, isBefore } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const customerFilter = searchParams.get('customer');
    const sprintId = parseInt(params.id, 10);

    if (isNaN(sprintId)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid sprint ID. Must be a number.' 
        },
        { status: 400 }
      );
    }

    const jira = new JiraClient();
    
    // Get current sprint details
    const sprintDetails = await jira.getSprintDetails(sprintId);

    // Format sprint info
    const sprint = {
      id: sprintDetails.sprint.id,
      name: sprintDetails.sprint.name,
      startDate: sprintDetails.sprint.startDate || '',
      endDate: sprintDetails.sprint.endDate || '',
      completeDate: sprintDetails.sprint.completeDate || '',
      state: sprintDetails.sprint.state,
      goal: sprintDetails.sprint.goal,
      customer: sprintDetails.metrics.customers.length > 0 
        ? sprintDetails.metrics.customers[0] 
        : 'N/A',
    };

    // Format issues - filter by customer if provided
    let filteredIssues = sprintDetails.issues;
    if (customerFilter) {
      filteredIssues = filteredIssues.filter((issue: any) => issue.customer === customerFilter);
    }
    
    const issues = filteredIssues.map((issue: any) => ({
      key: issue.key,
      summary: issue.summary,
      status: issue.status?.name || issue.status || 'N/A',
      storyPoints: issue.storyPoints || 0,
      customer: issue.customer || 'N/A',
      assignee: issue.assignee?.displayName || 'N/A',
      priority: issue.priority?.name || 'N/A',
      issueType: issue.issueType?.name || 'N/A',
      created: issue.created,
      dueDate: issue.dueDate,
      resolutionDate: issue.resolutionDate,
    }));

    // Recalculate metrics based on filtered issues
    const totalPoints = filteredIssues.reduce((sum: number, issue: any) => sum + (issue.storyPoints || 0), 0);
    const completedIssues = filteredIssues.filter((issue: any) => {
      const status = issue.status?.name || issue.status || '';
      return status === 'Done';
    });
    const completedPoints = completedIssues.reduce((sum: number, issue: any) => sum + (issue.storyPoints || 0), 0);
    const bugCount = filteredIssues.filter((issue: any) => issue.issueType?.name === 'Bug').length;

    // Calculate issue types with story points
    const issueTypeMap = new Map<string, { count: number; storyPoints: number }>();
    filteredIssues.forEach((issue: any) => {
      const type = issue.issueType?.name || 'Other';
      const existing = issueTypeMap.get(type) || { count: 0, storyPoints: 0 };
      issueTypeMap.set(type, {
        count: existing.count + 1,
        storyPoints: existing.storyPoints + (issue.storyPoints || 0)
      });
    });
    
    const issueTypes = Array.from(issueTypeMap.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      storyPoints: data.storyPoints
    }));

    // Get unique customers
    const customers = customerFilter 
      ? [customerFilter]
      : Array.from(new Set(filteredIssues.map((issue: any) => issue.customer).filter(Boolean)));

    // Get targetPoints - use from sprintDetails which already considers customer filter
    const targetPoints = sprintDetails.metrics.targetPoints;
    const targetAchievement = sprintDetails.metrics.targetAchievement;
    const completionRate = sprintDetails.metrics.completionRate;

    // Format metrics - use values from sprintDetails which are already correctly calculated
    const metrics = {
      totalPoints,
      completedPoints,
      completionRate,  // Use the one from sprintDetails (target-based)
      velocity: completedPoints,
      targetPoints,
      targetAchievement,
      bugCount,
      issuesByStatus: sprintDetails.metrics.issuesByStatus,
      customers,
    };

    // Find previous sprint for comparison
    let comparison = undefined;
    try {
      const closedSprints = await jira.getClosedSprints(6); // Last 6 months
      
      if (closedSprints.length > 0 && sprintDetails.sprint.completeDate) {
        const currentSprintDate = parseISO(sprintDetails.sprint.completeDate);
        
        // Find the sprint that was completed just before this one
        const previousSprint = closedSprints
          .filter(s => s.id !== sprintId && s.completeDate)
          .filter(s => {
            const sprintDate = parseISO(s.completeDate!);
            return isBefore(sprintDate, currentSprintDate);
          })
          .sort((a, b) => {
            const dateA = parseISO(a.completeDate!);
            const dateB = parseISO(b.completeDate!);
            return dateB.getTime() - dateA.getTime();
          })[0];

        if (previousSprint) {
          const previousDetails = await jira.getSprintDetails(previousSprint.id);
          
          const velocityDelta = sprintDetails.metrics.completedPoints - previousDetails.metrics.completedPoints;
          const completionRateDelta = sprintDetails.metrics.completionRate - previousDetails.metrics.completionRate;

          comparison = {
            previousSprintId: previousSprint.id,
            previousSprintName: previousSprint.name,
            velocityDelta,
            completionRateDelta,
            previousVelocity: previousDetails.metrics.completedPoints,
            previousCompletionRate: previousDetails.metrics.completionRate,
          };
        }
      }
    } catch (comparisonError) {
      // If comparison fails, just continue without it
      console.warn('Failed to get comparison data:', comparisonError);
    }

    const responseData = {
      success: true,
      sprint,
      metrics,
      issues,
      issueTypes,
      customers,
      comparison,
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Jira API Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch sprint data' 
      },
      { status: 500 }
    );
  }
}
