import { NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const jira = new JiraClient();

    // JQL: Find issues from Product: inCommerce project created in the last 6 months with workratio > 100
    // Using exact project name from Jira and workratio filter directly in JQL
    const jql = `project = "Product: inCommerce" AND created >= -24w AND workratio > 100 ORDER BY updated DESC`;

    const fieldsParam = encodeURIComponent(['key', 'summary', 'status', 'issuetype', 'created', 'updated', 'assignee', 'customfield_10000', 'customfield_10002', 'customfield_10656', 'timetracking', 'priority', 'duedate'].join(','));
    const encodedJql = encodeURIComponent(jql);
    const url = `https://${process.env.JIRA_HOST}/rest/api/3/search/jql?jql=${encodedJql}&fields=${fieldsParam}&maxResults=1000`;
    
    console.log(`Overwork API URL: ${url}`);

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

    // Map issues to our format
    const formattedIssues = issues.map((issue: any) => {
      const customerField = issue.fields['customfield_10000'];
      let customer = 'Unknown';
      if (customerField) {
        if (typeof customerField === 'string') {
          customer = customerField;
        } else if (customerField.value) {
          customer = customerField.value;
        } else if (customerField.name) {
          customer = customerField.name;
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
      const timeEstimate = timetracking.originalEstimateSeconds || 0;
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
        workratio,
        dueDate: issue.fields.duedate,
      };
    });

    // Return all issues (already filtered by JQL for workratio > 100)
    const overworkedIssues = formattedIssues;

    console.log(`Issues returned from Jira (already filtered for >100%): ${overworkedIssues.length}`);

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
