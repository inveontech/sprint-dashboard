import { Version3Client } from 'jira.js';
import fs from 'fs';
import path from 'path';

interface JiraConfig {
  host: string;
  email: string;
  apiToken: string;
  boardId: number;
  projectKey: string;
  customerField: string;
  storyPointsField: string;
  taskOwnerField: string;
}

export interface Sprint {
  id: number;
  name: string;
  state: string;
  startDate: string;
  endDate: string;
  completeDate?: string;
  customer?: string;
  metrics?: {
    totalPoints: number;
    completedPoints: number;
    completionRate: number;
    velocity: number;
    bugCount: number;
  };
}

export class JiraClient {
  private client: Version3Client;
  private config: JiraConfig;
  private mock: boolean = false;
  private sprintCache: { data: Sprint[], timestamp: number } | null = null;
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

  // Retry helper for 503 errors
  private async fetchWithRetry(url: string, options: RequestInit, maxRetries: number = 3): Promise<Response> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        
        // If 503, retry after delay
        if (response.status === 503 && attempt < maxRetries) {
          const delay = attempt * 2000; // 2s, 4s, 6s
          console.log(`Jira returned 503, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        return response;
      } catch (error) {
        if (attempt === maxRetries) throw error;
        const delay = attempt * 2000;
        console.log(`Request failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries exceeded');
  }

  constructor() {
    // Allow running in a mock mode when env JIRA_MOCK=true so the app can be tested
    // without real Jira credentials.
    this.mock = process.env.JIRA_MOCK === 'true';

    this.config = {
      host: process.env.JIRA_HOST || '',
      email: process.env.JIRA_EMAIL || '',
      apiToken: process.env.JIRA_API_TOKEN || '',
      boardId: Number(process.env.JIRA_BOARD_ID) || 0,
      projectKey: process.env.JIRA_PROJECT_KEY || '',
      customerField: process.env.JIRA_CUSTOMER_FIELD || 'customfield_10000',
      storyPointsField: process.env.JIRA_STORY_POINTS_FIELD || 'customfield_10002',
      taskOwnerField: process.env.JIRA_TASK_OWNER_FIELD || 'customfield_10656',
    };

    if (this.mock) {
      // Skip real client initialization in mock mode
      // Create a lightweight, empty placeholder to avoid runtime errors where used.
      // @ts-ignore
      this.client = {};
      return;
    }

    // In real mode, require credentials
    if (!this.config.host || !this.config.email || !this.config.apiToken) {
      throw new Error('Missing JIRA configuration. Set JIRA_HOST, JIRA_EMAIL and JIRA_API_TOKEN.');
    }

    this.client = new Version3Client({
      host: `https://${this.config.host}`,
      authentication: {
        basic: {
          email: this.config.email,
          apiToken: this.config.apiToken,
        },
      },
    });
  }

  async getClosedSprints(count: number = 50): Promise<Sprint[]> {
    // Check cache first
    if (this.sprintCache && (Date.now() - this.sprintCache.timestamp) < this.CACHE_DURATION) {
      console.log(`Using cached sprints (${this.sprintCache.data.length} sprints)`);
      return this.sprintCache.data;
    }
    
    try {
      console.log('Cache miss or expired, fetching sprints from Jira...');
      
      // Only scan specific boards with matching sprints (optimized from 29 to 3 boards)
      const TARGET_BOARDS = [
        { id: 111, name: 'PM: Batuhan Taşkapı' },
        { id: 373, name: 'Domain: Pre Checkout' },
        { id: 374, name: 'Domain: Post Checkout' }
      ];
      const boards = TARGET_BOARDS;
      
      console.log(`Scanning ${boards.length} optimized boards: ${boards.map(b => `${b.name} (${b.id})`).join(', ')}`);

      // Fetch closed sprints from target boards only
      const SPRINT_NAME_PATTERN = /^\d{4}\.\d{2}\.\d{2}\s*\|\s*Sprint\s+\d+$/i;
      const sprintMap = new Map<number, any>();
      const boardStats = new Map<string, { total: number; matched: number }>();
      
      for (const board of boards) {
        const url = `https://${this.config.host}/rest/agile/1.0/board/${board.id}/sprint?state=closed&maxResults=500`;
        
        const response = await this.fetchWithRetry(url, {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64')}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const sprints = data.values || [];
          
          let matchedCount = 0;
          sprints.forEach((sprint: any) => {
            if (sprint.completeDate) {
              const matches = SPRINT_NAME_PATTERN.test(sprint.name);
              if (matches) {
                sprintMap.set(sprint.id, sprint);
                matchedCount++;
              }
            }
          });
          
          boardStats.set(board.name, { total: sprints.length, matched: matchedCount });
          console.log(`Board "${board.name}": ${matchedCount}/${sprints.length} sprints match pattern`);
        } else {
          console.error(`Failed to fetch sprints from board ${board.name} (${board.id}): ${response.status}`);
          boardStats.set(board.name, { total: 0, matched: 0 });
        }
      }
      
      // Log summary
      console.log('\n=== SPRINT FETCH SUMMARY ===');
      boards.forEach((board: any) => {
        const stats = boardStats.get(board.name);
        if (stats) {
          console.log(`${board.name}: ${stats.matched}/${stats.total} matching sprints`);
        }
      });
      console.log('============================\n');

      // Already filtered during collection
      const sortedSprints = Array.from(sprintMap.values())
        .sort((a: any, b: any) => new Date(b.completeDate).getTime() - new Date(a.completeDate).getTime());
      
      console.log(`Total matching sprints: ${sortedSprints.length}`);

      console.log(`Returning ${sortedSprints.length} sorted sprints`);
      if (sortedSprints.length > 0) {
        console.log(`Most recent sprint: ${sortedSprints[0].name} (ID: ${sortedSprints[0].id}, ${sortedSprints[0].completeDate})`);
        console.log(`Oldest sprint: ${sortedSprints[sortedSprints.length - 1].name} (ID: ${sortedSprints[sortedSprints.length - 1].id}, ${sortedSprints[sortedSprints.length - 1].completeDate})`);
      }
      
      // Cache the results
      this.sprintCache = {
        data: sortedSprints,
        timestamp: Date.now()
      };
      console.log('Sprints cached for 15 minutes');
      
      return sortedSprints;
    } catch (error) {
      console.error('Failed to fetch closed sprints:', error);
      throw new Error(`Failed to fetch closed sprints: ${error}`);
    }
  }

  async getSprintDetails(sprintId: number, customerFilter?: string) {
    try {
      // First, check if we have a snapshot for this sprint
      const snapshotPath = path.join(process.cwd(), 'data', 'sprint-snapshots', `${sprintId}.json`);
      
      // Check if sprint is closed and we have a snapshot
      if (fs.existsSync(snapshotPath)) {
        console.log(`📸 Loading snapshot for sprint ${sprintId}`);
        const snapshotData = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
        
        // Apply customer filter if provided
        if (customerFilter && snapshotData.issues) {
          const filteredIssues = snapshotData.issues.filter((issue: any) => issue.customer === customerFilter);
          
          // Recalculate metrics for filtered data
          let completedPoints = 0;
          let totalPoints = 0;
          let bugCount = 0;
          const issueTypeMap = new Map<string, { count: number; storyPoints: number; doneCount: number; donePoints: number }>();
          
          filteredIssues.forEach((issue: any) => {
            const sp = issue.storyPoints || 0;
            const issueType = issue.issueType?.name || issue.issueType || 'Other';
            const status = issue.status?.name || issue.status;
            
            if (status !== 'Canceled' && status !== "Won't Do") {
              totalPoints += sp;
            }
            if (status === 'Done') {
              completedPoints += sp;
            }
            if (issueType === 'Bug') {
              bugCount++;
            }
            
            // Track issue types
            if (!issueTypeMap.has(issueType)) {
              issueTypeMap.set(issueType, { count: 0, storyPoints: 0, doneCount: 0, donePoints: 0 });
            }
            const typeData = issueTypeMap.get(issueType)!;
            typeData.count++;
            typeData.storyPoints += sp;
            if (status === 'Done') {
              typeData.doneCount++;
              typeData.donePoints += sp;
            }
          });
          
          // Get customer target
          let targetPoints = 0;
          try {
            const targetFilePath = path.join(process.cwd(), 'public', 'customer-targets.json');
            const targetFileData = fs.readFileSync(targetFilePath, 'utf-8');
            const customerTargets = JSON.parse(targetFileData);
            const customerTarget = customerTargets.find((t: any) => t.customer === customerFilter);
            if (customerTarget) {
              targetPoints = customerTarget.targetSP || 0;
            }
          } catch (error) {
            console.warn(`Could not read customer target for ${customerFilter}`);
          }
          
          // If no target found, use totalPoints
          if (targetPoints === 0) {
            targetPoints = totalPoints;
          }
          
          const issueTypes = Array.from(issueTypeMap.entries()).map(([type, data]) => ({
            type,
            count: data.count,
            storyPoints: data.storyPoints,
            doneCount: data.doneCount,
            donePoints: data.donePoints,
          }));
          
          return {
            ...snapshotData,
            issues: filteredIssues,
            issueTypes,
            metrics: {
              ...snapshotData.metrics,
              totalPoints,
              completedPoints,
              completionRate: targetPoints > 0 ? Math.round((completedPoints / targetPoints) * 100) : 0,
              velocity: completedPoints,
              bugCount,
              targetPoints,
              targetAchievement: targetPoints > 0 ? Math.round((completedPoints / targetPoints) * 100) : 0,
              customers: [customerFilter],
            }
          };
        }
        
        return snapshotData;
      }
      
      const sprintUrl = `https://${this.config.host}/rest/agile/1.0/sprint/${sprintId}`;
      const sprintResponse = await this.fetchWithRetry(sprintUrl, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64')}`,
          'Accept': 'application/json',
        },
      });

      if (!sprintResponse.ok) {
        let bodyText = '';
        try { bodyText = await sprintResponse.text(); } catch {}
        console.error(`Jira sprint API error ${sprintResponse.status}: ${bodyText}`);
        throw new Error(`Jira sprint API error: ${sprintResponse.status} - ${bodyText}`);
      }

      const sprint = await sprintResponse.json();

      // Get ALL issues from sprint
      const issuesUrl = `https://${this.config.host}/rest/agile/1.0/sprint/${sprintId}/issue?maxResults=1000`;
      const issuesResponse = await this.fetchWithRetry(issuesUrl, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64')}`,
          'Accept': 'application/json',
        },
      });

