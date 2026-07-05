import { Controller, Post, Body, Get, UseGuards, Request, Res } from '@nestjs/common';
import type { Response } from 'express';
import { IsString, MaxLength, MinLength, Matches } from 'class-validator';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { UsersService } from '../users/users.service.js';
import * as bcrypt from 'bcryptjs';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

class LoginDto {
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  username!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password!: string;
}

class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  @MaxLength(128)
  @Matches(/^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/, {
    message: 'Password must contain at least one number and one special character',
  })
  newPassword!: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('login')
  async login(@Body() body: LoginDto, @Request() req: any, @Res({ passthrough: true }) res: Response) {
    const ip = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.login(body.username, body.password, ip, userAgent);

    res.cookie('kaaval_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Body() body: ChangePasswordDto, @Request() req: any) {
    const userId = req.user.id;

    // Fetch user with password hash
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    // Verify current password
    const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!valid) {
      // Increment failed attempts for security audit trail
      await this.usersService.incrementFailedLogins(userId);
      throw new BadRequestException('Current password is incorrect');
    }

    // Prevent reusing same password
    const same = await bcrypt.compare(body.newPassword, user.passwordHash);
    if (same) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Hash and update
    const newHash = await bcrypt.hash(body.newPassword, 12);
    await this.usersService.setPasswordHash(userId, newHash);

    return { status: 'success', message: 'Password changed successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    await this.authService.logoutAll(req.user.id);
    res.clearCookie('kaaval_token');
    return { status: 'success', message: 'Logged out from all devices' };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('kaaval_token');
    return { status: 'success', message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user);
  }
}
