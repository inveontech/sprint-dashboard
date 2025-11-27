'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useDashboardStore } from '@/lib/store';
import { formatDate } from '@/lib/utils';

export default function AIAnalysisPage() {
  const { analyzeSprint, sprintAnalysis, analyzingSprint, analysisError, selectedSprint } = useDashboardStore();
  
  const [sprints, setSprints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSprints();
  }, []);

  const fetchSprints = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/jira/sprints?sprints=6');
      const data = await response.json();
      
      if (data.sprints && data.sprints.length > 0) {
        setSprints(data.sprints);
      } else {
        setError('No sprints found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load sprints');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (sprintId: number) => {
    // Find the sprint data
    const sprint = sprints.find(s => s.id === sprintId);
    if (!sprint) {
      console.error('Sprint not found:', sprintId);
      return;
    }
    // Pass sprint data to analyzeSprint
    await analyzeSprint(sprintId, sprint);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            AI Sprint Analizi
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Sprint'leri seçin ve OpenAI ile detaylı analiz yapın
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-lg" />
            ))}
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sprint List */}
            <Card>
              <CardHeader>
                <CardTitle>Son 6 Sprint</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sprints.map((sprint) => (
                    <div
                      key={sprint.id}
                      className={`p-4 border rounded-lg transition-all ${
                        selectedSprint?.sprint.id === sprint.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{sprint.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {sprint.endDate ? formatDate(sprint.endDate, 'dd MMM yyyy') : 'N/A'}
                          </p>
                        </div>
                        <Badge variant="secondary">{sprint.customer || 'N/A'}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                        <div>
                          <span className="text-gray-600">Velocity:</span>
                          <span className="font-semibold ml-1">{sprint.metrics?.velocity || 0} SP</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Completion:</span>
                          <span className="font-semibold ml-1">{sprint.metrics?.completionRate || 0}%</span>
                        </div>
                      </div>

                      <Progress
                        value={sprint.metrics?.completionRate || 0}
                        className="h-2 mb-3"
                      />

                      <Button
                        onClick={() => handleAnalyze(sprint.id)}
                        disabled={analyzingSprint}
                        className="w-full"
                        size="sm"
                      >
                        {analyzingSprint && selectedSprint?.sprint.id === sprint.id
                          ? 'Analiz Ediliyor...'
                          : 'Analiz Et'}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Analysis Results */}
            <Card className="lg:sticky lg:top-4">
              <CardHeader>
                <CardTitle>AI Analiz Sonuçları</CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedSprint && (
                  <div className="text-center py-12 text-gray-500">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400 mb-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    <p>Soldan bir sprint seçin ve analiz edin</p>
                  </div>
                )}

                {selectedSprint && !sprintAnalysis && !analyzingSprint && !analysisError && (
                  <div className="text-center py-12 text-gray-500">
                    <p>Analiz başlatmak için butona tıklayın</p>
                  </div>
                )}

                {analyzingSprint && (
                  <div className="text-center py-12">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent mb-4"></div>
                    <p className="text-gray-600">AI analiz yapıyor...</p>
                  </div>
                )}

                {analysisError && (
                  <Alert variant="destructive">
                    <AlertDescription>{analysisError}</AlertDescription>
                  </Alert>
                )}

                {sprintAnalysis && selectedSprint && (
                  <div>
                    <div className="mb-6 pb-4 border-b border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                          {selectedSprint.sprint.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {selectedSprint.sprint.endDate
                            ? formatDate(selectedSprint.sprint.endDate, 'dd MMM yyyy')
                            : 'N/A'}
                        </span>
                        {selectedSprint.metrics && (
                          <>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                              {selectedSprint.metrics.completedPoints || 0} SP
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {selectedSprint.metrics.completionRate || 0}%
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <style jsx>{`
                        .analysis-content {
                          line-height: 1.8;
                        }
                        .analysis-content h3,
                        .analysis-content h4 {
                          color: #1f2937;
                          font-weight: 600;
                          margin-top: 1.5em;
                          margin-bottom: 0.5em;
                        }
                        .analysis-content ul,
                        .analysis-content ol {
                          margin: 1em 0;
                          padding-left: 1.5em;
                        }
                        .analysis-content li {
                          margin: 0.5em 0;
                        }
                        .analysis-content p {
                          margin: 1em 0;
                        }
                        .analysis-content strong {
                          color: #1f2937;
                          font-weight: 600;
                        }
                      `}</style>
                      <div 
                        className="analysis-content text-sm text-gray-700 dark:text-gray-300"
                        dangerouslySetInnerHTML={{
                          __html: sprintAnalysis
                            .replace(/### (.*)/g, '<h3 class="text-base font-semibold text-gray-900 dark:text-white mt-4 mb-2">$1</h3>')
                            .replace(/## (.*)/g, '<h2 class="text-lg font-bold text-gray-900 dark:text-white mt-5 mb-3">$1</h2>')
                            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>')
                            .replace(/- (.*?)(?=\n|$)/g, '<li class="ml-4">$1</li>')
                            .replace(/(\d+)\. (.*?)(?=\n|$)/g, '<li class="ml-4">$2</li>')
                            .replace(/\n\n/g, '</p><p class="my-3">')
                            .replace(/^/, '<p class="my-3">')
                            .replace(/$/, '</p>')
                            .replace(/<\/p><p class="my-3"><li/g, '<ul class="list-disc my-3"><li')
                            .replace(/<\/li><\/p>/g, '</li></ul>')
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
