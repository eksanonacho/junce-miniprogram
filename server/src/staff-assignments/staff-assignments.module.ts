import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { StaffAssignmentsController } from './staff-assignments.controller';
import { StaffAssignmentsService } from './staff-assignments.service';

@Module({
  imports: [
    JwtModule.register({
      secret:
        process.env.JWT_SECRET || 'junce-dev-secret-key-change-in-production',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [StaffAssignmentsController],
  providers: [StaffAssignmentsService],
})
export class StaffAssignmentsModule {}
