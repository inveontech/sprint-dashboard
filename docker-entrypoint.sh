#!/bin/sh
set -e

echo "🚀 Starting Sprint Dashboard..."

# Run database migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy

# Check if this is the first run (no admin user exists)
# The seed script handles this check internally
if [ "$RUN_SEED" = "true" ]; then
  echo "🌱 Running database seed..."
  npx prisma db seed
fi

echo "✅ Database ready!"

# Start the application
echo "🎯 Starting Next.js server..."
exec node server.js
