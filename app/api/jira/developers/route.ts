import { NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sprintId = searchParams.get('sprintId');
    
    const jiraClient = new JiraClient();
    
    // Fetch developer targets from Jira
    const developerTargets = await jiraClient.getDeveloperTargets();
    console.log(`Loaded ${developerTargets.size} developer targets`);
    
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
    console.log(`Sprint will use snapshot with status at sprint end`);
    
    // Aggregate developer metrics from selected sprint
    const developerMap = new Map<string, {
      developer: string;
      totalPoints: number;
      completedPoints: number;
      issuesByType: Map<string, { total: number; completed: number; points: number }>;
    }>();
    
    // getSprintDetails will use snapshot if available (with historical status)
    const details = await jiraClient.getSprintDetails(sprint.id);
    
    console.log(`Processing ${details.issues.length} issues from sprint ${sprint.id}`);
    
    for (const issue of details.issues) {
      // Use Task Owner field instead of assignee
      const taskOwner = issue.taskOwner || issue.assignee?.displayName || 'Unassigned';
      // Skip if no task owner assigned
      if (!taskOwner || taskOwner === 'Unassigned') {
        continue;
      }
      // Remove " - Inveon" suffix from developer name
      const devName = taskOwner.replace(/ - Inveon$/, '');
      const issueType = issue.issueType?.name || 'Other';
      const points = issue.storyPoints || 0;
      const isCompleted = issue.status === 'Done';
      
      if (!developerMap.has(devName)) {
        developerMap.set(devName, {
          developer: devName,
          totalPoints: 0,
          completedPoints: 0,
          issuesByType: new Map(),
        });
      }
      
      const dev = developerMap.get(devName)!;
      dev.totalPoints += points;
      if (isCompleted) {
        dev.completedPoints += points;
      }
      
      if (!dev.issuesByType.has(issueType)) {
        dev.issuesByType.set(issueType, { total: 0, completed: 0, points: 0 });
      }
      
      const typeData = dev.issuesByType.get(issueType)!;
      typeData.total++;
      typeData.points += points;
      if (isCompleted) {
        typeData.completed++;
      }
    }
    
    console.log(`Found ${developerMap.size} developers in sprint`);
    console.log('Developer names:', Array.from(developerMap.keys()).join(', '));
    console.log('Target names:', Array.from(developerTargets.keys()).join(', '));
    
    const developers = Array.from(developerMap.values())
      .filter(dev => {
        const targetSPPerSprint = developerTargets.get(dev.developer);
        const hasTarget = targetSPPerSprint && targetSPPerSprint > 0;
        if (!hasTarget && dev.developer !== 'Unassigned') {
          console.log(`Skipping ${dev.developer} - no target found`);
        }
        return hasTarget;
      })
      .map(dev => {
        const issuesByType = Array.from(dev.issuesByType.entries()).map(([type, data]) => ({
          issueType: type,
          count: data.total,
          completedCount: data.completed,
          points: data.points,
          percentage: dev.totalPoints > 0 ? Math.round((data.points / dev.totalPoints) * 100) : 0,
        }));
        
        const targetSPPerSprint = developerTargets.get(dev.developer) || 0;
        
        return {
          developer: dev.developer,
          sprintCount: 1,
          totalPoints: dev.totalPoints,
          completedPoints: dev.completedPoints,
          completionRate: dev.totalPoints > 0 ? Math.round((dev.completedPoints / dev.totalPoints) * 100) : 0,
          avgVelocity: dev.completedPoints,
          targetSP: targetSPPerSprint,
          targetAchievement: targetSPPerSprint > 0 ? Math.round((dev.completedPoints / targetSPPerSprint) * 100) : 0,
          issuesByType,
        };
      });
    
    // Sort by target achievement
    developers.sort((a, b) => b.targetAchievement - a.targetAchievement);
    
    console.log(`Returning ${developers.length} developers with targets`);
    
    return NextResponse.json(developers);
  } catch (error) {
    console.error('Developer API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch developer data' },
      { status: 500 }
    );
  }
}
