import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';

export type AuthUser = {
  sub: number;
  roleCode: string;
};

@Injectable()
export class PermissionService {
  isAdmin(user: AuthUser) {
    return user.roleCode === '管理员';
  }

  isSupervisor(user: AuthUser) {
    return user.roleCode === '主管';
  }

  isAdminOrSupervisor(user: AuthUser) {
    return this.isAdmin(user) || this.isSupervisor(user);
  }

  ensure(condition: boolean, message = '无权限访问该资源') {
    if (!condition) throw new ForbiddenException(message);
  }

  canCreateCustomer(user: AuthUser) {
    return user.roleCode === '商务' || this.isAdmin(user);
  }

  customerVisibleWhere(user: AuthUser): Prisma.CustomerWhereInput {
    if (this.isAdminOrSupervisor(user) || user.roleCode === '总务') return {};

    if (user.roleCode === '商务') {
      return { ownerId: user.sub };
    }

    if (user.roleCode === '业务') {
      return {
        OR: [
          { staffAssignment: { is: { businessStaffId: user.sub } } },
          { workOrders: { some: { handlerId: user.sub } } },
        ],
      };
    }

    if (user.roleCode === '会计') {
      return {
        OR: [
          { staffAssignment: { is: { accountantId: user.sub } } },
          { tenantRegister: { is: { assignedAccountantId: user.sub } } },
          { tasks: { some: { toUserId: user.sub } } },
        ],
      };
    }

    return { id: -1 };
  }

  canReadCustomer(user: AuthUser, customer: { ownerId: number; staffAssignment?: any; tenantRegister?: any }) {
    if (this.isAdminOrSupervisor(user) || user.roleCode === '总务') return true;
    if (user.roleCode === '商务') return customer.ownerId === user.sub;
    if (user.roleCode === '业务') return customer.staffAssignment?.businessStaffId === user.sub;
    if (user.roleCode === '会计') {
      return (
        customer.staffAssignment?.accountantId === user.sub ||
        customer.tenantRegister?.assignedAccountantId === user.sub
      );
    }
    return false;
  }

  canUpdateCustomer(user: AuthUser, customer: { ownerId: number }) {
    return this.isAdmin(user) || (user.roleCode === '商务' && customer.ownerId === user.sub);
  }

  canConfigureStaff(user: AuthUser, customer: { ownerId: number }) {
    return this.isAdminOrSupervisor(user) || (user.roleCode === '商务' && customer.ownerId === user.sub);
  }

  canCreateServiceItem(user: AuthUser, customer: { ownerId: number }) {
    return this.isAdmin(user) || (user.roleCode === '商务' && customer.ownerId === user.sub);
  }

  canUpdateServiceStatus(user: AuthUser, item: { customer?: any; workOrder?: any }) {
    if (this.isAdminOrSupervisor(user)) return true;
    if (user.roleCode !== '业务') return false;
    return (
      item.workOrder?.handlerId === user.sub ||
      item.customer?.staffAssignment?.businessStaffId === user.sub
    );
  }

  workOrderVisibleWhere(user: AuthUser): Prisma.WorkOrderWhereInput {
    if (this.isAdminOrSupervisor(user)) return {};
    if (user.roleCode === '商务') return { customer: { ownerId: user.sub } };
    if (user.roleCode === '业务') {
      return {
        OR: [
          { handlerId: user.sub },
          { customer: { staffAssignment: { is: { businessStaffId: user.sub } } } },
        ],
      };
    }
    if (user.roleCode === '会计') {
      return {
        OR: [
          { customer: { staffAssignment: { is: { accountantId: user.sub } } } },
          { customer: { tenantRegister: { is: { assignedAccountantId: user.sub } } } },
        ],
      };
    }
    return { id: -1 };
  }

  canReadWorkOrder(user: AuthUser, order: { handlerId?: number | null; customer?: any }) {
    if (this.isAdminOrSupervisor(user)) return true;
    if (user.roleCode === '商务') return order.customer?.ownerId === user.sub;
    if (user.roleCode === '业务') {
      return order.handlerId === user.sub || order.customer?.staffAssignment?.businessStaffId === user.sub;
    }
    if (user.roleCode === '会计') {
      return (
        order.customer?.staffAssignment?.accountantId === user.sub ||
        order.customer?.tenantRegister?.assignedAccountantId === user.sub
      );
    }
    return false;
  }

  canOperateWorkOrder(user: AuthUser, order: { handlerId?: number | null }) {
    return this.isAdminOrSupervisor(user) || (user.roleCode === '业务' && order.handlerId === user.sub);
  }

  chargeVisibleWhere(user: AuthUser): Prisma.ChargeWhereInput {
    if (this.isAdminOrSupervisor(user) || user.roleCode === '总务') return {};
    if (user.roleCode === '商务') return { customer: { ownerId: user.sub } };
    return { id: -1 };
  }

  canReadCharge(user: AuthUser, charge: { customer?: any }) {
    if (this.isAdminOrSupervisor(user) || user.roleCode === '总务') return true;
    return user.roleCode === '商务' && charge.customer?.ownerId === user.sub;
  }

  canCreateCharge(user: AuthUser, customer: { ownerId: number }) {
    if (this.isAdmin(user) || user.roleCode === '总务') return true;
    return user.roleCode === '商务' && customer.ownerId === user.sub;
  }

  taskVisibleWhere(user: AuthUser): Prisma.TaskWhereInput {
    if (this.isAdminOrSupervisor(user)) return {};
    return {
      OR: [
        { fromUserId: user.sub },
        { toUserId: user.sub },
        { confirmedById: user.sub },
        { completedById: user.sub },
      ],
    };
  }

  canReadTask(user: AuthUser, task: any) {
    if (this.isAdminOrSupervisor(user)) return true;
    return [task.fromUserId, task.toUserId, task.confirmedById, task.completedById].includes(user.sub);
  }

  tenantVisibleWhere(user: AuthUser): Prisma.TenantRegisterWhereInput {
    if (this.isAdminOrSupervisor(user)) return {};
    if (user.roleCode === '商务') return { customer: { ownerId: user.sub } };
    if (user.roleCode === '会计') return { assignedAccountantId: user.sub };
    return { id: -1 };
  }

  canReadTenant(user: AuthUser, tenant: { assignedAccountantId?: number | null; customer?: any }) {
    if (this.isAdminOrSupervisor(user)) return true;
    if (user.roleCode === '商务') return tenant.customer?.ownerId === user.sub;
    if (user.roleCode === '会计') return tenant.assignedAccountantId === user.sub;
    return false;
  }

  canUpdateTenant(user: AuthUser, tenant: { assignedAccountantId?: number | null }) {
    return this.isAdminOrSupervisor(user) || (user.roleCode === '会计' && tenant.assignedAccountantId === user.sub);
  }

  canConfirmTenantPlan(user: AuthUser, tenant: { customer?: any }) {
    return this.isAdmin(user) || (user.roleCode === '商务' && tenant.customer?.ownerId === user.sub);
  }
}
