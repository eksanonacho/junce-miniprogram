import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { FissionLeadsController } from './fission-leads.controller';
import { FissionLeadsService } from './fission-leads.service';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'junce-dev-secret-key-change-in-production',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [FissionLeadsController],
  providers: [FissionLeadsService, RolesGuard],
})
export class FissionLeadsModule {}
