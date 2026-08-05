import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { AuthModule } from '../auth/auth.module';
import { AccountingWorkLogsController } from './accounting-work-logs.controller';
import { AccountingWorkLogsService } from './accounting-work-logs.service';

@Module({
  imports: [PrismaModule, PermissionsModule, AuthModule],
  controllers: [AccountingWorkLogsController],
  providers: [AccountingWorkLogsService],
})
export class AccountingWorkLogsModule {}
