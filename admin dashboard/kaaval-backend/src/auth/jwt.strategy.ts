import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, type StrategyOptionsWithoutRequest } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

const JwtPassportStrategy = PassportStrategy(Strategy);

@Injectable()
export class JwtStrategy extends JwtPassportStrategy {
  constructor(config: ConfigService) {
    const opts: StrategyOptionsWithoutRequest = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') || 'kaaval-ai-jwt-' + require('os').hostname(),
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
