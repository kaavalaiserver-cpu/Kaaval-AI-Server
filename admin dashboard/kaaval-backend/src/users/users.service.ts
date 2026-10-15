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
        { code: 'NAGERCOIL_ADMIN', name: 'Nagercoil Sub-Admin', level: 25 },
        { code: 'THUCKALAY_ADMIN', name: 'Thuckalay Sub-Admin', level: 25 },
        { code: 'COLACHEL_ADMIN', name: 'Colachel Sub-Admin', level: 25 },
        { code: 'KANYAKUMARI_ADMIN', name: 'Kanyakumari Sub-Admin', level: 25 },
        { code: 'MARTHANDAM_ADMIN', name: 'Marthandam Sub-Admin', level: 25 },
        { code: 'ADMIN_SAJIV', name: 'Admin Sajiv', level: 2 },
        { code: 'ADMIN_BINU', name: 'Admin Binu', level: 2 },
        { code: 'ADMIN_HARISH', name: 'Admin Harish', level: 2 },
      ];

      for (const rc of roleCodes) {
        let r = await this.rolesRepository.findOneBy({ roleCode: rc.code });
        if (!r) {
          await this.rolesRepository.save(
            this.rolesRepository.create({ roleCode: rc.code, displayName: rc.name, hierarchyLevel: rc.level, isSystemRole: true })
          );
        }
      }

      // Sync any custom subdivision admin roles
      await this.syncSubdivisionRoles();

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

      const adminSajivRole = await this.rolesRepository.findOneBy({ roleCode: 'ADMIN_SAJIV' });
      const adminBinuRole  = await this.rolesRepository.findOneBy({ roleCode: 'ADMIN_BINU' });
      const adminHarishRole = await this.rolesRepository.findOneBy({ roleCode: 'ADMIN_HARISH' });

      const seedUsers = [
        {
          username: 'superadmin',
          passwordHash: await bcrypt.hash('Sj@25802580', 10),
          fullName: 'System Super Admin',
          email: 'sajiv2580@gmail.com',
          roleId: superAdminRole?.id,
          requiresPasswordChange: false,
          isActive: true,
        },
        {
          username: 'developer',
          passwordHash: await bcrypt.hash('kaaval@123', 10),
          fullName: 'System Developer',
          email: null,
          roleId: developerRole?.id,
          requiresPasswordChange: false,
          isActive: true,
        },
        {
          username: 'admin_sajiv',
          passwordHash: await bcrypt.hash('SJ@25802580', 10),
          fullName: 'Sajiv (Admin)',
          email: 'sajiv2580@gmail.com',
          roleId: adminSajivRole?.id,
          requiresPasswordChange: false,
          isActive: true,
        },
        {
          username: 'admin_binu',
          passwordHash: await bcrypt.hash('Binu@9443483062', 10),
          fullName: 'Binu (Admin)',
          email: 'binu.ji@gmail.com',
          roleId: adminBinuRole?.id,
          requiresPasswordChange: false,
          isActive: true,
        },
        {
          username: 'admin_harish',
          passwordHash: await bcrypt.hash('Harish@4499', 10),
          fullName: 'Harish (Admin)',
          email: 'harish250510@gmail.com',
          roleId: adminHarishRole?.id,
          requiresPasswordChange: false,
          isActive: true,
        },
      ];

      for (const user of seedUsers) {
        const existing = await this.usersRepository.findOneBy({ username: user.username });
        if (existing) {
          // Always update password and email for seed users to ensure they stay current
          existing.passwordHash = user.passwordHash;
          if (user.email) existing.email = user.email;
          if (user.roleId) existing.roleId = user.roleId;
          await this.usersRepository.save(existing);
        } else {
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

  async invalidateSession(sessionId: string): Promise<void> {
    await this.sessionsRepository.update(sessionId, { logoutTime: new Date() });
  }

  async invalidateAllSessions(userId: string): Promise<void> {
    await this.sessionsRepository
      .createQueryBuilder()
      .update(LoginSession)
      .set({ logoutTime: new Date() })
      .where('user_id = :userId AND logout_time IS NULL', { userId })
      .execute();
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

  async syncSubdivisionRoles() {
    try {
      const subdivisions = await this.subdivisionsRepository.find();
      for (const sub of subdivisions) {
        const cleanName = sub.subdivisionName.trim();
        const baseCode = cleanName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
        const roleCode = `${baseCode}_ADMIN`;
        const displayName = `${cleanName} Admin`;

        const existing = await this.rolesRepository.findOne({
          where: { roleCode }
        });
        if (!existing) {
          await this.rolesRepository.save(
            this.rolesRepository.create({
              roleCode,
              displayName,
              hierarchyLevel: 25,
              description: `Administrator for ${cleanName} subdivision`,
              isSystemRole: false
            })
          );
          this.logger.log(`Created automatic subdivision role: ${roleCode}`);
        }
      }
    } catch (err: any) {
      this.logger.error(`Error syncing subdivision roles: ${err.message}`);
    }
  }

  async getRoles() {
    await this.syncSubdivisionRoles();
    return this.rolesRepository.find({
      order: { hierarchyLevel: 'ASC', roleCode: 'ASC' }
    });
  }

  private async resolveRelations(data: any): Promise<any> {
    const resolved = { ...data };
    
    if (resolved.role) {
      const roleStr = String(resolved.role).toUpperCase();
      let roleEntity = await this.rolesRepository.findOneBy({ roleCode: roleStr });
      if (!roleEntity) {
        roleEntity = await this.rolesRepository
          .createQueryBuilder('r')
          .where('UPPER(r.role_code) = :rc', { rc: roleStr })
          .getOne();
      }
      if (roleEntity) {
        resolved.roleId = roleEntity.id;
        // Auto-link subdivision if selecting a subdivision admin role and subdivision is not explicitly specified
        if (!resolved.subdivision && !resolved.subdivisionId && roleStr.endsWith('_ADMIN') && roleStr !== 'SUPER_ADMIN') {
          const subNameGuess = roleStr.replace(/_ADMIN$/, '');
          const matchedSub = await this.subdivisionsRepository
            .createQueryBuilder('s')
            .where('REPLACE(UPPER(s.subdivision_name), \' \', \'_\') = :sn', { sn: subNameGuess })
            .orWhere('UPPER(s.subdivision_name) = :sn2', { sn2: subNameGuess })
            .orWhere('LOWER(s.subdivision_name) ILIKE :sn3', { sn3: `%${subNameGuess.replace(/_/g, '%')}%` })
            .getOne();
          if (matchedSub) {
            resolved.subdivisionId = matchedSub.id;
            resolved.districtId = matchedSub.districtId;
          }
        }
      }
      delete resolved.role;
    }
    
    if (resolved.subdivision) {
      let sub = await this.subdivisionsRepository.findOneBy({ id: resolved.subdivision });
      if (!sub) {
        sub = await this.subdivisionsRepository.findOneBy({ subdivisionName: resolved.subdivision });
      }
      if (!sub) {
        sub = await this.subdivisionsRepository
          .createQueryBuilder('s')
          .where('LOWER(s.subdivision_name) = LOWER(:name)', { name: resolved.subdivision })
          .getOne();
      }
      if (sub) {
        resolved.subdivisionId = sub.id;
        resolved.districtId = sub.districtId;
      }
      delete resolved.subdivision;
    }
    
    if (resolved.junction) {
      let junc = await this.junctionsRepository.findOneBy({ id: resolved.junction });
      if (!junc) {
        junc = await this.junctionsRepository.findOneBy({ junctionName: resolved.junction });
      }
      if (!junc) {
        junc = await this.junctionsRepository
          .createQueryBuilder('j')
          .where('LOWER(j.junction_name) = LOWER(:name)', { name: resolved.junction })
          .getOne();
      }
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

  async createUser(data: any, adminId: string, ip?: string): Promise<{ user: any; temporaryPassword?: string }> {
    const isCustom = !!data.password;
    const pwd = isCustom ? data.password : (randomBytes(4).toString('hex') + '#A1');
    const hash = await bcrypt.hash(pwd, 10);

    const resolvedData = await this.resolveRelations(data);
    delete resolvedData.password;

    const user = this.usersRepository.create({
      ...resolvedData,
      passwordHash: hash,
      requiresPasswordChange: !isCustom,
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

    return { user: this.stripPassword(withRole!), temporaryPassword: isCustom ? undefined : pwd };
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
