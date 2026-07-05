import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
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
import { DashboardModule } from './dashboard/dashboard.module';
import { FilesModule } from './files/files.module';
import { FissionLeadsModule } from './fission-leads/fission-leads.module';
import { ManualDashboardModule } from './manual-dashboard/manual-dashboard.module';
import { PermissionsModule } from './permissions/permissions.module';
import { WorkbenchModule } from './workbench/workbench.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
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
    DashboardModule,
    FilesModule,
    FissionLeadsModule,
    ManualDashboardModule,
    PermissionsModule,
    WorkbenchModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
