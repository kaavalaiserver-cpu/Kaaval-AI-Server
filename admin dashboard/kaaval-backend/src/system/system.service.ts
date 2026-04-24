import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { SystemLog } from './entities/system-log.entity.js';
import { Camera } from '../cameras/entities/camera.entity.js';

@Injectable()
export class SystemService {
  private readonly startTime = new Date();

  constructor(
    @InjectRepository(SystemLog)
    private readonly logRepo: Repository<SystemLog>,
    @InjectRepository(Camera)
    private readonly cameraRepo: Repository<Camera>,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
  ) {}

  async getAiStatus() {
    const aiUrl = process.env.AI_BACKEND_URL || 'http://127.0.0.1:8000';
    try {
      const res = await fetch(`${aiUrl}/status`);
      if (!res.ok) throw new Error('AI Backend unreachable');
      return await res.json();
    } catch (err) {
      Logger.error(`Failed to fetch AI status: ${err.message}`, 'SystemService');
      return []; // Return empty array if unreachable
    }
  }

  async getLogs(limit = 50, page = 1, level?: string) {
    const where: Record<string, unknown> = {};
    if (level) where['level'] = level;

    const [logs, total] = await this.logRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      data: logs.map((l) => ({
        id: l.id,
        timestamp: l.createdAt.toISOString(),
        level: l.level,
        source: l.module,
        message: l.message,
      })),
      total,
      page,
      limit,
    };
  }

  async addLog(level: string, module: string, message: string) {
    const log = this.logRepo.create({ level, module, message });
    return this.logRepo.save(log);
  }

  async getStatus() {
    const cameras = await this.cameraRepo.find();
    const activeCameras = cameras.filter((c) => c.status === 'online').length;
    const uptime = Math.floor(
      (Date.now() - this.startTime.getTime()) / 1000,
    );

    return {
      camerasOnline: activeCameras,
      camerasOffline: cameras.length - activeCameras,
      uptime: this.formatUptime(uptime),
      aiPipelineStatus: 'healthy',
    };
  }

  async getHealth() {
    return {
      status: 'healthy',
      database: 'ok',
      redis: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  private formatUptime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  }
}
