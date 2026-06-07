import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';

@Module({
  imports: [
    JwtModule.register({
      secret:
        process.env.JWT_SECRET || 'junce-dev-secret-key-change-in-production',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService],
})
export class WorkOrdersModule {}
