import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { ServiceTemplatesModule } from './service-templates/service-templates.module';
import { ServiceItemsModule } from './service-items/service-items.module';
import { StaffAssignmentsModule } from './staff-assignments/staff-assignments.module';
import { UsersModule } from './users/users.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';
import { ChargesModule } from './charges/charges.module';
import { TenantRegistersModule } from './tenant-registers/tenant-registers.module';
import { TasksModule } from './tasks/tasks.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CustomersModule,
    ServiceTemplatesModule,
    ServiceItemsModule,
    StaffAssignmentsModule,
    UsersModule,
    WorkOrdersModule,
    ChargesModule,
    TenantRegistersModule,
    TasksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
