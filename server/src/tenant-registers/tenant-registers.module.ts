import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TenantRegistersController } from './tenant-registers.controller';
import { TenantRegistersService } from './tenant-registers.service';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [
    JwtModule.register({
      secret:
        process.env.JWT_SECRET || 'junce-dev-secret-key-change-in-production',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [TenantRegistersController],
  providers: [TenantRegistersService, RolesGuard],
})
export class TenantRegistersModule {}
