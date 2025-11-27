import { NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira';

export const dynamic = 'force-dynamic';

// Server-side cache
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
let cachedData: { 
  data: any; 
  timestamp: number; 
  sprintCount: number;
} | null = null;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sprintCount = parseInt(searchParams.get('sprints') || '1');
    
    // Check cache
    if (cachedData && 
        cachedData.sprintCount === sprintCount &&
        Date.now() - cachedData.timestamp < CACHE_DURATION) {
      console.log(`Returning cached customer issues data (${cachedData.data.customers.length} customers)`);
      return NextResponse.json(cachedData.data);
    }
    
    const jiraClient = new JiraClient();
    const allSprints = await jiraClient.getClosedSprints(200);
    const sprints = allSprints.slice(0, sprintCount);
    
    console.log(`Processing ${sprints.length} sprints for customer issue types`);
    
    // Aggregate customer metrics
    const customerMap = new Map<string, {
      customer: string;
      totalPoints: number;
      completedPoints: number;
      issuesByType: Map<string, { points: number; donePoints: number }>;
    }>();
    
    // Fetch sprint details in batches
    const BATCH_SIZE = 5;
    for (let i = 0; i < sprints.length; i += BATCH_SIZE) {
      const batch = sprints.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (sprint) => {
          const details = await jiraClient.getSprintDetails(sprint.id);
          
          for (const issue of details.issues) {
            const customer = issue.customer || 'Unknown';
            const issueType = issue.issueType?.name || 'Other';
            const points = issue.storyPoints || 0;
            // Count ONLY status=Done
            const isDone = issue.status === 'Done';
            
            // Debug: Log first few done issues with customer
            if (isDone && customer !== 'Unknown' && Math.random() < 0.02) {
              console.log(`DONE Issue ${issue.key}: customer="${customer}", type="${issueType}", SP=${points}`);
            }
            
            if (!customerMap.has(customer)) {
              customerMap.set(customer, {
                customer,
                totalPoints: 0,
                completedPoints: 0,
                issuesByType: new Map(),
              });
            }
            
            const cust = customerMap.get(customer)!;
            cust.totalPoints += points;
            if (isDone) {
              cust.completedPoints += points;
            }
            
            if (!cust.issuesByType.has(issueType)) {
              cust.issuesByType.set(issueType, { points: 0, donePoints: 0 });
            }
            
            const typeData = cust.issuesByType.get(issueType)!;
            typeData.points += points;
            if (isDone) {
              typeData.donePoints += points;
            }
          }
        })
      );
    }
    
    // Transform to response format - only show DONE issues
    const customers = Array.from(customerMap.values())
      .map(cust => {
        const issuesByType = Array.from(cust.issuesByType.entries())
          .filter(([_, data]) => data.donePoints >= 0) // Include all done issues, even with 0 SP
          .map(([type, data]) => ({
            issueType: type,
            points: data.donePoints, // Only count done points (including 0)
            percentage: cust.completedPoints > 0 
              ? Math.round((data.donePoints / cust.completedPoints) * 100) 
              : 0,
          }))
          .sort((a, b) => b.points - a.points);
        
        return {
          customer: cust.customer,
          totalPoints: cust.totalPoints,
          completedPoints: cust.completedPoints,
          issuesByType,
        };
      })
      .filter(c => c.issuesByType.length > 0) // Only show customers with done issues
      .filter(c => c.customer.toLowerCase() !== 'inveon') // Exclude Inveon
      .filter(c => c.customer.toLowerCase() !== 'toptan') // Exclude Toptan
      .sort((a, b) => a.customer.localeCompare(b.customer, 'tr', { sensitivity: 'base' })); // A-Z sıralama (Türkçe karakter desteği)
    
    console.log(`Returning ${customers.length} customers with issue type data`);
    
    // Log detailed customer data for debugging
    if (customers.length > 0) {
      customers.slice(0, 3).forEach(cust => {
        console.log(`Customer "${cust.customer}": ${cust.issuesByType.length} issue types - ${cust.issuesByType.map(t => `${t.issueType}:${t.points}SP`).join(', ')}`);
      });
    }
    
    // Cache the result
    const responseData = { customers };
    cachedData = {
      data: responseData,
      timestamp: Date.now(),
      sprintCount,
    };
    console.log('Customer issues data cached for 15 minutes');
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Customer issues API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer issue data' },
      { status: 500 }
    );
  }
}
