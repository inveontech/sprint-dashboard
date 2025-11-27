import { NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira';
import { getEnvStatus } from '@/lib/env-status';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customer = searchParams.get('customer');
    const sprintsParam = searchParams.get('sprints');
    const sprintCount = sprintsParam ? parseInt(sprintsParam, 10) : 3;

    if (isNaN(sprintCount) || sprintCount < 1) {
      return NextResponse.json(
        { error: 'Invalid sprints parameter. Must be a positive number.' },
        { status: 400 }
      );
    }

    const jira = new JiraClient();
    const envStatus = getEnvStatus();
    
    let sprintDetailsList;

    // Get sprints - fetch more than needed if customer filter is active
    const allSprints = await jira.getClosedSprints(200);
    
    // If customer filter is active, fetch more sprints to ensure we get enough after filtering
    const fetchCount = customer ? Math.min(sprintCount * 3, allSprints.length) : sprintCount;
    const selectedSprints = allSprints.slice(0, fetchCount);
    
    console.log(`Processing ${selectedSprints.length} sprints out of ${allSprints.length} total`);
    
    // Get details for selected sprints only - pass customer filter if provided
    sprintDetailsList = await Promise.all(
      selectedSprints.map(sprint => jira.getSprintDetails(sprint.id, customer || undefined))
    );
    
    // Filter by customer AFTER getting details
    if (customer) {
      sprintDetailsList = sprintDetailsList.filter(details => 
        details.metrics.customers.includes(customer)
      );
      // Take only the requested count AFTER filtering
      sprintDetailsList = sprintDetailsList.slice(0, sprintCount);
    }

    // Get all unique customers for dropdown
    const allCustomers = await jira.getAllCustomers();

    // Format response
    const sprints = sprintDetailsList.map((details: any) => {
      // Primary customer for display (first one)
      const primaryCustomer = details.metrics.customers.length > 0 
        ? details.metrics.customers[0] 
        : 'N/A';

      return {
        id: details.sprint.id,
        name: details.sprint.name,
        startDate: details.sprint.startDate || '',
        endDate: details.sprint.endDate || '',
        completeDate: details.sprint.completeDate || '',
        customer: primaryCustomer,
        customers: details.metrics.customers, // Include ALL customers
        metrics: {
          velocity: details.metrics.completedPoints,
          completionRate: details.metrics.completionRate,
          totalPoints: details.metrics.totalPoints,
          completedPoints: details.metrics.completedPoints,
          bugCount: details.metrics.bugCount,
          targetPoints: details.metrics.targetPoints,
          targetAchievement: details.metrics.targetAchievement,
        },
        issueTypes: details.issueTypes || [], // Include issue type breakdown
      };
    });

    return NextResponse.json({
      success: true,
      sprints,
      customers: allCustomers,
      envStatus, // Include environment status for UI warnings
    });
  } catch (error: any) {
    console.error('Jira API Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch sprints' 
      },
      { status: 500 }
    );
  }
}
