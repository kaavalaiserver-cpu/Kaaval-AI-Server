import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/index.js';
import { AuditLog } from '../system/entities/audit-log.entity.js';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  async getAuditLogs(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('action') action?: string,
    @Query('subdivision') subdivision?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('username') username?: string,
  ) {
    const take = Math.min(Number(limit) || 50, 200);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    // Build a rich JOIN query to get user info + subdivision info alongside every log entry
    let qb = this.auditRepo
      .createQueryBuilder('log')
      .leftJoin('users', 'u', 'u.id::text = log.user_id::text')
      .leftJoin('roles', 'r', 'r.id::text = u.role_id::text')
      .leftJoin('subdivisions', 's', 's.id::text = u.subdivision_id::text')
      .select([
        'log.id AS id',
        'log.action AS action',
        'log.module AS module',
        'log.entity AS entity',
        'log.entity_id AS entity_id',
        'log.ip_address AS ip_address',
        'log.new_data AS new_data',
        'log.created_at AS created_at',
        'u.username AS username',
        'u.full_name AS full_name',
        'r.role_code AS role_code',
        's.subdivision_name AS subdivision_name',
      ])
      .orderBy('log.created_at', 'DESC');

    if (action) {
      qb = qb.andWhere('log.action = :action', { action });
    }
    if (subdivision) {
      qb = qb.andWhere('LOWER(s.subdivision_name) = LOWER(:subdivision)', { subdivision });
    }
    if (username) {
      qb = qb.andWhere('LOWER(u.username) LIKE LOWER(:username)', { username: `%${username}%` });
    }
    if (dateFrom) {
      qb = qb.andWhere('log.created_at >= :dateFrom', { dateFrom: new Date(dateFrom) });
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      qb = qb.andWhere('log.created_at <= :dateTo', { dateTo: end });
    }

    const total = await qb.getCount();
    const rows = await qb.offset(skip).limit(take).getRawMany();

    return {
      data: rows,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / take),
    };
  }

  @Get('actions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  async getDistinctActions() {
    const rows = await this.auditRepo
      .createQueryBuilder('log')
      .select('DISTINCT log.action', 'action')
      .orderBy('log.action', 'ASC')
      .getRawMany();
    return rows.map((r) => r.action).filter(Boolean);
  }
}
