import { NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const jira = new JiraClient();

    // JQL: Find issues from Product: inCommerce project created in the last 3 months with timetracking, excluding Done
    // Filter by workratio >= 100 in backend after calculating from timetracking
    const jql = `project = "Product: inCommerce" AND created >= -12w AND status != Done ORDER BY updated DESC`;

    const customerField = process.env.JIRA_CUSTOMER_FIELD || 'customfield_10000';
    const fieldsParam = encodeURIComponent(['key', 'summary', 'status', 'issuetype', 'created', 'updated', 'assignee', customerField, 'customfield_10002', 'customfield_10656', 'timetracking', 'priority', 'duedate'].join(','));
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
      // Original estimate = timeSpent + remainingEstimate (in case Jira updated originalEstimate)
      const timeEstimate = (timeSpent + remainingEstimate) || timetracking.originalEstimateSeconds || 0;
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

    // Filter issues with workratio >= 100 (at or above estimate)
    const overworkedIssues = formattedIssues.filter(issue => (issue.workratio || 0) >= 100);

    console.log(`Total issues fetched: ${formattedIssues.length}, Issues with workratio >= 100%: ${overworkedIssues.length}`);

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
