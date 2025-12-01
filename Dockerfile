# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Copy environment file for build
COPY .env.example .env.local

# Install dependencies
RUN npm ci

# Copy prisma schema (needed for generate)
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma client and schema (needed for migrations in production)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# Copy seed script dependencies
COPY --from=builder /app/node_modules/ts-node ./node_modules/ts-node
COPY --from=builder /app/node_modules/typescript ./node_modules/typescript
COPY --from=builder /app/node_modules/@types ./node_modules/@types

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy data files
COPY --from=builder /app/data ./data

USER nextjs

EXPOSE 3010

ENV PORT=3010
ENV HOSTNAME="0.0.0.0"

# Database configuration
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sprint_dashboard"

# Redis configuration (can be overridden by docker-compose)
ENV REDIS_URL="redis://localhost:6379"
ENV REDIS_MOCK="false"

# Auth configuration
ENV JWT_SECRET="UBMJHNUfx222pFiizP1QRdPijB4Cunsqh0HCLd6QDH4="
ENV SESSION_TTL="86400"
ENV REFRESH_TOKEN_TTL="604800"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3010/ || exit 1

# Set to "true" on first deployment to seed admin user
ENV RUN_SEED="true"

ENTRYPOINT ["/docker-entrypoint.sh"]
