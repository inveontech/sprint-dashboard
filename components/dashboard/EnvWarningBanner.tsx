'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';

interface EnvStatus {
  isConfigured: boolean;
  isMockMode: boolean;
  missingVariables: {
    jira: string[];
    ai: string[];
  };
  warnings: string[];
}

interface EnvWarningBannerProps {
  envStatus?: EnvStatus;
}

export function EnvWarningBanner({ envStatus }: EnvWarningBannerProps) {
  if (!envStatus || (envStatus.isConfigured && envStatus.missingVariables.ai.length === 0)) {
    return null;
  }

  return (
    <div className="space-y-2 mb-4">
      {envStatus.isMockMode && envStatus.missingVariables.jira.length > 0 && (
        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>Mock Mod Aktif:</strong> Jira bağlantısı yapılandırılmamış, örnek veriler gösteriliyor.
            <details className="mt-2">
              <summary className="cursor-pointer text-sm hover:underline">
                Gerçek Jira verilerine erişmek için yapılandırma
              </summary>
              <div className="mt-2 text-sm bg-amber-100 dark:bg-amber-900/40 p-3 rounded-md">
                <p className="mb-2">Aşağıdaki değişkenleri <code className="bg-amber-200 dark:bg-amber-800 px-1 rounded">.env</code> dosyasına ekleyin:</p>
                <ul className="list-disc list-inside space-y-1 font-mono text-xs">
                  {envStatus.missingVariables.jira.map((v) => (
                    <li key={v}>{v}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs">
                  API token almak için:{' '}
                  <a 
                    href="https://id.atlassian.com/manage-profile/security/api-tokens" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-amber-600"
                  >
                    Atlassian API Tokens
                  </a>
                </p>
              </div>
            </details>
          </AlertDescription>
        </Alert>
      )}

      {envStatus.missingVariables.ai.length > 0 && (
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <strong>AI Analiz Devre Dışı:</strong> OpenAI API key yapılandırılmamış.
            <details className="mt-2">
              <summary className="cursor-pointer text-sm hover:underline">
                AI analiz özelliğini etkinleştirmek için
              </summary>
              <div className="mt-2 text-sm bg-blue-100 dark:bg-blue-900/40 p-3 rounded-md">
                <p className="mb-2">Aşağıdaki değişkeni <code className="bg-blue-200 dark:bg-blue-800 px-1 rounded">.env</code> dosyasına ekleyin:</p>
                <ul className="list-disc list-inside space-y-1 font-mono text-xs">
                  {envStatus.missingVariables.ai.map((v) => (
                    <li key={v}>{v}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs">
                  API key almak için:{' '}
                  <a 
                    href="https://platform.openai.com/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-600"
                  >
                    OpenAI API Keys
                  </a>
                </p>
              </div>
            </details>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