      if (!issuesResponse.ok) {
        let bodyText = '';
        try { bodyText = await issuesResponse.text(); } catch {}
        console.error(`Jira issues API error ${issuesResponse.status}: ${bodyText}`);
        throw new Error(`Jira issues API error: ${issuesResponse.status} - ${bodyText}`);
      }

      const issuesData = await issuesResponse.json();
      let issues = issuesData.issues || [];

      // For closed sprints, get historical status at sprint end
      // Then filter by resolution date to determine what was completed IN this sprint
      const isClosedSprint = sprint.state === 'closed';
      const sprintStartDate = sprint.startDate ? new Date(sprint.startDate) : null;
      const sprintCompleteDate = sprint.completeDate ? new Date(sprint.completeDate) : null;
      
      if (isClosedSprint && sprintStartDate && sprintCompleteDate) {
        console.log(`⏳ Fetching sprint-end status for ${issues.length} issues`);
        console.log(`   Sprint: ${sprintStartDate.toISOString()} → ${sprintCompleteDate.toISOString()}`);
        
        // OPTIMIZATION: Only fetch status at sprint END (not start)
        // We'll use resolutionDate to determine if completed IN this sprint
        const BATCH_SIZE = 10;
        const DELAY_BETWEEN_BATCHES = 1500; // 1.5 second delay
        const statusAtEnd = new Map<string, string>();
        
        for (let i = 0; i < issues.length; i += BATCH_SIZE) {
          const batch = issues.slice(i, i + BATCH_SIZE);
          
          const statusPromises = batch.map((issue: any) => 
            this.getIssueStatusAtDate(issue.key, sprintCompleteDate)
              .then(status => ({ key: issue.key, status }))
          );
          
          const results = await Promise.all(statusPromises);
          results.forEach(result => {
            if (result.status) {
              statusAtEnd.set(result.key, result.status);
            }
          });
          
          console.log(`📊 Processed ${Math.min(i + BATCH_SIZE, issues.length)}/${issues.length} issues`);
          
          if (i + BATCH_SIZE < issues.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
          }
        }
        
        // Update issues with their status at sprint END
        issues = issues.map((issue: any) => {
          const endStatus = statusAtEnd.get(issue.key);
          if (endStatus) {
            return {
              ...issue,
              fields: {
                ...issue.fields,
                status: {
                  ...issue.fields.status,
                  name: endStatus
                }
              }
            };
          }
          return issue;
        });
        
        // Log summary using resolutionDate to determine what was completed IN this sprint
        const doneAtEnd = issues.filter((issue: any) => issue.fields.status.name === 'Done').length;
        const completedInSprint = issues.filter((issue: any) => {
          if (issue.fields.status.name !== 'Done') return false;
          const resolutionDate = issue.fields.resolutiondate;
          if (!resolutionDate) return false;
          const resolvedDate = new Date(resolutionDate);
          return resolvedDate >= sprintStartDate && resolvedDate <= sprintCompleteDate;
        }).length;
        
        console.log(`✅ Sprint end status captured:`);
        console.log(`   Done at sprint end: ${doneAtEnd} issues`);
        console.log(`   Completed IN this sprint: ${completedInSprint} issues (by resolutionDate)`);
      }

