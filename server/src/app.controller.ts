import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * 健康检查端点（基础设施，不算业务模块）
   * - 不查询业务表
   * - 不返回敏感配置
   * - 供 Docker / nginx / 监控探活使用
   */
  @Get('/health')
  health() {
    return {
      status: 'ok',
      service: 'junce-miniprogram-api',
      timestamp: new Date().toISOString(),
    };
  }
}
