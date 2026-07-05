import {
  Controller,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(@Request() req: any) {
    return this.notificationsService.findAll(req.user.sub);
  }

  @Get('unread-count')
  async unreadCount(@Request() req: any) {
    const count = await this.notificationsService.countUnread(req.user.sub);
    return { count };
  }

  @Patch(':id/read')
  async markRead(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    await this.notificationsService.markRead(id, req.user.sub);
    return { ok: true };
  }

  @Patch('read-all')
  async markAllRead(@Request() req: any) {
    await this.notificationsService.markAllRead(req.user.sub);
    return { ok: true };
  }
}
