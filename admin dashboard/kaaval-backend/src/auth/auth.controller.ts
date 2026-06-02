import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

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

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /** 5 attempts per minute per IP — brute-force protection */
  @Post('login')
  @Throttle({ login: { limit: 5, ttl: 60000 } })
  async login(@Body() body: LoginDto, @Request() req: any) {
    const ip = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(body.username, body.password, ip, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user);
  }
}
