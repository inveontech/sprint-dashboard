export interface EnvStatus {
  isConfigured: boolean;
  isMockMode: boolean;
  missingVariables: {
    jira: string[];
    ai: string[];
  };
  warnings: string[];
}

export function getEnvStatus(): EnvStatus {
  const jiraVariables = [
    { key: 'JIRA_HOST', label: 'JIRA_HOST', required: true },
    { key: 'JIRA_EMAIL', label: 'JIRA_EMAIL', required: true },
    { key: 'JIRA_API_TOKEN', label: 'JIRA_API_TOKEN', required: true },
    { key: 'JIRA_BOARD_ID', label: 'JIRA_BOARD_ID', required: true },
    { key: 'JIRA_PROJECT_KEY', label: 'JIRA_PROJECT_KEY', required: true },
  ];

  const aiVariables = [
    { key: 'OPENAI_API_KEY', label: 'OPENAI_API_KEY', required: false },
  ];

  const missingJira = jiraVariables
    .filter(v => !process.env[v.key])
    .map(v => v.label);

  const missingAi = aiVariables
    .filter(v => !process.env[v.key])
    .map(v => v.label);

  const isMockMode = process.env.JIRA_MOCK === 'true' || missingJira.length > 0;
  const isConfigured = missingJira.length === 0;

  const warnings: string[] = [];

  if (isMockMode && missingJira.length > 0) {
    warnings.push(
      `Jira bağlantısı yapılandırılmamış. Mock veri kullanılıyor. ` +
      `Gerçek Jira verilerine erişmek için .env dosyasına şu değişkenleri ekleyin: ${missingJira.join(', ')}`
    );
  }

  if (missingAi.length > 0) {
    warnings.push(
      `AI analiz özelliği devre dışı. Etkinleştirmek için .env dosyasına şu değişkenleri ekleyin: ${missingAi.join(', ')}`
    );
  }

  return {
    isConfigured,
    isMockMode,
    missingVariables: {
      jira: missingJira,
      ai: missingAi,
    },
    warnings,
  };
}
