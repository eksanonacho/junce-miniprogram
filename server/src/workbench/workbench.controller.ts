import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../permissions/permissions.service';
import { WorkbenchService } from './workbench.service';

@Controller('workbench')
@UseGuards(JwtAuthGuard)
export class WorkbenchController {
  constructor(private readonly workbenchService: WorkbenchService) {}

  @Get('todos')
  async todos(@Request() req: any) {
    return this.workbenchService.getTodos(req.user as AuthUser);
  }
}