      // Filter issues by customer if customerFilter is provided
      if (customerFilter) {
        issues = issues.filter((issue: any) => {
          const customerField = issue.fields[this.config.customerField];
          let customer = '';
          if (customerField) {
            if (typeof customerField === 'string') {
              customer = customerField;
            } else if (customerField.value) {
              customer = customerField.value;
            } else if (customerField.name) {
              customer = customerField.name;
            }
          }
          return customer === customerFilter;
        });
      }

      let completedPoints = 0;
      let totalPoints = 0;
      let bugCount = 0;
      const customers = new Set<string>();
      const issuesByStatus = {
        done: 0,
        inProgress: 0,
        toDo: 0,
      };
      const issueTypeMap = new Map<string, { count: number; storyPoints: number; doneCount: number; donePoints: number }>();

      // Calculate metrics - only count Done issues for completion
      issues.forEach((issue: any) => {
        const storyPoints = issue.fields[this.config.storyPointsField] || 0;
        const issueType = issue.fields.issuetype.name;
        const status = issue.fields.status.name;
        
        // Add to total points for ALL issues (except Canceled and Won't Do)
        if (status !== 'Canceled' && status !== "Won't Do") {
          totalPoints += storyPoints;
        }
        
        // Count story points ONLY for status=Done
        const isDone = status === 'Done';
        
        if (isDone) {
          completedPoints += storyPoints;
          issuesByStatus.done++;
        } else if (status === 'In Progress' || status === 'In Development') {
          issuesByStatus.inProgress++;
        } else {
          issuesByStatus.toDo++;
        }
        
        if (issueType === 'Bug') {
          bugCount++;
        }

        // Track story points by issue type
        if (!issueTypeMap.has(issueType)) {
          issueTypeMap.set(issueType, { count: 0, storyPoints: 0, doneCount: 0, donePoints: 0 });
        }
        const typeData = issueTypeMap.get(issueType)!;
        typeData.count++;
        typeData.storyPoints += storyPoints;
        if (isDone) {
          typeData.doneCount++;
          typeData.donePoints += storyPoints;
        }
        
        const customerField = issue.fields[this.config.customerField];
        
        // Customer field can be: {value: "X"}, "X", or {name: "X"}
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
        
        if (customer && customer !== 'Unknown') {
          customers.add(customer);
        }
      });

