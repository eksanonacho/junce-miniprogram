#!/bin/sh
set -e

echo "📦 执行数据库 migration..."
npx prisma migrate deploy

# seed 仅首次部署或显式启用
if [ "$RUN_SEED" = "true" ]; then
  echo "🌱 执行种子数据..."
  npx prisma db seed
else
  echo "⏭️  跳过种子数据（设 RUN_SEED=true 启用）"
fi

echo "🚀 启动应用..."
exec node dist/src/main
