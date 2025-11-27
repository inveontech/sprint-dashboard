import { NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sprintId = searchParams.get('sprintId');
    
    const jiraClient = new JiraClient();
    const allSprints = await jiraClient.getClosedSprints(200); // Get all closed sprints
    
    // Get sprint by ID or latest sprint
    const sprints = sprintId 
      ? allSprints.filter(s => s.id.toString() === sprintId)
      : allSprints.slice(0, 1);
    
    console.log(`Processing ${sprints.length} sprint(s) for overdue analysis`);
    
    // Aggregate overdue metrics per developer
    const developerMap = new Map<string, {
      developer: string;
      totalTasks: number;
      overdueTasks: number;
      totalOverdueDays: number;
      issues: Array<{
        key: string;
        summary: string;
        dueDate: string;
        resolutionDate: string;
        overdueDays: number;
        customer: string;
      }>;
    }>();
    
    for (const sprint of sprints) {
      // getSprintDetails uses snapshot with historical status at sprint end
      const details = await jiraClient.getSprintDetails(sprint.id);
      
      for (const issue of details.issues) {
        // Use Task Owner field instead of assignee
        const taskOwner = issue.taskOwner || issue.assignee?.displayName || 'Unassigned';
        // Skip if no task owner assigned
        if (!taskOwner || taskOwner === 'Unassigned') {
          continue;
        }
        const devName = taskOwner.replace(/ - Inveon$/, '');
        
        // Only count completed tasks with due dates
        if (issue.status !== 'Done' || !issue.dueDate || !issue.resolutionDate) {
          continue;
        }
        
        const dueDate = new Date(issue.dueDate);
        const resolutionDate = new Date(issue.resolutionDate);
        const isOverdue = resolutionDate > dueDate;
        const overdueDays = isOverdue 
          ? Math.ceil((resolutionDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        
        if (!developerMap.has(devName)) {
          developerMap.set(devName, {
            developer: devName,
            totalTasks: 0,
            overdueTasks: 0,
            totalOverdueDays: 0,
            issues: [],
          });
        }
        
        const dev = developerMap.get(devName)!;
        dev.totalTasks++;
        
        if (isOverdue) {
          dev.overdueTasks++;
          dev.totalOverdueDays += overdueDays;
          dev.issues.push({
            key: issue.key,
            summary: issue.summary,
            dueDate: issue.dueDate,
            resolutionDate: issue.resolutionDate,
            overdueDays,
            customer: issue.customer || 'N/A',
          });
        }
      }
    }
    
    const developers = Array.from(developerMap.values()).map(dev => ({
      developer: dev.developer,
      totalTasks: dev.totalTasks,
      overdueTasks: dev.overdueTasks,
      overduePercentage: dev.totalTasks > 0 
        ? Math.round((dev.overdueTasks / dev.totalTasks) * 100) 
        : 0,
      avgOverdueDays: dev.overdueTasks > 0 
        ? Math.round(dev.totalOverdueDays / dev.overdueTasks) 
        : 0,
      issues: dev.issues.sort((a, b) => b.overdueDays - a.overdueDays).slice(0, 10), // Top 10 worst
    }));
    
    // Sort by overdue percentage desc
    developers.sort((a, b) => b.overduePercentage - a.overduePercentage);
    
    return NextResponse.json(developers);
  } catch (error) {
    console.error('Overdue tasks API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch overdue tasks' },
      { status: 500 }
    );
  }
}
