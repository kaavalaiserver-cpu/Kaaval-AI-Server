import { Controller, Get, Post, Param, Query, Body, Request, UseGuards, BadRequestException } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/index.js';

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

  /** Manual broadcast — available to super_admin, developer, sp, dsp */
  @Post('broadcast')
  @Roles('SUPER_ADMIN', 'DEVELOPER', 'SP', 'DSP')
  async broadcast(@Body() body: any, @Request() req: any) {
    const { title, message, priority } = body;
    if (!title || !message) {
      throw new BadRequestException('title and message are required');
    }
    const sentBy = req.user?.username ?? req.user?.role ?? 'Admin';
    return this.notificationsService.broadcast(
      title,
      message,
      priority ?? 'normal',
      sentBy,
    );
  }
}
