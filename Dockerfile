# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy prisma schema (needed for generate)
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Build-time environment variables (non-sensitive, needed for Next.js build)
# These are placeholders - actual values come from runtime environment
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV REDIS_URL="redis://localhost:6379"
ENV REDIS_MOCK="true"
ENV JIRA_MOCK="true"

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy ALL node_modules (needed for Prisma 7 CLI with many dependencies)
COPY --from=builder /app/node_modules ./node_modules

# Copy Prisma schema and config
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy data files
COPY --from=builder /app/data ./data

USER nextjs

EXPOSE 3010

# Runtime configuration defaults (non-sensitive only)
# These can be overridden by docker-compose or kubernetes
ENV PORT=3010
ENV HOSTNAME="0.0.0.0"
ENV REDIS_MOCK="false"
ENV RUN_SEED="false"

# IMPORTANT: The following MUST be provided at runtime via environment variables:
# - DATABASE_URL (required)
# - REDIS_URL (required)
# - JWT_SECRET (required - generate with: openssl rand -base64 32)
# - SESSION_TTL (optional, default: 86400)
# - REFRESH_TOKEN_TTL (optional, default: 604800)
# - ADMIN_EMAIL (required for first run)
# - ADMIN_PASSWORD (required for first run)

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3010/ || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