      // Map issues
      const processedIssues = issues.map((i: any) => {
        const customerField = i.fields[this.config.customerField];
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
        
        // Extract Task Owner field
        const taskOwnerField = i.fields[this.config.taskOwnerField];
        let taskOwner = undefined;
        if (taskOwnerField) {
          // Debug log for first few issues
          if (Math.random() < 0.01) {
            console.log(`\n=== Task Owner Debug for ${i.key} ===`);
            console.log('Task Owner Field:', JSON.stringify(taskOwnerField, null, 2));
            console.log('Field Type:', typeof taskOwnerField);
            console.log('Has displayName?', taskOwnerField.displayName);
            console.log('Has name?', taskOwnerField.name);
            console.log('Keys:', Object.keys(taskOwnerField));
            console.log('==================================\n');
          }
          
          if (typeof taskOwnerField === 'string') {
            taskOwner = taskOwnerField;
          } else if (taskOwnerField.displayName) {
            taskOwner = taskOwnerField.displayName;
          } else if (taskOwnerField.name) {
            taskOwner = taskOwnerField.name;
          }
        }
        
        return {
          key: i.key,
          summary: i.fields.summary,
          status: i.fields.status.name,
          storyPoints: i.fields[this.config.storyPointsField] || 0,
          customer,
          assignee: i.fields.assignee ? {
            displayName: i.fields.assignee.displayName || i.fields.assignee.name || 'Unknown'
          } : undefined,
          taskOwner,
          issueType: i.fields.issuetype ? {
            name: i.fields.issuetype.name
          } : undefined,
          created: i.fields.created,
          dueDate: i.fields.duedate,
          resolutionDate: i.fields.resolutiondate,
        };
      });

