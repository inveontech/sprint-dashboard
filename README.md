# Inveon inCommerce Sprint Dashboard

Next.js 14 App Router ile geliştirilmiş sprint metrikleri ve analitik dashboard'u.

## Özellikler

- 📊 Sprint velocity ve completion rate grafikleri
- 📈 Aylık trend analizi
- 🎯 Customer bazlı filtreleme
- 🤖 OpenAI ile metrik analizi
- 📱 Responsive tasarım

## Kurulum

1. Bağımlılıkları yükleyin:

```bash
npm install
```

2. `.env.example` dosyasını kopyalayıp `.env` olarak kaydedin:

```bash
cp .env.example .env
```

3. `.env` dosyasını düzenleyin:

```env
# Mock mod (Jira bağlantısı olmadan test için)
JIRA_MOCK=true

# Gerçek Jira bağlantısı için (JIRA_MOCK=false olmalı)
JIRA_HOST=your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
JIRA_BOARD_ID=123
JIRA_PROJECT_KEY=ABC
JIRA_CUSTOMER_FIELD=customfield_10000
JIRA_STORY_POINTS_FIELD=customfield_10002
JIRA_TASK_OWNER_FIELD=customfield_10656

# AI Analiz için (opsiyonel)
OPENAI_API_KEY=your-openai-api-key
```

4. Geliştirme sunucusunu başlatın:

```bash
npm run dev
```

5. Tarayıcıda `http://localhost:3010` adresini açın.

## Environment Variables

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `JIRA_MOCK` | Hayır | `true` yapılırsa mock data kullanılır, Jira bağlantısı gerekmez |
| `JIRA_HOST` | Evet* | Atlassian domain (örn: `your-domain.atlassian.net`) |
| `JIRA_EMAIL` | Evet* | Atlassian hesap email'i |
| `JIRA_API_TOKEN` | Evet* | Jira API token ([buradan alın](https://id.atlassian.com/manage-profile/security/api-tokens)) |
| `JIRA_BOARD_ID` | Evet* | Jira board ID'si |
| `JIRA_PROJECT_KEY` | Evet* | Jira proje anahtarı (örn: `INC`) |
| `JIRA_CUSTOMER_FIELD` | Hayır | Customer custom field ID (varsayılan: `customfield_10000`) |
| `JIRA_STORY_POINTS_FIELD` | Hayır | Story points custom field ID (varsayılan: `customfield_10002`) |
| `JIRA_TASK_OWNER_FIELD` | Hayır | Task owner custom field ID (varsayılan: `customfield_10656`) |
| `OPENAI_API_KEY` | Hayır | AI analiz özelliği için OpenAI API key ([buradan alın](https://platform.openai.com/api-keys)) |

*`JIRA_MOCK=true` ise bu değişkenler zorunlu değildir.

## Teknolojiler

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- jira.js (Jira API client)
- OpenAI API (AI analiz)
- recharts (Chart library)
- zustand (State management)
- lucide-react (Icons)

