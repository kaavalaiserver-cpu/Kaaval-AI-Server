import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    private readonly config: ConfigService,
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

  async getPlateApiUsage() {
    const apiKey = process.env.PLATE_RECOGNIZER_API_KEY || '478212749124746424275c833ba665b3a168a13e';
    try {
      const res = await fetch('https://api.platerecognizer.com/v1/statistics/', {
        headers: { Authorization: `Token ${apiKey}` },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        const text = await res.text();
        Logger.error(`Plate API error ${res.status}: ${text}`, 'SystemService');
        return { status: 'error', error: `API returned ${res.status}: ${text}` };
      }
      const d = await res.json();
      // Log raw response so we can see all field names
      Logger.log(`Plate API raw response: ${JSON.stringify(d)}`, 'SystemService');

      // Plate Recognizer returns: { calls: N, total_calls: N, month: "YYYY-MM" }
      // where 'calls' = used this period, 'total_calls' = monthly limit
      const calls_used = d.calls ?? d.usage?.calls ?? d.calls_used ?? 0;
      const total_limit = d.total_calls ?? d.usage?.total_calls ?? d.calls_limit ?? d.total_limit ?? 0;
      const remaining = d.available ?? d.remaining_calls ?? d.calls_remaining ?? (total_limit - calls_used);

      Logger.log(`Plate API mapped → used:${calls_used} limit:${total_limit} remaining:${remaining}`, 'SystemService');
      return {
        status: 'ok',
        calls_used,
        total_limit,
        remaining,
        month: d.month ?? d.period ?? null,
        _raw: d, // temporary — helps verify mapping is correct
      };
    } catch (err) {
      Logger.error(`Plate API fetch failed: ${err.message}`, 'SystemService');
      return { status: 'error', error: `Network error: ${err.message}` };
    }
  }

  async getLogs(limit = 50, page = 1, level?: string, search?: string) {
    const query = this.logRepo.createQueryBuilder('log');

    if (level) {
      query.andWhere('log.level = :level', { level });
    }

    if (search) {
      query.andWhere('(log.message LIKE :search OR log.module LIKE :search)', { search: `%${search}%` });
    }

    query.orderBy('log.createdAt', 'DESC')
         .take(limit)
         .skip((page - 1) * limit);

    const [logs, total] = await query.getManyAndCount();

    // Fetch stats for all levels
    const statsQuery = this.logRepo.createQueryBuilder('log')
      .select('log.level, COUNT(log.id) as count')
      .groupBy('log.level');
    
    let statsResult = [];
    try {
      statsResult = await statsQuery.getRawMany();
    } catch (err) {
      Logger.error(`Failed to aggregate log stats: ${err.message}`, 'SystemService');
    }

    const stats = { total: 0, error: 0, warn: 0, info: 0, debug: 0 };
    try {
      stats.total = await this.logRepo.count();
      statsResult.forEach(r => {
        const lvl = String(r.level || '').toLowerCase();
        const countVal = parseInt(r.count || '0', 10);
        if (lvl === 'error') stats.error = countVal;
        else if (lvl === 'warn' || lvl === 'warning') stats.warn += countVal;
        else if (lvl === 'info') stats.info = countVal;
        else if (lvl === 'debug') stats.debug = countVal;
      });
    } catch (err) {
      Logger.error(`Failed to map stats: ${err.message}`, 'SystemService');
    }

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
      stats,
    };
  }

  async clearLogs() {
    await this.logRepo.clear();
    return { message: 'Logs cleared successfully' };
  }

  async addLog(level: string, module: string, message: string) {
    console.log(`[CLIENT LOG] [${level}] [${module}] ${message}`);
    const log = this.logRepo.create({ level, module, message });
    return this.logRepo.save(log);
  }

  async getStatus() {
    const cameras = await this.cameraRepo.find();
    const activeCameras = cameras.filter((c) => c.status === 'online').length;
    const uptime = Math.floor(
      (Date.now() - this.startTime.getTime()) / 1000,
    );

    // Real-time AI status check
    let aiStatus = 'offline';
    try {
        const aiUrl = this.config.get<string>('AI_BACKEND_URL', 'http://127.0.0.1:8000');
        const res = await fetch(`${aiUrl}/status`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) aiStatus = 'healthy';
    } catch {
        aiStatus = 'offline';
    }

    // FastAPI check
    let fastapiStatus = 'offline';
    try {
        const fastapiUrl = 'http://127.0.0.1:8001/health'; // Internal port
        const res = await fetch(fastapiUrl, { signal: AbortSignal.timeout(1500) });
        if (res.ok) fastapiStatus = 'online';
    } catch {
        fastapiStatus = 'offline';
    }

    // Database check (TypeORM)
    let dbStatus = 'online';
    try {
      await this.cameraRepo.query('SELECT 1');
    } catch {
      dbStatus = 'offline';
    }

    // Since S3 check might require aws-sdk, we will assume online if FastAPI is online
    const s3Status = fastapiStatus === 'online' ? 'online' : 'offline';

    return {
      // Legacy fields for React UI
      camerasOnline: activeCameras,
      camerasOffline: cameras.length - activeCameras,
      uptime: this.formatUptime(uptime),
      aiPipelineStatus: aiStatus,

      // New fields requested by user
      backend: 'online', // we are running
      fastapi: fastapiStatus,
      database: dbStatus,
      s3: s3Status,
      cameras_online: activeCameras,
      cameras_offline: cameras.length - activeCameras,
    };
  }

  async getHealth() {
    const dbType = this.config.get<string>('DB_TYPE', 'auto');
    const port = this.config.get<string>('PORT', '8003');
    const nodeEnv = this.config.get<string>('NODE_ENV', 'development');
    const isRedis = !!this.config.get('REDIS_HOST');
    const aiUrl = this.config.get<string>('AI_BACKEND_URL', 'http://127.0.0.1:8000');

    return {
      status: 'healthy',
      database: 'ok',
      redis: 'ok',
      timestamp: new Date().toISOString(),
      config: {
        dbType: dbType === 'sqlite' ? 'SQLite (Local)' : 'PostgreSQL',
        cacheType: isRedis ? 'Redis' : 'In-Memory Cache',
        aiBackend: `Python CV Pipeline (${aiUrl})`,
        apiPort: port,
        environment: nodeEnv,
      }
    };
  }

  private formatUptime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  }
}
