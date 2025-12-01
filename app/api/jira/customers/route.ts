import { NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthsParam = searchParams.get('months');
    const months = monthsParam ? parseInt(monthsParam, 10) : 6;

    if (isNaN(months) || months < 1) {
      return NextResponse.json({ error: 'Invalid months parameter. Must be a positive number.' }, { status: 400 });
    }

    const jira = new JiraClient();

    // Get a list of customers (unique) and aggregate metrics per customer
    const customers = await jira.getAllCustomers();

    const result: Array<any> = [];

    for (const customer of customers) {
      try {
        const sprintDetails = await jira.getSprintsByCustomer(customer, months);

        // Aggregate metrics across sprints for this customer
        let totalPoints = 0;
        let completedPoints = 0;
        let bugCount = 0;
        let velocity = 0;
        let sprintCount = 0;

        for (const details of sprintDetails) {
          const m = details.metrics || ({} as any);
          totalPoints += m.totalPoints || 0;
          completedPoints += m.completedPoints || 0;
          bugCount += m.bugCount || 0;
          velocity += m.velocity || 0;
          sprintCount += 1;
        }

        const completionRate = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

        result.push({
          customer,
          sprintCount,
          totalPoints,
          completedPoints,
          completionRate,
          velocity,
          bugCount,
        });
      } catch (err) {
        console.warn(`Failed to aggregate customer ${customer}:`, err);
      }
    }

    // Sort by totalPoints desc
    result.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));

    return NextResponse.json({ success: true, customers: result });
  } catch (error: any) {
    console.error('Customer aggregate error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to aggregate customers' }, { status: 500 });
  }
}
