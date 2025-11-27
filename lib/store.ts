import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Sprint, SprintDetails } from '@/types';

interface DashboardStore {
  // Filters
  selectedCustomer: string | null;
  dateRange: number; // sprint count (1, 3, 6, 12)

  // Data
  sprints: Sprint[];
  customers: string[];
  loading: boolean;
  error: string | null;

  // Selected sprint for analysis
  selectedSprint: SprintDetails | null;
  sprintAnalysis: string | null;
  analyzingSprint: boolean;
  analysisError: string | null;

  // Actions
  setCustomer: (customer: string | null) => void;
  setCustomers: (customers: string[]) => void;
  setDateRange: (sprintCount: number) => void;

  fetchSprints: (forceSprintCount?: number) => Promise<void>;
  fetchSprintDetails: (sprintId: number) => Promise<void>;
  analyzeSprint: (sprintId: number, sprintData?: any) => Promise<void>;
  clearError: () => void;
}

const CACHE_KEY = 'sprint-cache-v2'; // v2: target-based completion rate
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes - longer cache for better performance

interface CachedData {
  sprints: Sprint[];
  customers: string[];
  timestamp: number;
  customer?: string;
  sprintCount?: number;
}

const getCachedData = (customer: string | null, sprintCount: number): CachedData | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: CachedData = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is valid (same filters and not expired)
    if (
      data.customer === (customer || null) &&
      data.sprintCount === sprintCount &&
      now - data.timestamp < CACHE_DURATION
    ) {
      return data;
    }

    return null;
  } catch {
    return null;
  }
};

