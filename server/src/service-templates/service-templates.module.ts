import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ServiceTemplatesController } from './service-templates.controller';
import { ServiceTemplatesService } from './service-templates.service';

@Module({
  imports: [
    JwtModule.register({
      secret:
        process.env.JWT_SECRET || 'junce-dev-secret-key-change-in-production',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [ServiceTemplatesController],
  providers: [ServiceTemplatesService],
})
export class ServiceTemplatesModule {}
