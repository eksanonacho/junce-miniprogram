// 必须在所有 import 之前加载 .env，确保 PrismaService 构造时 DATABASE_URL 已就绪
import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

// ============================================================
// 安全启动保护（仅生产环境触发）
// 不属于业务逻辑 —— 这是基础设施层面的安全兜底。
// ============================================================
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET) {
    console.error('❌ 生产环境必须设置 JWT_SECRET 环境变量');
    process.exit(1);
  }
  if (
    process.env.JWT_SECRET === 'junce-dev-secret-key-change-in-production'
  ) {
    console.error(
      '❌ 生产环境禁止使用开发默认 JWT_SECRET，请用 openssl rand -hex 64 生成强随机值',
    );
    process.exit(1);
  }
  if (!process.env.CORS_ORIGIN) {
    console.error(
      '❌ 生产环境必须设置 CORS_ORIGIN 环境变量（前端来源域名，如 https://app.example.com）',
    );
    process.exit(1);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 策略：开发全开，生产按 CORS_ORIGIN 白名单（支持逗号分隔多域名）
  const corsOrigin =
    process.env.NODE_ENV === 'production' && process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
      : true;

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // 开启全局 DTO 校验
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // 自动去掉 DTO 里没定义的字段
      forbidNonWhitelisted: false,
      transform: true,       // 自动把字符串转成 DTO 定义的类型
    }),
  );

  // 监听所有网络接口（0.0.0.0），支持局域网其他设备访问
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
