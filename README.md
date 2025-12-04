# Inveon inCommerce Sprint Dashboard

Next.js 14 App Router ile geliştirilmiş sprint metrikleri ve analitik dashboard'u.

## Özellikler

- 📊 Sprint velocity ve completion rate grafikleri
- 📈 Aylık trend analizi
- 🎯 Customer bazlı filtreleme
- 🤖 OpenAI ile metrik analizi
- 📱 Responsive tasarım

## Kurulum

### Gereksinimler

- Node.js 20+
- PostgreSQL 14+
- Redis 6+

### 1. Bağımlılıkları yükleyin:

```bash
npm install
```

### 2. `.env.example` dosyasını kopyalayıp `.env` olarak kaydedin:

```bash
cp .env.example .env
```

### 3. `.env` dosyasını düzenleyin:

```env
# Veritabanı (zorunlu)
DATABASE_URL=postgresql://user:password@localhost:5432/sprint_dashboard

# Redis (zorunlu)
REDIS_URL=redis://localhost:6379

# JWT Secret (zorunlu - production'da değiştirin!)
JWT_SECRET=your-super-secret-jwt-key

# Admin kullanıcı (ilk kurulum için)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-secure-password

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

### 4. Veritabanını hazırlayın:

```bash
# PostgreSQL'de veritabanı oluşturun
sudo -u postgres psql -c "CREATE DATABASE sprint_dashboard;"
sudo -u postgres psql -c "CREATE USER youruser WITH PASSWORD 'yourpassword';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sprint_dashboard TO youruser;"
sudo -u postgres psql -c "ALTER USER youruser CREATEDB;"
sudo -u postgres psql -d sprint_dashboard -c "GRANT ALL ON SCHEMA public TO youruser;"

# Prisma migration'larını uygulayın
npx prisma migrate dev

# Admin kullanıcısını oluşturun
npx prisma db seed
```

### 5. Geliştirme sunucusunu başlatın:

```bash
npm run dev
```

### 6. Tarayıcıda `http://localhost:3010` adresini açın.

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
- Prisma ORM
- PostgreSQL
- Redis
- jira.js (Jira API client)
- OpenAI API (AI analiz)
- recharts (Chart library)
- lucide-react (Icons)

## Production Deployment

### Vercel'e Deploy Etmek

1. GitHub repo'yu Vercel'e bağlayın
2. `vercel.json`'daki environment variables'ları Vercel dashboard'ta ayarlayın:
   - `DATABASE_URL` - PostgreSQL bağlantısı
   - `REDIS_URL` - Redis bağlantısı
   - `JWT_SECRET` - Güvenli bir secret key (minimum 32 char)
   - `ADMIN_EMAIL` ve `ADMIN_PASSWORD` - İlk admin kullanıcısı
   - Jira credentials (JIRA_HOST, JIRA_EMAIL, JIRA_API_TOKEN, vs.)
   - `OPENAI_API_KEY` - AI özelliği için (opsiyonel)

3. Her deployment'da otomatik olarak:
   - `npm run build` çalıştırılır
   - Database migrations uygulanır
   - Admin user seeding yapılır

### Manuel Production Sunucuya Deploy

```bash
# Dependenciler yükleme
npm ci

# Production build
npm run build

# Environment variables ayarla
export NODE_ENV=production
export DATABASE_URL="postgresql://..."
export JWT_SECRET="..."
# ... diğer env variables

# Server başlat
npm start
```

### Environment Variables (Production)

`.env.production` dosyasını sunucuda güncelleyin:

```env
NODE_ENV=production
PORT=3010

DATABASE_URL=postgresql://user:password@db-host:5432/sprint_dashboard
REDIS_URL=redis://redis-host:6379
JWT_SECRET=your-production-secret-key-min-32-chars
ADMIN_EMAIL=admin@inveon.com
ADMIN_PASSWORD=secure-password-change-this

JIRA_MOCK=false
JIRA_HOST=your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
JIRA_BOARD_ID=284
JIRA_PROJECT_KEY=INC
OPENAI_API_KEY=sk-...
```

⚠️ **Güvenlik Uyarısı:**
- Production'da `JWT_SECRET` ve `ADMIN_PASSWORD` **HER ZAMAN** değiştirin
- Sensitive credentials hiçbir zaman GitHub'a commit etmeyin
- Vercel/sunucu environment variables kullanın

