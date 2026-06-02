import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from './roles.enum.js';
import { UsersService } from '../users/users.service.js';
import { AuditService } from '../system/audit.service.js';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private auditService: AuditService
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

    // Update login tracking
    await this.usersService.updateLastLogin(user.id);
    await this.usersService.createSession(user.id, ipAddress, deviceInfo);
    
    // Audit log
    await this.auditService.logAction(user.id, 'LOGIN', undefined, ipAddress, { deviceInfo });

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      name: user.fullName,
      subdivision: user.subdivision ?? null,
      requiresPasswordChange: user.requiresPasswordChange,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        name: user.fullName,
        role: user.role,
        subdivision: user.subdivision ?? null,
        requiresPasswordChange: user.requiresPasswordChange,
      },
    };
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
}
