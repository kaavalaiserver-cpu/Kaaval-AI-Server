import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from './roles.enum.js';
import { createHash, timingSafeEqual } from 'crypto';

function hashPassword(pw: string): string {
  return createHash('sha256').update(pw).digest('hex');
}

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

interface HardcodedUser {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  role: Role;
  subdivision?: string;
}

const USERS: HardcodedUser[] = [
  {
    id: '1',
    username: 'superadmin',
    passwordHash: hashPassword('superadmin@123'),
    name: 'District Traffic Control',
    role: Role.SUPER_ADMIN,
  },
  {
    id: '2',
    username: 'trafficadmin',
    passwordHash: hashPassword('trafficadmin@123'),
    name: 'Traffic Inspector',
    role: Role.TRAFFIC_ADMIN,
  },
  {
    id: '3',
    username: 'devadmin',
    passwordHash: hashPassword('devadmin@123'),
    name: 'AI Engineer',
    role: Role.DEV_ADMIN,
  },
  {
    id: '4',
    username: 'colacheladmin',
    passwordHash: hashPassword('colachel@123'),
    name: 'Colachel Subdivision Admin',
    role: Role.COLACHEL_ADMIN,
    subdivision: 'Colachel',
  },
  {
    id: '5',
    username: 'marthandamadmin',
    passwordHash: hashPassword('marthandam@123'),
    name: 'Marthandam Subdivision Admin',
    role: Role.MARTHANDAM_ADMIN,
    subdivision: 'Marthandam',
  },
  {
    id: '6',
    username: 'nagercoiladmin',
    passwordHash: hashPassword('nagercoil@123'),
    name: 'Nagercoil Subdivision Admin',
    role: Role.NAGERCOIL_ADMIN,
    subdivision: 'Nagercoil',
  },
  {
    id: '7',
    username: 'kanyakumariadmin',
    passwordHash: hashPassword('kanyakumari@123'),
    name: 'Kanyakumari Subdivision Admin',
    role: Role.KANYAKUMARI_ADMIN,
    subdivision: 'Kanyakumari',
  },
  {
    id: '8',
    username: 'thuckalayadmin',
    passwordHash: hashPassword('thuckalay@123'),
    name: 'Thuckalay Subdivision Admin',
    role: Role.THUCKALAY_ADMIN,
    subdivision: 'Thuckalay',
  },
];

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async login(username: string, password: string) {
    const user = USERS.find((u) => u.username === username);
    if (!user || !safeCompare(hashPassword(password), user.passwordHash)) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // user found and password verified

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      subdivision: user.subdivision ?? null,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        subdivision: user.subdivision ?? null,
      },
    };
  }

  getProfile(user: { id: string; username: string; role: string; name: string; subdivision?: string | null }) {
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      subdivision: user.subdivision ?? null,
    };
  }
}
