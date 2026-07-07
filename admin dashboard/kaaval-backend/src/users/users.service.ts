import { Injectable, OnModuleInit, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';
import { LoginSession } from './entities/user-session.entity.js';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { AuditService } from '../system/audit.service.js';
import { Role } from '../auth/entities/role.entity.js';
import { District } from '../districts/entities/district.entity.js';
import { Subdivision } from '../subdivisions/entities/subdivision.entity.js';
import { Junction } from '../junctions/entities/junction.entity.js';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(LoginSession)
    private sessionsRepository: Repository<LoginSession>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(District)
    private districtsRepository: Repository<District>,
    @InjectRepository(Subdivision)
    private subdivisionsRepository: Repository<Subdivision>,
    @InjectRepository(Junction)
    private junctionsRepository: Repository<Junction>,
    @Inject(forwardRef(() => AuditService))
    private auditService: AuditService,
  ) {}

  async onModuleInit() {
    await this.seedSuperAdmin();
  }

  async seedSuperAdmin() {
    try {
      // 1. Seed Roles
      const roleCodes = [
        { code: 'SUPER_ADMIN', name: 'System Super Admin', level: 1 },
        { code: 'DEVELOPER', name: 'System Developer', level: 5 },
        { code: 'SP', name: 'Superintendent of Police', level: 10 },
        { code: 'DSP', name: 'Deputy SP', level: 20 },
        { code: 'INSPECTOR', name: 'Traffic Inspector', level: 30 },
        { code: 'SUB_INSPECTOR', name: 'Sub-Inspector', level: 40 },
        { code: 'OPERATOR', name: 'Control Room Operator', level: 50 },
      ];

      for (const rc of roleCodes) {
        let r = await this.rolesRepository.findOneBy({ roleCode: rc.code });
        if (!r) {
          await this.rolesRepository.save(
            this.rolesRepository.create({ roleCode: rc.code, displayName: rc.name, hierarchyLevel: rc.level, isSystemRole: true })
          );
        }
      }

      // 2. Seed District
      let kanyakumari = await this.districtsRepository.findOneBy({ districtName: 'Kanyakumari' });
      if (!kanyakumari) {
        kanyakumari = await this.districtsRepository.save(
          this.districtsRepository.create({ districtName: 'Kanyakumari', state: 'Tamil Nadu' })
        );
      }

      // 3. Seed Subdivision
      let nagercoil = await this.subdivisionsRepository.findOneBy({ subdivisionName: 'Nagercoil' });
      if (!nagercoil) {
        nagercoil = await this.subdivisionsRepository.save(
          this.subdivisionsRepository.create({ subdivisionName: 'Nagercoil', districtId: kanyakumari.id })
        );
      }

      // Fetch required roles for seeding
      const superAdminRole = await this.rolesRepository.findOneBy({ roleCode: 'SUPER_ADMIN' });
      const developerRole = await this.rolesRepository.findOneBy({ roleCode: 'DEVELOPER' });
      const spRole = await this.rolesRepository.findOneBy({ roleCode: 'SP' });
      const inspectorRole = await this.rolesRepository.findOneBy({ roleCode: 'INSPECTOR' });
      const operatorRole = await this.rolesRepository.findOneBy({ roleCode: 'OPERATOR' });

      const defaultPasswordHash = await bcrypt.hash('kaaval@123', 10);
      
      const seedUsers = [
        {
          username: 'superadmin',
          passwordHash: await bcrypt.hash('Kk@7200599700', 10),
          fullName: 'System Super Admin',
          roleId: superAdminRole?.id,
          requiresPasswordChange: true,
          isActive: true,
        },
        {
          username: 'developer',
          passwordHash: await bcrypt.hash('kaaval@123', 10),
          fullName: 'System Developer',
          roleId: developerRole?.id,
          requiresPasswordChange: false,
          isActive: true,
        },
        {
          username: 'sp_admin',
          passwordHash: defaultPasswordHash,
          fullName: 'Superintendent of Police',
          roleId: spRole?.id,
          districtId: kanyakumari.id,
          requiresPasswordChange: true,
          isActive: true,
        },
        {
          username: 'inspector_demo',
          passwordHash: defaultPasswordHash,
          fullName: 'Traffic Inspector',
          roleId: inspectorRole?.id,
          districtId: kanyakumari.id,
          subdivisionId: nagercoil.id,
          requiresPasswordChange: true,
          isActive: true,
        },
        {
          username: 'operator_demo',
          passwordHash: defaultPasswordHash,
          fullName: 'Control Room Operator',
          roleId: operatorRole?.id,
          districtId: kanyakumari.id,
          subdivisionId: nagercoil.id,
          requiresPasswordChange: true,
          isActive: true,
        }
      ];

      for (const user of seedUsers) {
        const existing = await this.usersRepository.findOneBy({ username: user.username });
        if (!existing) {
          await this.usersRepository.save(this.usersRepository.create(user));
        }
      }
      
      this.logger.log(`===================================================`);
      this.logger.log(`v2 MASTER DATA AND USERS SEEDED`);
      this.logger.log(`===================================================`);
    } catch (error) {
      this.logger.error('Error during seeding: ', error);
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username }, relations: ['role'] });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.usersRepository.update(id, { lastLogin: new Date() });
  }

  async createSession(userId: string, ipAddress?: string, browser?: string): Promise<LoginSession> {
    const session = this.sessionsRepository.create({
      userId,
      loginTime: new Date(),
      ipAddress: ipAddress ?? 'Unknown',
      browser: browser ?? 'Unknown',
    });
    return this.sessionsRepository.save(session);
  }

  async invalidateAllSessions(userId: string): Promise<void> {
    await this.sessionsRepository.update(
      { userId, logoutTime: null as any },
      { logoutTime: new Date() }
    );
  }

  async isSessionValid(sessionId: string): Promise<boolean> {
    const session = await this.sessionsRepository.findOneBy({ id: sessionId });
    return !!session && !session.logoutTime;
  }

  async findAll(): Promise<Omit<User, 'passwordHash'>[]> {
    const users = await this.usersRepository.find({
      order: { createdAt: 'DESC' },
      relations: ['role', 'subdivision', 'district', 'junction']
    });
    return users.map(user => this.stripPassword(user));
  }

  private async resolveRelations(data: any): Promise<any> {
    const resolved = { ...data };
    
    if (resolved.role) {
      const roleEntity = await this.rolesRepository.findOneBy({ roleCode: resolved.role.toUpperCase() });
      if (roleEntity) resolved.roleId = roleEntity.id;
      delete resolved.role;
    }
    
    if (resolved.subdivision) {
      const sub = await this.subdivisionsRepository.findOneBy({ subdivisionName: resolved.subdivision });
      if (sub) {
        resolved.subdivisionId = sub.id;
        resolved.districtId = sub.districtId;
      }
      delete resolved.subdivision;
    }
    
    if (resolved.junction) {
      const junc = await this.junctionsRepository.findOneBy({ junctionName: resolved.junction });
      if (junc) {
        resolved.junctionId = junc.id;
        resolved.subdivisionId = junc.subdivisionId;
        const sub = await this.subdivisionsRepository.findOneBy({ id: junc.subdivisionId });
        if (sub) resolved.districtId = sub.districtId;
      }
      delete resolved.junction;
    }
    
    if (resolved.district !== undefined) delete resolved.district;
    
    return resolved;
  }

  async createUser(data: any, adminId: string, ip?: string): Promise<{ user: any; temporaryPassword: string }> {
    const tempPassword = randomBytes(4).toString('hex') + '#A1';
    const hash = await bcrypt.hash(tempPassword, 10);

    const resolvedData = await this.resolveRelations(data);

    const user = this.usersRepository.create({
      ...resolvedData,
      passwordHash: hash,
      requiresPasswordChange: true,
      createdByUserId: adminId,
    });

    const savedResult: any = await this.usersRepository.save(user);
    const saved = Array.isArray(savedResult) ? savedResult[0] : savedResult;
    const withRole = await this.usersRepository.findOne({
      where: { id: saved.id },
      relations: ['role', 'subdivision', 'district', 'junction'],
    });

    await this.auditService.logAction(adminId, 'CREATE_USER', undefined, ip, {
      targetUsername: saved.username,
      role: data.role ?? resolvedData.roleId,
    });

    return { user: this.stripPassword(withRole!), temporaryPassword: tempPassword };
  }

  async updateUser(id: string, data: any, adminId: string, reason: string, ip?: string): Promise<Omit<User, 'passwordHash'> | null> {
    const resolvedData = await this.resolveRelations(data);
    
    await this.usersRepository.update(id, { ...resolvedData, updatedByUserId: adminId });
    const user = await this.usersRepository.findOne({ where: { id }, relations: ['role', 'subdivision', 'district', 'junction'] });
    if (user && data.role) {
      await this.auditService.logAction(adminId, 'ROLE_CHANGE', undefined, ip, { targetUsername: user.username, newRole: data.role, reason });
    }
    return user ? this.stripPassword(user) : null;
  }

  async updateStatus(id: string, isActive: boolean, adminId: string, reason: string, ip?: string): Promise<Omit<User, 'passwordHash'> | null> {
    await this.usersRepository.update(id, { isActive, updatedByUserId: adminId });
    const user = await this.usersRepository.findOne({ where: { id }, relations: ['role', 'subdivision', 'district', 'junction'] });
    if (user) {
      await this.auditService.logAction(adminId, isActive ? 'ACTIVATE_USER' : 'DISABLE_USER', undefined, ip, { targetUsername: user.username, reason });
    }
    return user ? this.stripPassword(user) : null;
  }

  async resetPassword(id: string, adminId: string, reason: string, ip?: string, customPassword?: string): Promise<string | null> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) return null;

    const passwordToUse = customPassword || (randomBytes(4).toString('hex') + '#R2');
    const hash = await bcrypt.hash(passwordToUse, 10);

    await this.usersRepository.update(id, { 
      passwordHash: hash, 
      requiresPasswordChange: true,
      updatedByUserId: adminId 
    });

    await this.auditService.logAction(adminId, 'RESET_PASSWORD', undefined, ip, { 
      targetUsername: user.username, 
      reason,
      customSet: !!customPassword
    });

    return passwordToUse;
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id }, relations: ['role'] });
  }

  async setPasswordHash(id: string, hash: string): Promise<void> {
    await this.usersRepository.update(id, {
      passwordHash: hash,
      requiresPasswordChange: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
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

  async deleteUser(id: string, adminId: string, ip?: string): Promise<boolean> {
    const user = await this.usersRepository.findOneBy({ id });
    if (user) {
      await this.usersRepository.delete(id);
      await this.auditService.logAction(adminId, 'DELETE_USER', undefined, ip, { targetUsername: user.username });
      return true;
    }
    return false;
  }

  private stripPassword(user: User): any {
    const { passwordHash, role, subdivision, district, junction, ...rest } = user;
    return {
      ...rest,
      // Flatten relational objects to plain values the frontend expects
      role: (role as any)?.roleCode ?? rest.roleId ?? null,
      subdivision: (subdivision as any)?.subdivisionName ?? null,
      district: (district as any)?.districtName ?? null,
      junction: (junction as any)?.junctionName ?? null,
    };
  }
}
