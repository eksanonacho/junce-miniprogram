# ============================================================
# 君册财税小程序 — NestJS 后端 Dockerfile
# 多阶段构建：build → production
# Node 版本：22-alpine（LTS）
#   原因：pnpm 11.x 要求 Node ≥ 22.13；22 是当前 LTS，
#   build 与 production 同一大版本，避免 native deps 不兼容。
# ============================================================

# ---- Stage 1: build ----
FROM node:22-alpine AS build

# node:22-alpine 已内置 OpenSSL 运行时库，无需额外安装
RUN npm install -g pnpm@9.15.9
WORKDIR /app

# 安装依赖（pnpm v9 兼容 lockfile v9.0，无构建审批限制）
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 生成 Prisma client（输出 .ts 文件到 generated/prisma/）
COPY prisma.config.ts ./
COPY prisma/ ./prisma/
RUN npx prisma generate

# 构建 NestJS（tsc 编译 generated/prisma/*.ts → dist/generated/prisma/*.js）
COPY src/ ./src/
COPY tsconfig.json tsconfig.build.json ./
RUN pnpm build

# Prisma 7 CJS: Linux ARM64 环境生成的 .ts import 可能保留 .ts 扩展名
# 先检查，仅在确实存在时修复
RUN echo "=== 检查 .ts require ===" && grep -R "require(.*\\.ts" dist || true
RUN if grep -Rl "require(.*\\.ts" dist > /dev/null 2>&1; then \
      echo "发现 .ts require，执行 sed 修复..."; \
      find dist -name '*.js' -exec sed -i "s/require(\"\(.*\)\.ts\")/require(\"\1.js\")/g" {} \; ; \
      echo "=== 修复后验证(应为空) ===" && grep -R "require(.*\\.ts" dist || echo "(无残留)"; \
    else \
      echo "无需 sed 修复"; \
    fi

# ---- Stage 2: production ----
FROM node:22-alpine AS production

# node:22-alpine 已内置 OpenSSL，无需额外安装
WORKDIR /app

# 复制生产所需文件
COPY --from=build /app/dist/ ./dist/
COPY --from=build /app/generated/ ./generated/
COPY --from=build /app/node_modules/ ./node_modules/
COPY prisma.config.ts ./
COPY prisma/ ./prisma/
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
