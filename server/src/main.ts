// 必须在所有 import 之前加载 .env，确保 PrismaService 构造时 DATABASE_URL 已就绪
import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 开启 CORS（联调阶段允许所有来源，上线后收紧）
  app.enableCors({
    origin: true,            // 允许所有来源（开发阶段）
    credentials: true,       // 允许携带 Cookie
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
