import { Injectable, OnModuleInit, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';
import { UserSession } from './entities/user-session.entity.js';
import * as bcrypt from 'bcryptjs';
import { Role } from '../auth/roles.enum.js';
import { randomBytes } from 'crypto';
import { AuditService } from '../system/audit.service.js';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserSession)
    private sessionsRepository: Repository<UserSession>,
    @Inject(forwardRef(() => AuditService))
    private auditService: AuditService,
  ) {}

  async onModuleInit() {
    await this.seedSuperAdmin();
  }

  async seedSuperAdmin() {
    const count = await this.usersRepository.count();
    if (count === 0) {
      // Create users with known passwords for pilot/demo
      const defaultPasswordHash = await bcrypt.hash('kaaval@123', 10);
      
      const seedUsers = [
        {
          username: 'superadmin',
          passwordHash: await bcrypt.hash('superadmin@123', 10),
          fullName: 'System Super Admin',
          role: Role.SUPER_ADMIN,
          requiresPasswordChange: true,
          isActive: true,
        },
        {
          username: 'sp_admin',
          passwordHash: defaultPasswordHash,
          fullName: 'Superintendent of Police',
          role: Role.SP,
          requiresPasswordChange: true,
          isActive: true,
        },
        {
          username: 'nagercoil_admin',
          passwordHash: await bcrypt.hash('96007', 10),
          fullName: 'Nagercoil Sub-Admin',
          role: Role.NAGERCOIL_ADMIN,
          requiresPasswordChange: true,
          isActive: true,
        },
        {
          username: 'inspector_demo',
          passwordHash: defaultPasswordHash,
          fullName: 'Traffic Inspector',
          role: Role.INSPECTOR,
          subdivision: 'Nagercoil',
          requiresPasswordChange: true,
          isActive: true,
        },
        {
          username: 'operator_demo',
          passwordHash: defaultPasswordHash,
          fullName: 'Control Room Operator',
          role: Role.OPERATOR,
          subdivision: 'Nagercoil',
          requiresPasswordChange: true,
          isActive: true,
        },
        {
          username: 'developer',
          passwordHash: defaultPasswordHash,
          fullName: 'AI Developer',
          role: Role.DEVELOPER,
          requiresPasswordChange: true,
          isActive: true,
        }
      ];

      for (const user of seedUsers) {
        await this.usersRepository.save(this.usersRepository.create(user));
      }
      
      this.logger.log(`===================================================`);
      this.logger.log(`DEFAULT USERS SEEDED FOR DEPLOYMENT`);
      this.logger.log(`===================================================`);
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ username });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.usersRepository.update(id, { lastLogin: new Date() });
  }

  async createSession(userId: string, ipAddress?: string, deviceInfo?: string): Promise<UserSession> {
    const session = this.sessionsRepository.create({
      userId,
      loginTime: new Date(),
      ipAddress,
      deviceInfo,
    });
    return this.sessionsRepository.save(session);
  }

  async findAll(): Promise<Omit<User, 'passwordHash'>[]> {
    const users = await this.usersRepository.find({
      order: { createdAt: 'DESC' }
    });
    return users.map(user => this.stripPassword(user));
  }

  async createUser(data: Partial<User>, adminId: string, ip?: string): Promise<{ user: Omit<User, 'passwordHash'>, temporaryPassword: string }> {
    const tempPassword = randomBytes(4).toString('hex') + '#A1'; // e.g. "a1b2c3d4#A1"
    const hash = await bcrypt.hash(tempPassword, 10);
    
    const user = this.usersRepository.create({
      ...data,
      passwordHash: hash,
      requiresPasswordChange: true,
      createdBy: adminId,
    });
    
    const saved = await this.usersRepository.save(user);
    
    await this.auditService.logAction(adminId, 'CREATE_USER', undefined, ip, {
      targetUsername: saved.username,
      role: saved.role,
    });

    return { user: this.stripPassword(saved), temporaryPassword: tempPassword };
  }

  async updateUser(id: string, data: Partial<User>, adminId: string, reason: string, ip?: string): Promise<Omit<User, 'passwordHash'> | null> {
    await this.usersRepository.update(id, { ...data, updatedBy: adminId });
    const user = await this.usersRepository.findOneBy({ id });
    if (user && data.role) {
      await this.auditService.logAction(adminId, 'ROLE_CHANGE', undefined, ip, { targetUsername: user.username, newRole: data.role, reason });
    }
    return user ? this.stripPassword(user) : null;
  }

  async updateStatus(id: string, isActive: boolean, adminId: string, reason: string, ip?: string): Promise<Omit<User, 'passwordHash'> | null> {
    await this.usersRepository.update(id, { isActive, updatedBy: adminId });
    const user = await this.usersRepository.findOneBy({ id });
    if (user) {
      await this.auditService.logAction(adminId, isActive ? 'ACTIVATE_USER' : 'DISABLE_USER', undefined, ip, { targetUsername: user.username, reason });
    }
    return user ? this.stripPassword(user) : null;
  }

  async resetPassword(id: string, adminId: string, reason: string, ip?: string): Promise<string | null> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) return null;

    const tempPassword = randomBytes(4).toString('hex') + '#R2';
    const hash = await bcrypt.hash(tempPassword, 10);

    await this.usersRepository.update(id, { 
      passwordHash: hash, 
      requiresPasswordChange: true,
      updatedBy: adminId 
    });

    await this.auditService.logAction(adminId, 'RESET_PASSWORD', undefined, ip, { targetUsername: user.username, reason });

    return tempPassword;
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

  async incrementFailedLogins(id: string): Promise<void> {
    const user = await this.usersRepository.findOneBy({ id });
    if (user) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 30 * 60000); // lock for 30 mins
      }
      await this.usersRepository.save(user);
    }
  }

  async resetFailedLogins(id: string): Promise<void> {
    await this.usersRepository.update(id, { failedLoginAttempts: 0, lockedUntil: null });
  }

  private stripPassword(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
