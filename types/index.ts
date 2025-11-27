export interface Sprint {
  id: number;
  name: string;
  state: 'active' | 'closed' | 'future';
  startDate?: string;
  endDate?: string;
  completeDate?: string;
  goal?: string;
  customer?: string;
  customers?: string[]; // All customers in this sprint
  metrics?: {
    totalPoints: number;
    completedPoints: number;
    completionRate: number;
    velocity: number;
    bugCount: number;
    customers?: string[];
    targetPoints?: number;
    targetAchievement?: number;
    issuesByStatus?: {
      done: number;
      inProgress: number;
      toDo: number;
    };
  };
}

export interface Issue {
  id: string;
  key: string;
  summary: string;
  status: {
    id: string;
    name: string;
  };
  assignee?: {
    accountId: string;
    displayName: string;
    avatarUrls: {
      '48x48': string;
    };
  };
  storyPoints?: number;
  customer?: string;
  created: string;
  updated: string;
  priority?: {
    id: string;
    name: string;
  };
}

export interface SprintMetrics {
  sprintId: number;
  sprintName: string;
  totalIssues: number;
  completedIssues: number;
  totalStoryPoints: number;
  completedStoryPoints: number;
  completionRate: number;
  velocity: number;
}

export interface CustomerMetrics {
  customer: string;
  totalIssues: number;
  completedIssues: number;
  totalStoryPoints: number;
  completedStoryPoints: number;
}

export interface DashboardData {
  sprints: Sprint[];
  metrics: SprintMetrics[];
  customerMetrics: CustomerMetrics[];
  velocityTrend: Array<{
    sprint: string;
    velocity: number;
  }>;
}

export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  status: {
    id: string;
    name: string;
  };
  assignee?: {
    accountId: string;
    displayName: string;
    avatarUrls: {
      '48x48': string;
    };
  };
  taskOwner?: string;
  storyPoints?: number;
  customer?: string;
  created: string;
  updated: string;
  priority?: {
    id: string;
    name: string;
  };
  issueType?: {
    id: string;
    name: string;
  };
}

export interface SprintDetails {
  sprint: Sprint;
  issues: JiraIssue[];
  metrics: {
    totalPoints: number;
    completedPoints: number;
    completionRate: number;
    bugCount: number;
    customers: string[];
    targetPoints?: number;
    targetAchievement?: number;
    issuesByStatus: {
      done: number;
      inProgress: number;
      toDo: number;
    };
  };
}

