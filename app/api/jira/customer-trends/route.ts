import { NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sprintCount = parseInt(searchParams.get('sprints') || '1');
    const customer = searchParams.get('customer');

    const jira = new JiraClient();
    
    // Fetch customer targets from Jira
    const customerTargets = await jira.getCustomerTargets();
    console.log(`Loaded ${customerTargets.size} customer targets`);
    
    const allSprints = await jira.getClosedSprints(200);
    let sprints = allSprints.slice(0, sprintCount);

    // Filter by customer if specified
    if (customer && customer !== 'all') {
      sprints = sprints.filter((s: any) => 
        (s.customers && s.customers.includes(customer)) || s.customer === customer
      );
    }

    console.log(`Processing ${sprints.length} sprints for customer trends`);

    // Fetch details in parallel but limit concurrency
    const BATCH_SIZE = 5;
    const sprintDetails: any[] = [];

    for (let i = 0; i < sprints.length; i += BATCH_SIZE) {
      const batch = sprints.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (sprint) => {
          const details = await jira.getSprintDetails(sprint.id);
          
          // Group issues by customer
          const customerMetrics = new Map<string, { completed: number; total: number }>();
          
          details.issues.forEach((issue: any) => {
            const customer = issue.customer || 'Unknown';
            if (!customerMetrics.has(customer)) {
              customerMetrics.set(customer, { completed: 0, total: 0 });
            }
            
            const metrics = customerMetrics.get(customer)!;
            const sp = issue.storyPoints || 0;
            metrics.total += sp;
            if (issue.status === 'Done') {
              metrics.completed += sp;
            }
          });
          
          // Calculate completion rate for each customer based on their target
          const customerRates: Record<string, number> = {};
          customerMetrics.forEach((metrics, customer) => {
            const targetSP = customerTargets.get(customer);
            if (targetSP && targetSP > 0) {
              // Calculate completion rate: (completed SP / target SP) * 100
              customerRates[customer] = Math.min(100, Math.round((metrics.completed / targetSP) * 100));
            } else {
              // No target defined, use simple completion rate
              customerRates[customer] = metrics.total > 0 
                ? Math.round((metrics.completed / metrics.total) * 100) 
                : 0;
            }
          });
          
          return {
            id: sprint.id,
            name: sprint.name,
            date: sprint.completeDate,
            customerRates
          };
        })
      );
      sprintDetails.push(...batchResults);
    }

    // Convert Map to object for JSON response
    const targetsObj: Record<string, number> = {};
    customerTargets.forEach((sp, customer) => {
      targetsObj[customer] = sp;
    });
    
    return NextResponse.json({ sprints: sprintDetails, targets: targetsObj });
  } catch (error: any) {
    console.error('Failed to fetch customer trends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer trends', details: error.message },
      { status: 500 }
    );
  }
}
