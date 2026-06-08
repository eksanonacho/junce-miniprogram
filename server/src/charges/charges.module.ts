import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChargesController } from './charges.controller';
import { ChargesService } from './charges.service';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [
    JwtModule.register({
      secret:
        process.env.JWT_SECRET || 'junce-dev-secret-key-change-in-production',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [ChargesController],
  providers: [ChargesService, RolesGuard],
})
export class ChargesModule {}
