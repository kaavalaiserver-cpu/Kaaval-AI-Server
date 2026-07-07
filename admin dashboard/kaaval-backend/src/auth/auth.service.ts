import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service.js';
import { AuditService } from '../system/audit.service.js';
import * as bcrypt from 'bcryptjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private auditService: AuditService,
    @Inject(CACHE_MANAGER) private cache: Cache
  ) {}

  async login(username: string, password: string, ipAddress?: string, deviceInfo?: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account is locked due to too many failed login attempts. Try again later.');
    }
    
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      await this.usersService.incrementFailedLogins(user.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed logins on success
    await this.usersService.resetFailedLogins(user.id);

    // OTP for Superadmin
    if (user.role?.roleCode === 'SUPER_ADMIN') {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await this.cache.set(`otp_${user.id}`, otp, 300000); // 5 minutes

      // Send OTP via email
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'kaaval.ai.kanyakumari@gmail.com',
            pass: process.env.EMAIL_PASS || 'default_pass_needs_update', // Replace with real App Password in production .env
          },
        });
        await transporter.sendMail({
          from: '"Kaaval AI System" <kaaval.ai.kanyakumari@gmail.com>',
          to: 'kaaval.ai.kanyakumari@gmail.com',
          subject: 'Kaaval AI - Superadmin Login OTP',
          text: `Your Kaaval AI Superadmin login OTP is: ${otp}. It is valid for 5 minutes. Do not share this with anyone.`,
        });
        console.log(`✅ Sent OTP ${otp} to kaaval.ai.kanyakumari@gmail.com`);
      } catch (err) {
        console.error('Failed to send OTP email', err);
        // Fallback log for development
        console.log(`[DEV ONLY] OTP is ${otp}`);
      }

      const tempToken = this.jwtService.sign({ sub: user.id, temp: true }, { expiresIn: '5m' });
      return { requiresOtp: true, tempToken };
    }

    return this.generateTokensAndSession(user, ipAddress, deviceInfo);
  }

  private async generateTokensAndSession(user: any, ipAddress?: string, deviceInfo?: string) {
    // Update login tracking
    await this.usersService.updateLastLogin(user.id);
    const session = await this.usersService.createSession(user.id, ipAddress, deviceInfo);
    
    // Audit log
    await this.auditService.logAction(user.id, 'LOGIN', undefined, ipAddress, { deviceInfo, sessionId: session.id });

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role?.roleCode ?? 'GUEST',
      name: user.fullName,
      subdivision: user.subdivisionId ?? null,
      requiresPasswordChange: user.requiresPasswordChange,
      sessionId: session.id,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        name: user.fullName,
        role: user.role?.roleCode ?? 'GUEST',
        subdivision: user.subdivisionId ?? null,
        requiresPasswordChange: user.requiresPasswordChange,
      },
    };
  }

  async verifyOtp(tempToken: string, otp: string, ipAddress?: string, deviceInfo?: string) {
    try {
      const payload = this.jwtService.verify(tempToken);
      if (!payload.temp) throw new UnauthorizedException('Invalid token type');

      const savedOtp = await this.cache.get(`otp_${payload.sub}`);
      if (!savedOtp || savedOtp !== otp) {
        throw new UnauthorizedException('Invalid or expired OTP');
      }

      await this.cache.del(`otp_${payload.sub}`);
      
      const user = await this.usersService.findById(payload.sub);
      if (!user) throw new UnauthorizedException('User not found');
      
      return this.generateTokensAndSession(user, ipAddress, deviceInfo);
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid or expired OTP token');
    }
  }

  getProfile(user: { id: string; username: string; role: string; name: string; subdivision?: string | null; requiresPasswordChange?: boolean }) {
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      subdivision: user.subdivision ?? null,
      requiresPasswordChange: user.requiresPasswordChange ?? false,
    };
  }

  async logoutAll(userId: string) {
    await this.usersService.invalidateAllSessions(userId);
    await this.auditService.logAction(userId, 'LOGOUT_ALL_DEVICES');
  }
}
