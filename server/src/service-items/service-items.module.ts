import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ServiceItemsController } from './service-items.controller';
import { ServiceItemsService } from './service-items.service';

@Module({
  imports: [
    JwtModule.register({
      secret:
        process.env.JWT_SECRET || 'junce-dev-secret-key-change-in-production',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [ServiceItemsController],
  providers: [ServiceItemsService],
})
export class ServiceItemsModule {}
