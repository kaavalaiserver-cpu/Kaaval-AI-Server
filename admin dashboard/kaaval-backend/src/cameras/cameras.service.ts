import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Camera } from './entities/camera.entity.js';
import { isInUserScope, type ScopedUser } from '../auth/subdivision-access.js';

@Injectable()
export class CamerasService {
  constructor(
    @InjectRepository(Camera)
    private readonly cameraRepo: Repository<Camera>,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
  ) {}

  async findAll(user?: ScopedUser) {
    const cached = await this.cache.get<any[]>('cameras-all');
    if (cached) {
      return cached.filter((c) => isInUserScope(user, c.gps_lat ?? c.gpsLat, c.gps_lng ?? c.gpsLng, c.location ?? c.locationName));
    }

    const primaryById = await this.cameraRepo.findOne({ where: { cameraId: 'CAM-EDGE-01' } });
    const fallback = await this.cameraRepo.find({ order: { cameraId: 'ASC' }, take: 1 });
    const primary = primaryById ?? fallback[0] ?? null;

    const now = new Date();
    const singleCamera = {
      id: primary?.id ?? 'CAM-EDGE-01',
      cameraId: 'CAM-EDGE-01',
      camera_id: 'CAM-EDGE-01',
      location: 'Collectorate Roundana',
      status: primary?.status ?? 'online',
      lastActive: primary?.lastActive ?? now,
      last_active: primary?.lastActive ?? now,
      violationCount: primary?.violationCount ?? 0,
      violation_count: primary?.violationCount ?? 0,
      ai_enabled: primary?.aiEnabled ?? true,
      gps_lat: primary?.gpsLat ?? 8.1784,
      gps_lng: primary?.gpsLng ?? 77.432,
    };

    const allCameras = [singleCamera];
    await this.cache.set('cameras-all', allCameras, 30000);
    return allCameras.filter((c) => isInUserScope(user, c.gps_lat, c.gps_lng, c.location));
  }

  async getStatus(user?: ScopedUser) {
    const cameras = await this.findAll(user);
    const online = cameras.filter((c) => c.status === 'online' || c.status === 'active').length;
    const offline = cameras.filter((c) => c.status !== 'online').length;

    return {
      total: cameras.length,
      online,
      offline,
      cameras: cameras.map((c) => ({
        id: c.id,
        camera_id: c.camera_id ?? c.cameraId,
        location: c.location ?? c.locationName,
        status: c.status,
        last_active: c.last_active ?? c.lastActive,
        violation_count: c.violation_count ?? c.violationCount,
        ai_enabled: c.aiEnabled,
        gps_lat: c.gps_lat ?? c.gpsLat,
        gps_lng: c.gps_lng ?? c.gpsLng,
      })),
    };
  }

  async seed() {
    await this.cameraRepo.clear();

    const cam = this.cameraRepo.create({
      cameraId: 'CAM-EDGE-01',
      locationName: 'Collectorate Roundana',
      gpsLat: 8.1784,
      gpsLng: 77.4320,
      status: 'online',
      lastActive: new Date(),
      aiEnabled: true,
    });
    await this.cameraRepo.save(cam);

    await this.cache.del('cameras-all');
    return { message: 'Seeded 1 camera: Collectorate Roundana' };
  }
}
