import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Notification } from './entities/notification.entity.js';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
  ) {}

  async findAll(limit = 20) {
    return this.notifRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getUnreadCount() {
    const count = await this.notifRepo.count({ where: { read: false } });
    return { unread: count };
  }

  async create(
    type: string,
    message: string,
    data?: Record<string, unknown>,
    options?: { title?: string; priority?: string; sentBy?: string },
  ) {
    const notif = this.notifRepo.create({
      type,
      message,
      data: data ?? null,
      title: options?.title ?? null,
      priority: options?.priority ?? 'normal',
      sentBy: options?.sentBy ?? null,
    });
    return this.notifRepo.save(notif);
  }

  async broadcast(
    title: string,
    message: string,
    priority: 'normal' | 'high' | 'urgent',
    sentBy: string,
  ) {
    return this.create('broadcast', message, undefined, {
      title,
      priority,
      sentBy,
    });
  }

  async markRead(id: string) {
    await this.notifRepo.update(id, { read: true });
    return { status: 'ok' };
  }

  async markAllRead() {
    await this.notifRepo.update({ read: false }, { read: true });
    return { status: 'ok' };
  }

  /** Collect today's violation stats and emit as a digest notification */
  async createDailyDigest(stats: {
    total: number;
    verified: number;
    rejected: number;
    pending: number;
    bySubdivision?: Record<string, number>;
  }) {
    const parts = [
      `📊 Daily Report — ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      `Total: ${stats.total} | Approved: ${stats.verified} | Rejected: ${stats.rejected} | Pending: ${stats.pending}`,
    ];
    if (stats.bySubdivision && Object.keys(stats.bySubdivision).length) {
      const sub = Object.entries(stats.bySubdivision)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      parts.push(`Subdivisions — ${sub}`);
    }
    return this.create('daily_digest', parts.join('\n'), { stats }, {
      title: 'Daily Violation Digest',
      priority: 'normal',
      sentBy: 'System',
    });
  }

  /** Get violations from today for digest generation (used by ReportsService) */
  async getRecentForDigest(sinceHours = 24): Promise<Notification[]> {
    const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
    return this.notifRepo.find({
      where: { createdAt: MoreThanOrEqual(since) },
      order: { createdAt: 'DESC' },
    });
  }
}