      // Calculate target points
      const customerArray = Array.from(customers);
      
      // Try to get historical sprint target first
      let targetPoints = 0;
      let targetSource = 'calculated';
      
      // If customer filter is applied, get target for that customer only
      if (customerFilter) {
        try {
          const targetFilePath = path.join(process.cwd(), 'public', 'customer-targets.json');
          const targetFileData = await fs.promises.readFile(targetFilePath, 'utf-8');
          const customerTargets = JSON.parse(targetFileData);
          
          const customerTarget = customerTargets.find((t: any) => t.customer === customerFilter);
          if (customerTarget) {
            targetPoints = customerTarget.targetSP || 0;
            targetSource = 'customer';
          }
        } catch (error) {
          console.error(`Failed to read customer targets for ${customerFilter}:`, error);
        }
      } else {
        // No customer filter - get sprint total target
        try {
          const targetFilePath = path.join(process.cwd(), 'data', 'sprint-targets.json');
          const targetFileData = await fs.promises.readFile(targetFilePath, 'utf-8');
          const savedTargets = JSON.parse(targetFileData);
          
          const savedTarget = savedTargets.find((t: any) => Number(t.sprintId) === Number(sprintId));
          
          if (savedTarget) {
            targetPoints = savedTarget.targetPoints;
            targetSource = 'historical';
          }
        } catch (error) {
          console.error(`Failed to read sprint targets for sprint ${sprintId}:`, error);
        }
        
        // If no historical target found, calculate from current customer targets
        if (targetPoints === 0) {
          targetPoints = await this.getSprintTargetPoints(customerArray);
        }
      }
      
      const targetAchievement = targetPoints > 0 ? Math.round((completedPoints / targetPoints) * 100) : 0;
      const completionRate = targetPoints > 0 ? Math.round((completedPoints / targetPoints) * 100) : (totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0);

      // Convert issue type map to array
      const issueTypeArray = Array.from(issueTypeMap.entries()).map(([type, data]) => ({
        type,
        count: data.count,
        storyPoints: data.storyPoints,
        doneCount: data.doneCount,
        donePoints: data.donePoints,
      }));

      const result = {
        sprint,
        issues: processedIssues,
        metrics: {
          totalPoints,
          completedPoints,
          completionRate,
          velocity: completedPoints,
          bugCount,
          customers: customerArray,
          targetPoints,
          targetAchievement,
          issuesByStatus,
        },
        issueTypes: issueTypeArray,
      };
      
      // Save snapshot if sprint is closed
      if (sprint.state === 'closed') {
        try {
          const snapshotDir = path.join(process.cwd(), 'data', 'sprint-snapshots');
          if (!fs.existsSync(snapshotDir)) {
            fs.mkdirSync(snapshotDir, { recursive: true });
          }
          
          const snapshotPath = path.join(snapshotDir, `${sprintId}.json`);
          if (!fs.existsSync(snapshotPath)) {
            console.log(`💾 Saving snapshot for closed sprint ${sprintId}`);
            fs.writeFileSync(snapshotPath, JSON.stringify({
              ...result,
              capturedAt: new Date().toISOString(),
            }, null, 2));
          }
        } catch (error) {
          console.error(`Failed to save snapshot for sprint ${sprintId}:`, error);
        }
      }
      
