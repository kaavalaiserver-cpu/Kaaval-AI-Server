import { Injectable, Inject, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Camera } from './entities/camera.entity.js';
import { Junction } from '../junctions/entities/junction.entity.js';
import { Subdivision } from '../subdivisions/entities/subdivision.entity.js';

@Injectable()
export class CamerasService {
  constructor(
    @InjectRepository(Camera)
    private readonly cameraRepo: Repository<Camera>,
    @InjectRepository(Junction)
    private readonly junctionRepo: Repository<Junction>,
    @InjectRepository(Subdivision)
    private readonly subdivisionRepo: Repository<Subdivision>,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
  ) {}

  async findAll(user?: any, subdivisionCode?: string) {
    let whereClause: any = {};
    if (user?.subdivisionId) {
      whereClause = { junction: { subdivisionId: user.subdivisionId } };
    } else if (subdivisionCode && subdivisionCode.toLowerCase() !== 'all') {
      const ILike = require('typeorm').ILike;
      whereClause = { junction: { subdivision: { subdivisionName: ILike(`%${subdivisionCode}%`) } } };
    }

    const cameras = await this.cameraRepo.find({
      where: whereClause,
      relations: ['junction', 'junction.subdivision', 'settings', 'device'],
      order: { cameraName: 'ASC' }
    });

    return cameras;
  }

  async getStatus(user?: any, subdivisionCode?: string) {
    const cameras = await this.findAll(user, subdivisionCode);
    const online = cameras.filter((c) => c.status === 'ONLINE').length;
    const offline = cameras.length - online;

    return {
      total: cameras.length,
      online,
      offline,
      cameras: cameras.map((c) => ({
        id: c.id,
        camera_id: c.cameraCode,
        location: c.junction?.junctionName ?? c.cameraName,
        status: c.status,
        last_active: c.lastSeen,
        ai_enabled: c.settings?.helmetDetection || c.settings?.tripleRiding || true,
        gps_lat: c.junction?.latitude ?? 8.1784,
        gps_lng: c.junction?.longitude ?? 77.432,
      })),
    };
  }

  async getJunctions(user?: any) {
    let whereClause: any = {};
    if (user?.subdivisionId) {
      whereClause = { subdivisionId: user.subdivisionId };
    }
    return await this.junctionRepo.find({
      where: whereClause,
      order: { junctionName: 'ASC' },
      relations: ['subdivision'],
    });
  }

  async getSubdivisions(user?: any) {
    let whereClause: any = {};
    if (user?.subdivisionId) {
      whereClause = { id: user.subdivisionId };
    }
    return await this.subdivisionRepo.find({
      where: whereClause,
      order: { subdivisionName: 'ASC' },
    });
  }

  async createJunction(dto: any, user?: any) {
    const junction = this.junctionRepo.create({
      ...dto,
      createdBy: user?.id ? { id: user.id } : undefined,
    });
    return await this.junctionRepo.save(junction);
  }

  async updateJunction(id: string, dto: any) {
    await this.junctionRepo.update(id, dto);
    return await this.junctionRepo.findOne({
      where: { id },
      relations: ['subdivision'],
    });
  }

  async removeJunction(id: string) {
    const junction = await this.junctionRepo.findOne({ where: { id } });
    if (!junction) return { status: 'not_found', id };
    await this.junctionRepo.delete(id);
    return { status: 'deleted', id };
  }

  async create(dto: any) {
    if (!dto.junctionId) {
      throw new BadRequestException('Junction ID is required');
    }
    const camera = this.cameraRepo.create(dto);
    try {
      return await this.cameraRepo.save(camera);
    } catch (e: any) {
      console.error('Error creating camera', e);
      throw new InternalServerErrorException('Failed to create camera');
    }
  }

  async update(id: string, dto: any) {
    await this.cameraRepo.update(id, dto);
    return await this.cameraRepo.findOne({ where: { id } });
  }

  async remove(id: string) {
    const camera = await this.cameraRepo.findOne({ where: { id } });
    if (camera) {
      try {
        await this.cameraRepo.delete(id);
      } catch (err) {
        console.error('Error deleting camera', id, err);
        throw err;
      }
    }
    return { status: 'deleted', id };
  }

  async geocode(query: string) {
    const axios = require('axios');
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    try {
      const res = await axios.get(url, {
        headers: { 'User-Agent': 'Kaaval_AI_Dashboard/1.0 (internal_service)' }
      });
      return res.data;
    } catch (error: any) {
      console.error('Geocoding failed: ' + error.message);
      return [];
    }
  }

  async seed() {
    // Seed logic should now be handled by a global seeder or DB init,
    // but we can clear and return a message for now.
    // We avoid hardcoded seeding here since it depends on Junctions.
    return { message: 'Camera seeding should be performed after Junctions are seeded.' };
  }
}
