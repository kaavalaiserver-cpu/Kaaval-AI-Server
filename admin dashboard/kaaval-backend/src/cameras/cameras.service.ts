import { Injectable, Inject, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Camera } from './entities/camera.entity.js';
import { Junction } from '../junctions/entities/junction.entity.js';
import { Subdivision } from '../subdivisions/entities/subdivision.entity.js';
import { Violation } from '../violations/entities/violation.entity.js';

@Injectable()
export class CamerasService {
  constructor(
    @InjectRepository(Camera)
    private readonly cameraRepo: Repository<Camera>,
    @InjectRepository(Junction)
    private readonly junctionRepo: Repository<Junction>,
    @InjectRepository(Subdivision)
    private readonly subdivisionRepo: Repository<Subdivision>,
    @InjectRepository(Violation)
    private readonly violationRepo: Repository<Violation>,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
  ) {}

  async findAll(user?: any, subdivisionCode?: string) {
    let whereClause: any = {};
    if (user?.junctionId) {
      whereClause = { junctionId: user.junctionId };
    } else if (user?.subdivisionId) {
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

    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    const latestViolations = await this.violationRepo
      .createQueryBuilder('v')
      .select('v.cameraId', 'cameraId')
      .addSelect('MAX(v.violationTimestamp)', 'latest')
      .groupBy('v.cameraId')
      .getRawMany();

    const latestMap = new Map();
    latestViolations.forEach(v => {
      if (v.cameraId && v.latest) {
        latestMap.set(v.cameraId, new Date(v.latest));
      }
    });

    for (const c of cameras) {
      const latest = latestMap.get(c.id) || latestMap.get(c.cameraCode);
      if (latest && latest > thirtyMinsAgo) {
        c.status = 'ONLINE';
      } else {
        c.status = 'OFFLINE';
      }
    }

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
        subdivision: c.junction?.subdivision?.subdivisionName ?? null,
        subdivision_id: c.junction?.subdivision?.id ?? null,
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

  private sanitizeJunctionDto(dto: any) {
    const clean = { ...dto };
    if (clean.latitude === '' || clean.latitude === undefined || clean.latitude === null) {
      clean.latitude = null;
    } else if (typeof clean.latitude === 'string') {
      const parsed = parseFloat(clean.latitude.trim());
      clean.latitude = isNaN(parsed) ? null : parsed;
    }
    if (clean.longitude === '' || clean.longitude === undefined || clean.longitude === null) {
      clean.longitude = null;
    } else if (typeof clean.longitude === 'string') {
      const parsed = parseFloat(clean.longitude.trim());
      clean.longitude = isNaN(parsed) ? null : parsed;
    }
    if (clean.junctionCode === '') clean.junctionCode = null;
    if (clean.address === '') clean.address = null;
    return clean;
  }

  private sanitizeCameraDto(dto: any) {
    const clean = { ...dto };
    if (clean.forwardedPort === '' || clean.forwardedPort === undefined || clean.forwardedPort === null) {
      clean.forwardedPort = null;
    } else if (typeof clean.forwardedPort === 'string') {
      const parsed = parseInt(clean.forwardedPort.trim(), 10);
      clean.forwardedPort = isNaN(parsed) ? null : parsed;
    }
    if (clean.installationHeight === '' || clean.installationHeight === undefined || clean.installationHeight === null) {
      clean.installationHeight = null;
    } else if (typeof clean.installationHeight === 'string') {
      const parsed = parseFloat(clean.installationHeight.trim());
      clean.installationHeight = isNaN(parsed) ? null : parsed;
    }
    if (clean.installationDate === '') clean.installationDate = null;
    if (clean.cameraDirection === '') clean.cameraDirection = null;
    if (clean.rtspUrl === '') clean.rtspUrl = null;
    if (clean.deviceIp === '') clean.deviceIp = null;
    if (clean.remarks === '') clean.remarks = null;
    if (clean.operatingStartTime === '') clean.operatingStartTime = null;
    if (clean.operatingEndTime === '') clean.operatingEndTime = null;
    return clean;
  }

  async createJunction(dto: any, user?: any) {
    const cleanDto = this.sanitizeJunctionDto(dto);
    const junction = this.junctionRepo.create({
      ...cleanDto,
      createdBy: user?.id ? { id: user.id } : undefined,
    });
    return await this.junctionRepo.save(junction);
  }

  async updateJunction(id: string, dto: any) {
    const cleanDto = this.sanitizeJunctionDto(dto);
    delete cleanDto.id;
    await this.junctionRepo.update(id, cleanDto);
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
    const cleanDto = this.sanitizeCameraDto(dto);
    const camera = this.cameraRepo.create(cleanDto);
    try {
      return await this.cameraRepo.save(camera);
    } catch (e: any) {
      console.error('Error creating camera', e);
      throw new InternalServerErrorException('Failed to create camera: ' + (e.message || e));
    }
  }

  async update(id: string, dto: any) {
    const cleanDto = this.sanitizeCameraDto(dto);
    delete cleanDto.id;
    await this.cameraRepo.update(id, cleanDto);
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

  // Subdivisions CRUD
  async createSubdivision(dto: any) {
    if (!dto.districtId) {
      const districtRes = await this.subdivisionRepo.query("SELECT id FROM districts WHERE district_name = 'Kanyakumari' LIMIT 1");
      if (districtRes && districtRes.length > 0) {
        dto.districtId = districtRes[0].id;
      }
    }
    const sub = this.subdivisionRepo.create(dto);
    const saved: any = await this.subdivisionRepo.save(sub);
    const subName = Array.isArray(saved) ? saved[0]?.subdivisionName : saved?.subdivisionName;
    if (subName) {
      await this.ensureSubdivisionRole(subName);
    }
    return saved;
  }

  async ensureSubdivisionRole(subdivisionName: string) {
    if (!subdivisionName) return;
    const cleanName = subdivisionName.trim();
    const baseCode = cleanName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    const roleCode = `${baseCode}_ADMIN`;
    const displayName = `${cleanName} Admin`;

    try {
      const existing = await this.subdivisionRepo.query(
        `SELECT id FROM roles WHERE UPPER(role_code) = UPPER($1)`,
        [roleCode]
      );
      if (!existing || existing.length === 0) {
        await this.subdivisionRepo.query(
          `INSERT INTO roles (id, role_code, display_name, hierarchy_level, description, is_system_role)
           VALUES (uuid_generate_v4(), $1, $2, 25, $3, false)`,
          [roleCode, displayName, `Administrator for ${cleanName} subdivision`]
        );
      }
    } catch (e: any) {
      console.error('Failed to auto-create role for subdivision:', subdivisionName, e);
    }
  }

  async updateSubdivision(id: string, dto: any) {
    await this.subdivisionRepo.update(id, dto);
    const updated = await this.subdivisionRepo.findOne({ where: { id } });
    if (updated?.subdivisionName) {
      await this.ensureSubdivisionRole(updated.subdivisionName);
    }
    return updated;
  }

  async removeSubdivision(id: string) {
    const sub = await this.subdivisionRepo.findOne({ where: { id } });
    if (sub) {
      const cleanName = sub.subdivisionName.trim();
      const baseCode = cleanName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
      const roleCode = `${baseCode}_ADMIN`;
      try {
        await this.subdivisionRepo.query(
          `DELETE FROM roles WHERE UPPER(role_code) = UPPER($1) AND is_system_role = false`,
          [roleCode]
        );
      } catch (e) {
        console.error('Failed to delete role for subdivision:', roleCode, e);
      }
    }
    await this.subdivisionRepo.delete(id);
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