      return result;
    } catch (error) {
      console.error(`Failed to fetch sprint ${sprintId}:`, error);
      throw error;
    }
  }

  async getSprintsByCustomer(customer: string, sprintCount: number = 50) {
    try {
      const closedSprints = await this.getClosedSprints(sprintCount);
      const results: any[] = [];

      for (const sprint of closedSprints) {
        try {
          const details = await this.getSprintDetails(sprint.id);
          if (details.metrics?.customers?.includes(customer)) {
            results.push(details);
          }
        } catch (error) {
          console.warn(`Failed to fetch details for sprint ${sprint.id}:`, error);
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to get sprints by customer:', error);
      return [];
    }
  }

  async getDeveloperTargets(): Promise<Map<string, number>> {
    try {
      // Read from local JSON file
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'public', 'developer-targets.json');
      
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);
        
        const targetMap = new Map<string, number>();
        // Handle both old format { developers: [...] } and new format [...]
        const devArray = Array.isArray(data) ? data : data.developers || [];
        devArray.forEach((dev: any) => {
          const name = dev.name || dev.developer;
          const target = dev.target || dev.targetSP;
          if (name && target > 0) {
            targetMap.set(name, target);
          }
        });
        
        console.log(`Loaded ${targetMap.size} developer targets from developer-targets.json`);
        return targetMap;
      }

      console.log('developer-targets.json not found, returning empty map');
      return new Map();
    } catch (error) {
      console.error('Failed to fetch developer targets:', error);
      return new Map();
    }
  }

  async getCustomerTargets(): Promise<Map<string, number>> {
    try {
      const jql = `project = INC OR category = "Phantom Rollout" OR "SP Target Type" = Customer`;
      const url = `https://${this.config.host}/rest/api/3/search`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64')}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jql,
          fields: [this.config.customerField, this.config.storyPointsField],
          maxResults: 100
        })
      });

      if (!response.ok) {
        console.error(`Failed to fetch customer targets: ${response.status}`);
        return new Map();
      }

      const data = await response.json();
      const targetMap = new Map<string, number>();

      data.issues?.forEach((issue: any) => {
        const customerField = issue.fields?.[this.config.customerField];
        const customer = customerField?.value || customerField?.name || (typeof customerField === 'string' ? customerField : null);
        const sp = issue.fields?.[this.config.storyPointsField] || 0;
        
        if (customer && sp > 0) {
          targetMap.set(customer, sp);
        }
      });

      console.log(`Loaded ${targetMap.size} customer targets from Jira`);
      return targetMap;
    } catch (error) {
      console.error('Failed to fetch customer targets:', error);
      return new Map();
    }
  }

  async getSprintTargetPoints(customers: string[]): Promise<number> {
    try {
      const customerTargets = await this.getCustomerTargets();
      let totalTarget = 0;
      
      customers.forEach(customer => {
        const target = customerTargets.get(customer);
        if (target) {
          totalTarget += target;
        }
      });
      
      console.log(`Sprint target calculated: ${totalTarget} SP for ${customers.length} customers`);
      return totalTarget;
    } catch (error) {
      console.error('Failed to calculate sprint target:', error);
      return 0;
    }
  }

  async getDomainTargets(): Promise<Map<string, number>> {
    try {
      const jql = `(project = INC OR category = "Phantom Rollout" OR "SP Target Type" = Developer) AND ("Product Domain[Dropdown]" = "Pre Checkout" OR "Product Domain[Dropdown]" = "Post Checkout")`;
      const url = `https://${this.config.host}/rest/api/3/search`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64')}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jql,
          fields: ['customfield_10100', this.config.storyPointsField], // Adjust customfield ID for Product Domain
          maxResults: 100
        })
      });

      if (!response.ok) {
        console.error(`Failed to fetch domain targets: ${response.status}`);
        return new Map();
      }

      const data = await response.json();
      const targetMap = new Map<string, number>();

      data.issues?.forEach((issue: any) => {
        const domainField = issue.fields?.customfield_10100;
        const domain = domainField?.value || (typeof domainField === 'string' ? domainField : null);
        const sp = issue.fields?.[this.config.storyPointsField] || 0;
        
        if (domain && sp > 0) {
          // Aggregate by domain
          const current = targetMap.get(domain) || 0;
          targetMap.set(domain, current + sp);
        }
      });

      console.log(`Loaded ${targetMap.size} domain targets from Jira`);
      return targetMap;
    } catch (error) {
      console.error('Failed to fetch domain targets:', error);
      return new Map();
    }
  }

  async getAllCustomers(): Promise<string[]> {
    try {
      // Get recent sprints to collect customers
      const sprints = await this.getClosedSprints(200);
      const customers = new Set<string>();

      // Only check first 30 sprints for performance (recent sprints have most active customers)
      const sprintsToCheck = sprints.slice(0, 30);
      console.log(`Fetching customers from ${sprintsToCheck.length} most recent sprints...`);

      // Use Promise.all for parallel processing
      const detailsPromises = sprintsToCheck.map(sprint => 
        this.getSprintDetails(sprint.id).catch(error => {
          console.error(`Error fetching sprint ${sprint.id}:`, error);
          return null;
        })
      );

      const allDetails = await Promise.all(detailsPromises);

      allDetails.forEach(details => {
        if (details) {
          const metricCustomers = details.metrics?.customers || [];
          metricCustomers.forEach((c: string) => {
            if (c && c !== 'Unknown') {
              customers.add(c);
            }
          });
        }
      });

      const customerList = Array.from(customers).sort();
      console.log(`Found ${customerList.length} unique customers`);
      
      return customerList;
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      return [];
    }
  }

  async getIssueChangelog(issueKey: string) {
    try {
      const url = `https://${this.config.host}/rest/api/3/issue/${issueKey}?expand=changelog`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64')}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch changelog for ${issueKey}: ${response.status}`);
      }

      const data = await response.json();
      return data.changelog || { histories: [] };
    } catch (error) {
      console.error(`Failed to fetch changelog for ${issueKey}:`, error);
      return { histories: [] };
    }
  }

  async getIssueStatusAtDate(issueKey: string, targetDate: Date): Promise<string | null> {
    try {
      const url = `https://${this.config.host}/rest/api/3/issue/${issueKey}?expand=changelog&fields=status,created`;
      const response = await this.fetchWithRetry(url, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64')}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch issue ${issueKey}: ${response.status}`);
        return null;
      }

      const data = await response.json();
      const currentStatus = data.fields?.status?.name;
      const createdDate = new Date(data.fields?.created);
      
      // If issue was created after target date, it didn't exist
      if (createdDate > targetDate) {
        return null;
      }

      const changelog = data.changelog?.histories || [];
      
      // Sort changelog by date (oldest first)
      const sortedHistory = changelog.sort((a: any, b: any) => 
        new Date(a.created).getTime() - new Date(b.created).getTime()
      );

      // Find the last status change before or at target date
      let statusAtDate = currentStatus; // Start with current status
      
      // Go through history backwards to find status at target date
      for (let i = sortedHistory.length - 1; i >= 0; i--) {
        const history = sortedHistory[i];
        const historyDate = new Date(history.created);
        
        // If this change happened after target date, check the previous status
        if (historyDate > targetDate) {
          const statusChanges = history.items?.filter((item: any) => item.field === 'status');
          if (statusChanges && statusChanges.length > 0) {
            // Use the "from" status since this change happened after target date
            statusAtDate = statusChanges[0].fromString;
          }
        } else {
          // This change happened before or at target date
          const statusChanges = history.items?.filter((item: any) => item.field === 'status');
          if (statusChanges && statusChanges.length > 0) {
            // Use the "to" status since this is the last change before target date
            statusAtDate = statusChanges[0].toString;
            break;
          }
        }
      }

      return statusAtDate;
    } catch (error) {
      console.error(`Failed to get status for ${issueKey} at date:`, error);
      return null;
    }
  }
}

export const jiraClient = new JiraClient();