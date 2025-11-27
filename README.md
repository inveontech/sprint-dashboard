# Inveon inCommerce Sprint Dashboard

Next.js 14 App Router ile geliştirilmiş sprint metrikleri ve analitik dashboard'u.

## Özellikler

- 📊 Sprint velocity ve completion rate grafikleri
- 📈 Aylık trend analizi
- 🎯 Customer bazlı filtreleme
- 🤖 Claude AI ile metrik analizi
- 📱 Responsive tasarım

## Kurulum

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. `.env.local` dosyasını oluşturun:
```env
JIRA_HOST=inveon.atlassian.net
JIRA_EMAIL=your-email@inveon.com
JIRA_API_TOKEN=your-api-token
JIRA_BOARD_ID=79
JIRA_PROJECT_KEY=INC
JIRA_CUSTOMER_FIELD=customfield_10518
JIRA_STORY_POINTS_FIELD=customfield_10677
ANTHROPIC_API_KEY=your-claude-api-key
```

3. Geliştirme sunucusunu başlatın:
```bash
npm run dev
```

4. Tarayıcıda `http://localhost:3000` adresini açın.

## Teknolojiler

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- jira.js (Jira API client)
- @anthropic-ai/sdk (Claude API)
- recharts (Chart library)
- zustand (State management)
- lucide-react (Icons)

