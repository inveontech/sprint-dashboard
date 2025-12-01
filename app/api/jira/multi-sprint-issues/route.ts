import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface IssueDetail {
  key: string;
  summary: string;
  status: string;
  created: string;
  updated: string;
  daysOpen: number;
  daysSinceUpdate: number;
  assignee: string | null;
  storyPoints: number;
  customer: string;
  sprintCount: number;
  taskOwner: string | null;
  reporter: string | null;
}

export async function GET(request: Request) {
  try {
    // Jira configuration
    const jiraHost = process.env.JIRA_HOST;
    const jiraEmail = process.env.JIRA_EMAIL;
    const jiraApiToken = process.env.JIRA_API_TOKEN;
    const customerField = process.env.JIRA_CUSTOMER_FIELD || 'customfield_10000';
    const storyPointsField = process.env.JIRA_STORY_POINTS_FIELD || 'customfield_10002';
    const taskOwnerField = process.env.JIRA_TASK_OWNER_FIELD || 'customfield_10656';
    const sprintCountField = 'customfield_10803';
    
    if (!jiraHost || !jiraEmail || !jiraApiToken) {
      console.log('Jira credentials not configured for multi-sprint issues');
      return NextResponse.json({ totalCount: 0, issues: [] });
    }
    
    const authHeader = `Basic ${Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64')}`;
    
    // JQL to get issues in 2 or more sprints, only from INC project, excluding Done/Canceled/Won't Do/Backlog/CR Rejected/Missing Information/Waiting Estimates
    const jql = `project = INC AND "sprint count[number]" >= "2" AND status NOT IN (Done, Canceled, "Won't Do", Backlog, "CR Rejected", "Missing Information", "Waiting Estimates") ORDER BY created DESC`;
    
    console.log(`Multi-Sprint Issues JQL: ${jql}`);
    
    // Fetch issues directly from Jira using new API endpoint
    const encodedJql = encodeURIComponent(jql);
    // Add sprint count field to fields
    const fieldsParam = encodeURIComponent(['key', 'summary', 'status', 'created', 'updated', 'assignee', 'reporter', customerField, storyPointsField, taskOwnerField, sprintCountField].join(','));
    const url = `https://${jiraHost}/rest/api/3/search/jql?jql=${encodedJql}&fields=${fieldsParam}&maxResults=500`;
    
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
    const jiraIssues = data.issues || [];
    
    console.log(`Found ${jiraIssues.length} issues in 2+ sprints`);
    
    // Process issues
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const issues: IssueDetail[] = jiraIssues.map((issue: any) => {
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
      
      // Get assignee
      let assignee = null;
      if (fields.assignee) {
        assignee = fields.assignee.displayName || fields.assignee.name || null;
      }
      
      // Get reporter
      let reporter = null;
      if (fields.reporter) {
        reporter = fields.reporter.displayName || fields.reporter.name || null;
      }
      
      // Get task owner
      let taskOwner = null;
      const taskOwnerFieldValue = fields[taskOwnerField];
      if (taskOwnerFieldValue) {
        if (typeof taskOwnerFieldValue === 'string') {
          taskOwner = taskOwnerFieldValue;
        } else if (taskOwnerFieldValue.displayName) {
          taskOwner = taskOwnerFieldValue.displayName;
        } else if (taskOwnerFieldValue.name) {
          taskOwner = taskOwnerFieldValue.name;
        }
      }
      
      // Calculate days open
      const createdDate = new Date(fields.created);
      const createdDay = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
      const daysOpen = Math.round((today.getTime() - createdDay.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate days since update
      const updatedDate = new Date(fields.updated);
      const updatedDay = new Date(updatedDate.getFullYear(), updatedDate.getMonth(), updatedDate.getDate());
      const daysSinceUpdate = Math.round((today.getTime() - updatedDay.getTime()) / (1000 * 60 * 60 * 24));
      
      // Get story points
      const storyPoints = fields[storyPointsField] || 0;
      
      // Get sprint count from custom field
      const sprintCount = fields[sprintCountField] || 2;
      
      return {
        key: issue.key,
        summary: fields.summary,
        status: fields.status?.name || 'Unknown',
        created: createdDate.toISOString(),
        updated: updatedDate.toISOString(),
        daysOpen,
        daysSinceUpdate,
        assignee,
        storyPoints,
        customer,
        sprintCount,
        taskOwner,
        reporter,
      };
    });
    
    return NextResponse.json({
      totalCount: issues.length,
      issues
    });
  } catch (error: any) {
    console.error('Multi-Sprint Issues API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch multi-sprint issues' },
      { status: 500 }
    );
  }
}
