import { NextResponse } from 'next/server';

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

// PM statuses we're tracking
const PM_STATUSES = ['PM Approval - Marka Dağılımı', 'Waiting PM', 'Waiting for Customer', 'Waiting for Environment', 'Merge Requested', 'Merged'];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerFilter = searchParams.get('customer');
    
    // Jira configuration
    const jiraHost = process.env.JIRA_HOST;
    const jiraEmail = process.env.JIRA_EMAIL;
    const jiraApiToken = process.env.JIRA_API_TOKEN;
    const customerField = process.env.JIRA_CUSTOMER_FIELD || 'customfield_10000';
    
    if (!jiraHost || !jiraEmail || !jiraApiToken) {
      console.log('Jira credentials not configured for PM metrics');
      return NextResponse.json({ sprintName: 'Mock', metrics: [] });
    }
    
    const authHeader = `Basic ${Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64')}`;
    
    // Build JQL to get issues currently in PM statuses from INC project only
    const statusList = PM_STATUSES.map(s => `"${s}"`).join(', ');
    let jql = `project = INC AND status IN (${statusList})`;
    
    // Customer filter is applied after fetching (not in JQL to avoid field name issues)
    
    console.log(`PM Metrics JQL: ${jql}`);
    
    // Fetch issues directly from Jira with updated field using new API endpoint
    // New Jira API requires /rest/api/3/search/jql with GET request
    const encodedJql = encodeURIComponent(jql);
    const fieldsParam = encodeURIComponent(['key', 'summary', 'status', 'created', 'updated', 'assignee', customerField].join(','));
    const url = `https://${jiraHost}/rest/api/3/search/jql?jql=${encodedJql}&fields=${fieldsParam}&maxResults=1000`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Jira API error: ${response.status} - ${errorText}`);
      console.error(`Request URL: ${url}`);
      console.error(`JQL: ${jql}`);
      return NextResponse.json(
        { error: `Jira API error: ${response.status}`, details: errorText },
        { status: 500 }
      );
    }

    const data = await response.json();
    const issues = data.issues || [];
    
    console.log(`Found ${issues.length} issues in PM statuses`);
    
    // Aggregate metrics by customer
    const customerMap = new Map<string, PMMetrics>();
    const now = new Date();
    
    for (const issue of issues) {
      const fields = issue.fields;
      
      // Get customer
      const customerFieldValue = fields[customerField];
      let customer = 'Unknown';
      if (customerFieldValue) {
        if (typeof customerFieldValue === 'string') {
          customer = customerFieldValue;
        } else if (customerFieldValue.value) {
          customer = customerFieldValue.value;
        } else if (customerFieldValue.name) {
          customer = customerFieldValue.name;
        }
      }
      
      // Apply customer filter if provided
      if (customerFilter && customer !== customerFilter) {
        continue;
      }
      
      const status = fields.status?.name || 'Unknown';
      const createdDate = new Date(fields.created);
      const updatedDate = new Date(fields.updated);
      
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
          waitingForCustomer: { count: 0, avgWaitDays: 0, totalWaitDays: 0 },
          waitingForEnvironment: { count: 0, avgWaitDays: 0, totalWaitDays: 0 },
          mergeRequested: { count: 0, avgWaitDays: 0, totalWaitDays: 0 },
          merged: { count: 0, avgWaitDays: 0, totalWaitDays: 0 },
          issues: [],
        });
      }
      
      const metrics = customerMap.get(customer)!;
      metrics.totalTasks++;
      
      // Count by status - use daysSinceUpdate for how long it's been waiting in current status
      if (status === 'PM Approval - Marka Dağılımı') {
        metrics.pmApproval.count++;
        metrics.pmApproval.totalWaitDays += daysSinceUpdate;
      } else if (status === 'Waiting PM') {
        metrics.waitingPM.count++;
        metrics.waitingPM.totalWaitDays += daysSinceUpdate;
      } else if (status === 'Waiting for Customer') {
        metrics.waitingForCustomer.count++;
        metrics.waitingForCustomer.totalWaitDays += daysSinceUpdate;
      } else if (status === 'Waiting for Environment') {
        metrics.waitingForEnvironment.count++;
        metrics.waitingForEnvironment.totalWaitDays += daysSinceUpdate;
      } else if (status === 'Merge Requested') {
        metrics.mergeRequested.count++;
        metrics.mergeRequested.totalWaitDays += daysSinceUpdate;
      } else if (status === 'Merged') {
        metrics.merged.count++;
        metrics.merged.totalWaitDays += daysSinceUpdate;
      }
      
      // Get assignee
      let assignee = null;
      if (fields.assignee) {
        assignee = fields.assignee.displayName || fields.assignee.name || null;
      }
      
      // Add to issues list
      metrics.issues.push({
        key: issue.key,
        summary: fields.summary,
        status,
        created: createdDate.toISOString(),
        daysOpen,
        daysSinceUpdate,
        assignee,
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
      if (metrics.waitingForCustomer.count > 0) {
        metrics.waitingForCustomer.avgWaitDays = Math.round((metrics.waitingForCustomer.totalWaitDays / metrics.waitingForCustomer.count) * 10) / 10;
      }
      if (metrics.waitingForEnvironment.count > 0) {
        metrics.waitingForEnvironment.avgWaitDays = Math.round((metrics.waitingForEnvironment.totalWaitDays / metrics.waitingForEnvironment.count) * 10) / 10;
      }
      if (metrics.mergeRequested.count > 0) {
        metrics.mergeRequested.avgWaitDays = Math.round((metrics.mergeRequested.totalWaitDays / metrics.mergeRequested.count) * 10) / 10;
      }
      if (metrics.merged.count > 0) {
        metrics.merged.avgWaitDays = Math.round((metrics.merged.totalWaitDays / metrics.merged.count) * 10) / 10;
      }
      
      // Sort issues by daysSinceUpdate (longest waiting first)
      metrics.issues.sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);
      
      return metrics;
    });
    
    // Sort by total tasks (descending)
    results.sort((a, b) => b.totalTasks - a.totalTasks);
    
    return NextResponse.json({
      sprintName: 'Current PM Tasks',
      metrics: results
    });
  } catch (error: any) {
    console.error('PM Metrics API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch PM metrics' },
      { status: 500 }
    );
  }
}
