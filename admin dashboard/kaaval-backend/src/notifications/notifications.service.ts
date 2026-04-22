import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async create(type: string, message: string, data?: Record<string, unknown>) {
    const notif = this.notifRepo.create({ type, message, data: data ?? null });
    return this.notifRepo.save(notif);
  }

  async markRead(id: string) {
    await this.notifRepo.update(id, { read: true });
    return { status: 'ok' };
  }

  async markAllRead() {
    await this.notifRepo.update({ read: false }, { read: true });
    return { status: 'ok' };
  }
}
