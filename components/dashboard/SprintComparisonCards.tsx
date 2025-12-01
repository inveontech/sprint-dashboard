'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Target, Bug, FileText, TrendingUp, TrendingDown } from 'lucide-react';

interface SprintComparisonCardsProps {
  sprints: any[];
  selectedCustomer?: string;
}

export default function SprintComparisonCards({ sprints, selectedCustomer }: SprintComparisonCardsProps) {
  if (!sprints || sprints.length === 0) {
    return null;
  }

  const latestSprint = sprints[0];
  const previousSprint = sprints.length > 1 ? sprints[1] : null;

  // Calculate Sprint Success: Done SP / Target SP * 100
  // Use targetPoints (customer targets) if available, otherwise use totalPoints
  const latestDoneSP = latestSprint.metrics?.completedPoints || 0;
  const latestTargetSP = latestSprint.metrics?.targetPoints || latestSprint.metrics?.totalPoints || 0;
  const latestSuccess = latestSprint.metrics?.targetAchievement || (latestTargetSP > 0 ? (latestDoneSP / latestTargetSP) * 100 : 0);

  // Calculate Bug SP (not count)
  const latestBugSP = latestSprint.issueTypes?.find((t: any) => t.type === 'Bug')?.storyPoints || 0;
  const previousBugSP = previousSprint?.issueTypes?.find((t: any) => t.type === 'Bug')?.storyPoints || 0;
  const bugChange = previousSprint ? latestBugSP - previousBugSP : 0;

  // Calculate CR (Change Request) total SP (all tasks, not just done)
  const latestCRSP = latestSprint.issueTypes?.find((t: any) => t.type === 'Change Request')?.storyPoints || 0;
  const previousCRSP = previousSprint?.issueTypes?.find((t: any) => t.type === 'Change Request')?.storyPoints || 0;
  const crChange = previousSprint ? latestCRSP - previousCRSP : 0;

  const getTrendIcon = (value: number, inverse: boolean = false) => {
    if (value === 0) return null;
    const isPositive = inverse ? value < 0 : value > 0;
    const color = isPositive ? 'text-green-500' : 'text-red-500';
    const Icon = value > 0 ? TrendingUp : TrendingDown;
    return <Icon className={`h-5 w-5 ${color}`} />;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Sprint Name */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-500">Son Sprint{selectedCustomer ? ` - ${selectedCustomer}` : ''}</p>
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <p className="text-xl font-bold">
                {latestSprint.name}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sprint Success Rate */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-500">Sprint Başarısı</p>
                <Target className="h-4 w-4 text-gray-400" />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold">
                  {Math.round(latestSuccess)}%
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {latestDoneSP} done / {latestTargetSP} target
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bug SP */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-500">Bug Story Points</p>
                <Bug className="h-4 w-4 text-gray-400" />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold">
                  {latestBugSP} SP
                </p>
                {previousSprint && getTrendIcon(bugChange, true)}
              </div>
              {previousSprint && (
                <p className="text-xs text-gray-500 mt-1">
                  {bugChange > 0 ? '+' : ''}{bugChange} SP değişim
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CR (Change Request) SP */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-500">CR Story Points</p>
                <FileText className="h-4 w-4 text-gray-400" />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold">
                  {latestCRSP} SP
                </p>
                {previousSprint && getTrendIcon(crChange, false)}
              </div>
              {previousSprint && (
                <p className="text-xs text-gray-500 mt-1">
                  {crChange > 0 ? '+' : ''}{crChange} SP değişim
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
