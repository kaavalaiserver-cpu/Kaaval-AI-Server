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

    // OTP for privileged roles (super admin + 3 named admins)
    const OTP_ROLES = ['SUPER_ADMIN', 'ADMIN_SAJIV', 'ADMIN_BINU', 'ADMIN_HARISH'];
    if (user.role?.roleCode && OTP_ROLES.includes(user.role.roleCode)) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await this.cache.set(`otp_${user.id}`, otp, 300000); // 5 minutes

      // Send OTP only to this user's own email
      const recipientEmail = user.email;
      if (recipientEmail) {
        try {
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: 'kaaval.ai.kanyakumari@gmail.com',
              pass: process.env.EMAIL_PASS || 'hqjmrekwvtowgfxu',
            },
          });
          await transporter.sendMail({
            from: '"Kaaval AI System" <kaaval.ai.kanyakumari@gmail.com>',
            to: recipientEmail,
            subject: 'Kaaval AI — Admin Login OTP',
            text: `Your Kaaval AI login OTP is: ${otp}. It is valid for 5 minutes. Do not share this with anyone.`,
            html: `<div style="font-family:Arial,sans-serif;max-width:400px;padding:24px;background:#0c1522;border-radius:12px;border:1px solid #1a2638">
              <h2 style="color:#60a5fa;margin:0 0 8px">Kaaval AI</h2>
              <p style="color:#8fa3c0;font-size:14px">Your admin login OTP is:</p>
              <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#f0f6ff;margin:16px 0;font-family:monospace">${otp}</div>
              <p style="color:#8fa3c0;font-size:12px">Valid for <strong>5 minutes</strong>. Do not share this with anyone.</p>
            </div>`,
          });
          console.log(`✅ Sent OTP to ${recipientEmail} for user ${user.username}`);
        } catch (err) {
          console.error('Failed to send OTP email', err);
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[DEV ONLY] OTP for ${user.username}: ${otp}`);
          }
        }
      } else {
        console.warn(`User ${user.username} has no email set — OTP not sent`);
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[DEV ONLY] OTP for ${user.username}: ${otp}`);
        }
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
      junction: user.junctionId ?? null,
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
        junction: user.junctionId ?? null,
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

  getProfile(user: { id: string; username: string; role: string; name: string; subdivision?: string | null; junction?: string | null; requiresPasswordChange?: boolean }) {
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      subdivision: user.subdivision ?? null,
      junction: user.junction ?? null,
      requiresPasswordChange: user.requiresPasswordChange ?? false,
    };
  }

  async logoutAll(userId: string) {
    await this.usersService.invalidateAllSessions(userId);
    await this.auditService.logAction(userId, 'LOGOUT_ALL_DEVICES');
  }
}
