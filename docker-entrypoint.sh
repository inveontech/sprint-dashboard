#!/bin/sh
set -e

echo "🚀 Starting Sprint Dashboard..."

# Run database migrations
echo "📦 Running database migrations..."
node node_modules/prisma/build/index.js migrate deploy

# Check if this is the first run (no admin user exists)
# The seed script handles this check internally
if [ "$RUN_SEED" = "true" ]; then
  echo "🌱 Running database seed..."
  node node_modules/prisma/build/index.js db seed
fi

echo "✅ Database ready!"

# Start the application
echo "🎯 Starting Next.js server..."
exec node server.js
