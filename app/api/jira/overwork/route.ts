import { NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const jira = new JiraClient();

    // JQL: Find issues from Product: inCommerce project with timetracking data
    // We'll filter for spent >= estimate in backend calculation
    const jql = `project = "Product: inCommerce" AND created >= -12w AND status != Done AND timeSpent > 0 ORDER BY updated DESC`;

    const customerField = process.env.JIRA_CUSTOMER_FIELD || 'customfield_10000';
    const fieldsParam = encodeURIComponent(['key', 'summary', 'status', 'issuetype', 'created', 'updated', 'assignee', customerField, 'customfield_10002', 'customfield_10656', 'timetracking', 'priority', 'duedate'].join(','));
    const encodedJql = encodeURIComponent(jql);
    const url = `https://${process.env.JIRA_HOST}/rest/api/3/search/jql?jql=${encodedJql}&fields=${fieldsParam}&maxResults=100&startAt=0`;
    
    console.log(`Fetching overwork issues...`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64')}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Jira API error ${response.status}`);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch from Jira' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const issues = data.issues || [];

    console.log(`Total issues fetched: ${issues.length}`);
    const formattedIssues = issues.map((issue: any) => {
      const customerField = process.env.JIRA_CUSTOMER_FIELD || 'customfield_10000';
      const customerFieldValue = issue.fields[customerField];
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

      const taskOwnerField = issue.fields['customfield_10656'];
      let taskOwner = undefined;
      if (taskOwnerField) {
        if (typeof taskOwnerField === 'string') {
          taskOwner = taskOwnerField;
        } else if (taskOwnerField.displayName) {
          taskOwner = taskOwnerField.displayName;
        } else if (taskOwnerField.name) {
          taskOwner = taskOwnerField.name;
        }
      }

      const createdDate = new Date(issue.fields.created);
      const today = new Date();
      const daysOpen = Math.round((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

      const updatedDate = new Date(issue.fields.updated);
      const daysSinceUpdate = Math.round((today.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));

      // Extract timeSpent and originalEstimate from timetracking object
      const timetracking = issue.fields.timetracking || {};
      const timeSpent = timetracking.timeSpentSeconds || 0;
      const remainingEstimate = timetracking.remainingEstimateSeconds || 0;
      const originalEstimate = timetracking.originalEstimateSeconds || 0;
      
      // Calculate timeEstimate: prefer originalEstimate, fallback to timeSpent + remainingEstimate
      let timeEstimate = originalEstimate > 0 ? originalEstimate : (timeSpent + remainingEstimate);
      
      // Calculate workratio as percentage: (timeSpent / timeEstimate) * 100
      const workratio = timeEstimate > 0 ? Math.round((timeSpent / timeEstimate) * 100) : 0;

      return {
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status?.name || 'N/A',
        storyPoints: issue.fields['customfield_10002'] || 0,
        customer,
        assignee: issue.fields.assignee?.displayName || 'Unassigned',
        taskOwner,
        issueType: issue.fields.issuetype?.name || 'N/A',
        priority: issue.fields.priority?.name || 'N/A',
        created: issue.fields.created,
        daysOpen,
        daysSinceUpdate,
        timeEstimate,
        timeSpent,
        originalEstimate,
        workratio,
        dueDate: issue.fields.duedate,
      };
    });

    // Filter issues with spent >= estimate (workratio >= 100)
    const overworkedIssues = formattedIssues.filter((issue: any) => {
      const timeSpent = issue.timeSpent || 0;
      const timeEstimate = issue.timeEstimate || 1;
      return timeSpent >= timeEstimate;
    });

    console.log(`Total issues fetched: ${formattedIssues.length}, Issues with spent >= estimate: ${overworkedIssues.length}`);
    if (overworkedIssues.length > 0) {
      console.log(`First: ${overworkedIssues[0].key} (${overworkedIssues[0].workratio}%), Last: ${overworkedIssues[overworkedIssues.length-1].key} (${overworkedIssues[overworkedIssues.length-1].workratio}%)`);
    }

    // Sort by workratio descending (highest overwork first)
    overworkedIssues.sort((a: any, b: any) => (b.workratio || 0) - (a.workratio || 0));

    return NextResponse.json({
      success: true,
      issues: overworkedIssues,
      total: overworkedIssues.length,
    });
  } catch (error: any) {
    console.error('Overwork issues API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch overwork issues' },
      { status: 500 }
    );
  }
}
