import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { JwtAuthGuard, RolesGuard, Roles, Role } from '../auth/index.js';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.TRAFFIC_ADMIN, Role.DEV_ADMIN)
  findAll(@Query('limit') limit?: number) {
    return this.notificationsService.findAll(limit ?? 20);
  }

  @Get('unread')
  @Roles(Role.SUPER_ADMIN, Role.TRAFFIC_ADMIN, Role.DEV_ADMIN)
  getUnreadCount() {
    return this.notificationsService.getUnreadCount();
  }

  @Post(':id/read')
  @Roles(Role.SUPER_ADMIN, Role.TRAFFIC_ADMIN, Role.DEV_ADMIN)
  markRead(@Param('id') id: string) {
    return this.notificationsService.markRead(id);
  }

  @Post('read-all')
  @Roles(Role.SUPER_ADMIN, Role.TRAFFIC_ADMIN, Role.DEV_ADMIN)
  markAllRead() {
    return this.notificationsService.markAllRead();
  }
}
