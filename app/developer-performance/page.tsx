"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { IssueTypeChart } from "@/components/charts/IssueTypeChart";
import { useDashboardStore } from "@/lib/store";
import SprintSelector from "@/components/dashboard/SprintSelector";
import { PageHeader } from "@/components/layout/PageHeader";

interface DeveloperData {
  developer: string;
  sprintCount: number;
  totalPoints: number;
  completedPoints: number;
  completionRate: number;
  avgVelocity: number;
  targetSP: number;
  targetAchievement: number;
  issuesByType: Array<{
    issueType: string;
    count: number;
    completedCount: number;
    points: number;
    percentage: number;
  }>;
}

export default function DeveloperPerformancePage() {
  const { setCustomer } = useDashboardStore();
  const [developers, setDevelopers] = useState<DeveloperData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'target' | 'sp'>('target');
  const [allSprints, setAllSprints] = useState<any[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');

  // Reset customer filter on page mount
  useEffect(() => {
    setCustomer(null);
  }, []);

  // Fetch all sprints for selector
  useEffect(() => {
    const fetchAllSprints = async () => {
      try {
        const response = await fetch('/api/jira/sprints?sprints=6');
        const data = await response.json();
        if (data.sprints && data.sprints.length > 0) {
          setAllSprints(data.sprints);
          if (!selectedSprintId) {
            setSelectedSprintId(data.sprints[0].id.toString());
          }
        }
      } catch (error) {
        console.error('Failed to fetch sprints:', error);
      }
    };
    fetchAllSprints();
  }, []);

  const fetchDevelopers = async () => {
    if (!selectedSprintId) return;
    
    setLoading(true);
    try {
      console.log('Fetching developers for sprint:', selectedSprintId);
      const response = await fetch(`/api/jira/developers?sprintId=${selectedSprintId}`);
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Received data:', data);
      console.log('Data is array?', Array.isArray(data));
      console.log('Data length:', data?.length);
      setDevelopers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch developers:', error);
      setDevelopers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevelopers();
  }, [selectedSprintId]);

  const selectedSprint = allSprints.find(s => s.id.toString() === selectedSprintId);

  const sortedDevelopers = [...developers].sort((a, b) => {
    return b.completedPoints - a.completedPoints;
  });

  const topDeveloper = sortedDevelopers[0];
  const totalCompleted = sortedDevelopers.reduce((sum, d) => sum + d.completedPoints, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <PageHeader title="Developer Performance" description="Geliştirici bazlı performans metriklerini takip edin" />
            <SprintSelector
              sprints={allSprints}
              selectedMode={selectedSprintId}
              onModeChange={setSelectedSprintId}
              loading={loading}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-8">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">En Yüksek Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topDeveloper?.completedPoints || 0} SP</div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {topDeveloper?.developer || '-'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Aktif Developer Sayısı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sortedDevelopers.length}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Developer</p>
          </CardContent>
        </Card>
      </div>

      {/* Developer Cards with Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
        {sortedDevelopers.map((dev) => {
          return (
            <Card key={dev.developer}>
              <CardHeader>
                <CardTitle className="text-lg">{dev.developer}</CardTitle>
                <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>Tamamlanan: {dev.completedPoints} SP</span>
                  <span>Hedef: {dev.targetSP} SP</span>
                </div>
                <div className="mt-2">
                  <span className={`text-xl font-bold ${
                    dev.targetAchievement >= 100 ? 'text-green-600 dark:text-green-400' :
                    dev.targetAchievement >= 80 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {dev.targetAchievement}% Hedefe Ulaşım
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <IssueTypeChart 
                  data={dev.issuesByType}
                  title="Issue Type Dağılımı (SP)"
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {loading && (
        <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
      )}

      {!loading && sortedDevelopers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {selectedSprint ? 
            `Bu sprintte (${selectedSprint.name}) hiçbir developer verisi bulunamadı` :
            "Developer verisi bulunamadı"
          }
        </div>
      )}
      </main>
    </div>
  );
}