const setCachedData = (data: CachedData) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to cache sprint data:', error);
  }
};

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set, get) => ({
      // Initial state
      selectedCustomer: null,
      dateRange: 6, // Fetch 6 sprints by default
      sprints: [],
      customers: [],
      loading: false,
      error: null,
      selectedSprint: null,
      sprintAnalysis: null,
      analyzingSprint: false,
      analysisError: null,

      // Actions
      setCustomer: (customer) => set({ selectedCustomer: customer }),
      
      setCustomers: (customers) => set({ customers }),

      setDateRange: (sprintCount) => set({ dateRange: sprintCount }),

      fetchSprints: async (forceSprintCount?: number) => {
        const { selectedCustomer, dateRange } = get();
        const sprintCount = forceSprintCount || dateRange;

        // Check cache first (skip if forced sprint count)
        if (!forceSprintCount) {
          const cached = getCachedData(selectedCustomer, sprintCount);
          if (cached) {
            set({
              sprints: cached.sprints,
              customers: cached.customers,
              loading: false,
              error: null,
            });
            return;
          }
        }

        set({ loading: true, error: null });

        try {
          const params = new URLSearchParams();
          if (selectedCustomer) {
            params.append('customer', selectedCustomer);
          }
          params.append('sprints', sprintCount.toString());

          const response = await fetch(`/api/jira/sprints?${params.toString()}`);

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch sprints');
          }

          const data = await response.json();

          if (!data.success) {
            throw new Error(data.error || 'Failed to fetch sprints');
          }

          // Cache the data (only if not forced sprint count)
          if (!forceSprintCount) {
            setCachedData({
              sprints: data.sprints,
              customers: data.customers,
              timestamp: Date.now(),
              customer: selectedCustomer || undefined,
              sprintCount: sprintCount,
            });
          }

          set({
            sprints: data.sprints,
            customers: data.customers,
            loading: false,
            error: null,
          });
        } catch (error: any) {
          console.error('Error fetching sprints:', error);
          set({
            loading: false,
            error: error.message || 'Failed to fetch sprints',
          });
        }
      },

      fetchSprintDetails: async (sprintId: number) => {
        set({ loading: true, error: null, selectedSprint: null });

        try {
          const { selectedCustomer } = get();
          const params = new URLSearchParams();
          if (selectedCustomer) {
            params.append('customer', selectedCustomer);
          }
          const url = `/api/jira/sprint/${sprintId}${params.toString() ? `?${params.toString()}` : ''}`;
          const response = await fetch(url);

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch sprint details');
          }

          const data = await response.json();

          if (!data.success) {
            throw new Error(data.error || 'Failed to fetch sprint details');
          }

          // Transform API response to SprintDetails format
          const sprintDetails: SprintDetails = {
            sprint: {
              id: data.sprint.id,
              name: data.sprint.name,
              state: data.sprint.state,
              startDate: data.sprint.startDate,
              endDate: data.sprint.endDate,
              completeDate: data.sprint.completeDate,
              goal: data.sprint.goal,
            },
            issues: data.issues.map((issue: any) => ({
              id: issue.key,
              key: issue.key,
              summary: issue.summary,
              status: {
                id: '',
                name: issue.status,
              },
              storyPoints: issue.storyPoints,
              customer: issue.customer,
              assignee: issue.assignee ? {
                accountId: '',
                displayName: issue.assignee,
                avatarUrls: {
                  '48x48': '',
                },
              } : undefined,
              created: '',
              updated: '',
              priority: issue.priority ? {
                id: '',
                name: issue.priority,
              } : undefined,
              issueType: issue.issueType ? {
                id: '',
                name: issue.issueType,
              } : undefined,
            })),
            metrics: {
              totalPoints: data.metrics.totalPoints,
              completedPoints: data.metrics.completedPoints,
              completionRate: data.metrics.completionRate,
              bugCount: data.metrics.bugCount,
              customers: data.sprint.customer ? [data.sprint.customer] : [],
              issuesByStatus: data.metrics.issuesByStatus || {
                done: 0,
                inProgress: 0,
                toDo: 0,
              },
            },
          };

          set({
            selectedSprint: sprintDetails,
            loading: false,
            error: null,
          });
        } catch (error: any) {
          console.error('Error fetching sprint details:', error);
          set({
            loading: false,
            error: error.message || 'Failed to fetch sprint details',
          });
        }
      },

      analyzeSprint: async (sprintId: number, sprintData?: any) => {
        const { sprints } = get();

        // Use provided sprint data or find in store
        let currentSprint = sprintData;
        if (!currentSprint) {
          currentSprint = sprints.find(s => s.id === sprintId);
        }
        
        if (!currentSprint) {
          console.error('Sprint not found:', sprintId, 'Available sprints:', sprints.length);
          set({
            analysisError: 'Sprint not found',
          });
          return;
        }

        set({
          analyzingSprint: true,
          analysisError: null,
          sprintAnalysis: null,
          selectedSprint: {
            sprint: {
              id: currentSprint.id,
              name: currentSprint.name,
              state: currentSprint.state || 'closed',
              startDate: currentSprint.startDate || '',
              endDate: currentSprint.endDate || '',
              completeDate: currentSprint.completeDate || '',
              goal: currentSprint.goal || '',
            },
            issues: [],
            metrics: currentSprint.metrics || {
              totalPoints: 0,
              completedPoints: 0,
              completionRate: 0,
              bugCount: 0,
              customers: [],
              issuesByStatus: { done: 0, inProgress: 0, toDo: 0 },
            },
          },
        });

        try {
          // Fetch detailed sprint data from API
          const detailsResponse = await fetch(`/api/jira/sprint/${sprintId}`);
          let sprintDetails = null;
          let issues = [];
          
          if (detailsResponse.ok) {
            const detailsData = await detailsResponse.json();
            if (detailsData.success) {
              sprintDetails = detailsData;
              issues = detailsData.issues || [];
            }
          }

          // Get previous sprints for comparison
          const currentSprintIndex = sprints.findIndex(s => s.id === sprintId);
          const previousSprints = sprints
            .slice(Math.max(0, currentSprintIndex - 3), currentSprintIndex)
            .map(s => ({
              name: s.name,
              customer: s.customer || 'N/A',
              metrics: {
                completedPoints: s.metrics?.completedPoints || 0,
                totalPoints: s.metrics?.totalPoints || 0,
                completionRate: s.metrics?.completionRate || 0,
                bugCount: s.metrics?.bugCount || 0,
              },
            }));

          // Analyze issues by type and customer
          const issuesByType: Record<string, number> = {};
          const issuesByCustomer: Record<string, any> = {};
          const bugsByCustomer: Record<string, number> = {};
          
          issues.forEach((issue: any) => {
            // Handle issueType as both string and object
            const type = typeof issue.issueType === 'string' 
              ? issue.issueType 
              : (issue.issueType?.name || 'Unknown');
            const customer = issue.customer || 'Unknown';
            
            issuesByType[type] = (issuesByType[type] || 0) + 1;
            
            if (!issuesByCustomer[customer]) {
              issuesByCustomer[customer] = { total: 0, bugs: 0, secondLevel: 0, done: 0 };
            }
            issuesByCustomer[customer].total++;
            
            if (type.toLowerCase().includes('bug')) {
              issuesByCustomer[customer].bugs++;
              bugsByCustomer[customer] = (bugsByCustomer[customer] || 0) + 1;
            }
            
            if (type.toLowerCase().includes('second level')) {
              issuesByCustomer[customer].secondLevel++;
            }
            
            if (issue.status === 'Done') {
              issuesByCustomer[customer].done++;
            }
          });

          const response = await fetch('/api/claude/analyze', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sprint: {
                name: currentSprint.name,
                customer: currentSprint.customer || 'N/A',
                metrics: currentSprint.metrics || {
                  completedPoints: 0,
                  totalPoints: 0,
                  completionRate: 0,
                  bugCount: 0,
                },
                issuesByType,
                issuesByCustomer,
                totalIssues: issues.length,
              },
              previousSprints: previousSprints.length > 0 ? previousSprints : undefined,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to analyze sprint');
          }

          const data = await response.json();

          if (!data.success) {
            throw new Error(data.error || 'Failed to analyze sprint');
          }

          set({
            sprintAnalysis: data.analysis,
            analyzingSprint: false,
            analysisError: null,
          });
        } catch (error: any) {
          console.error('Error analyzing sprint:', error);
          set({
            analyzingSprint: false,
            analysisError: error.message || 'Failed to analyze sprint',
          });
        }
      },

      clearError: () => set({ error: null, analysisError: null }),
    }),
    {
      name: 'dashboard-storage',
      partialize: (state) => ({
        selectedCustomer: state.selectedCustomer,
        dateRange: state.dateRange,
      }),
    }
  )
);
