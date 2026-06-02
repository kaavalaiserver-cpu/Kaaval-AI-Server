import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { JwtAuthGuard, RolesGuard, Roles, Role } from '../auth/index.js';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Query('limit') limit?: number) {
    return this.notificationsService.findAll(limit ?? 20);
  }

  @Get('unread')
  getUnreadCount() {
    return this.notificationsService.getUnreadCount();
  }

  @Post(':id/read')
  markRead(@Param('id') id: string) {
    return this.notificationsService.markRead(id);
  }

  @Post('read-all')
  markAllRead() {
    return this.notificationsService.markAllRead();
  }
}
