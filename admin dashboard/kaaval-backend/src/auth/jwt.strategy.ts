import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service.js';

const parseCookies = (cookieHeader: string) => {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    if (parts.length >= 2) cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
  });
  return cookies;
};

const cookieOrHeaderExtractor = (req: any) => {
  let token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (token) return token;
  if (req.query && req.query.token) return req.query.token;
  if (req.headers && req.headers.cookie) {
    const cookies = parseCookies(req.headers.cookie);
    if (cookies['kaaval_token']) return cookies['kaaval_token'];
  }
  return null;
};

const JwtPassportStrategy = PassportStrategy(Strategy);

@Injectable()
export class JwtStrategy extends JwtPassportStrategy {
  constructor(config: ConfigService, private usersService: UsersService) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret || secret.length < 32) {
      throw new Error(
        'JWT_SECRET is not set or is too short (minimum 32 characters). ' +
        'Set a strong, random value in your .env file.',
      );
    }

    super({
      jwtFromRequest: cookieOrHeaderExtractor,
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: { sub: string; username: string; role: string; name: string; subdivision?: string | null; sessionId?: string }) {
    if (payload.sessionId) {
      const isValid = await this.usersService.isSessionValid(payload.sessionId);
      if (!isValid) {
        throw new UnauthorizedException('Session has been revoked or logged out');
      }
    }

    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role, // This is now roleCode
      name: payload.name,
      subdivision: payload.subdivision ?? null,
    };
  }
}
