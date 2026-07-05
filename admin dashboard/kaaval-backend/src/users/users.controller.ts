import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/index.js';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getAllUsers() {
    return this.usersService.findAll();
  }

  @Post()
  async createUser(@Body() data: any, @Request() req: any) {
    if (!data.username || !data.fullName) {
      throw new BadRequestException('Username and full name are required');
    }
    const adminId = req.user.id;
    const ip = req.ip;
    return this.usersService.createUser(data, adminId, ip);
  }

  @Patch(':id')
  async updateUser(@Param('id') id: string, @Body() data: any, @Request() req: any) {
    if (data.role && !data.reason) {
      throw new BadRequestException('Reason is mandatory for role changes');
    }
    const adminId = req.user.id;
    const ip = req.ip;
    const reason = data.reason || 'General update';
    // Remove reason from data before passing to service
    const { reason: _, ...updateData } = data;
    return this.usersService.updateUser(id, updateData, adminId, reason, ip);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() data: any, @Request() req: any) {
    if (typeof data.isActive !== 'boolean' || !data.reason) {
      throw new BadRequestException('isActive boolean and reason are mandatory');
    }
    const adminId = req.user.id;
    const ip = req.ip;
    return this.usersService.updateStatus(id, data.isActive, adminId, data.reason, ip);
  }

  @Post(':id/reset-password')
  async resetPassword(@Param('id') id: string, @Body() data: any, @Request() req: any) {
    if (!data.reason) {
      throw new BadRequestException('Reason is mandatory for password reset');
    }
    const adminId = req.user.id;
    const ip = req.ip;
    const temporaryPassword = await this.usersService.resetPassword(id, adminId, data.reason, ip, data.customPassword);
    if (!temporaryPassword) {
      throw new BadRequestException('User not found');
    }
    return { temporaryPassword };
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string, @Request() req: any) {
    const adminId = req.user.id;
    const ip = req.ip;
    const success = await this.usersService.deleteUser(id, adminId, ip);
    if (!success) {
      throw new BadRequestException('User not found or could not be deleted');
    }
    return { status: 'deleted', id };
  }
}
