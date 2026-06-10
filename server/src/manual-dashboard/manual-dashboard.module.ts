import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ManualDashboardController } from './manual-dashboard.controller';
import { ManualDashboardService } from './manual-dashboard.service';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET || 'junce-dev-secret-key-change-in-production', signOptions: { expiresIn: '7d' } }),
  ],
  controllers: [ManualDashboardController],
  providers: [ManualDashboardService, RolesGuard],
})
export class ManualDashboardModule {}
