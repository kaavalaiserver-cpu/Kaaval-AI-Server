import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, type StrategyOptionsWithoutRequest } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

const JwtPassportStrategy = PassportStrategy(Strategy);

@Injectable()
export class JwtStrategy extends JwtPassportStrategy {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret || secret.length < 32) {
      throw new Error(
        'JWT_SECRET is not set or is too short (minimum 32 characters). ' +
        'Set a strong, random value in your .env file.',
      );
    }

    const opts: StrategyOptionsWithoutRequest = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    };
    super(opts);
  }

  validate(payload: { sub: string; username: string; role: string; name: string; subdivision?: string | null }) {
    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      name: payload.name,
      subdivision: payload.subdivision ?? null,
    };
  }
}
