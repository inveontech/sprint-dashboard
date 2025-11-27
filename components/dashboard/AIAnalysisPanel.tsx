'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDashboardStore } from '@/lib/store';

export default function AIAnalysisPanel() {
  const {
    selectedSprint,
    sprintAnalysis,
    analyzingSprint,
    analysisError,
    analyzeSprint,
  } = useDashboardStore();

  const handleAnalyze = async () => {
    if (!selectedSprint) return;
    await analyzeSprint(selectedSprint.sprint.id);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedSprint ? (
          <>
            <Button
              onClick={handleAnalyze}
              disabled={analyzingSprint}
              className="w-full"
            >
              {analyzingSprint ? 'Analyzing...' : 'Analyze Sprint'}
            </Button>
            {analysisError && (
              <Alert variant="destructive">
                <AlertDescription>{analysisError}</AlertDescription>
              </Alert>
            )}
            {sprintAnalysis && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                <p className="text-sm whitespace-pre-wrap">{sprintAnalysis}</p>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">
            Select a sprint from the table to analyze
          </p>
        )}
      </CardContent>
    </Card>
  );
}

