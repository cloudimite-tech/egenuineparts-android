import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { sessionState } from '../security/session-check';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret-change-me',
    });
  }

  async validate(payload: JwtUser & { typ?: string }) {
    if (payload.typ) throw new UnauthorizedException(); // links / setup tokens aren't sessions
    if (payload.role === 'GUEST') return payload;
    const s = await sessionState(payload.sub);
    if (!s.ok || (payload.tv ?? 0) !== s.tv) {
      throw new UnauthorizedException({ message: 'Your session has ended. Please sign in again.', code: 'SESSION_REVOKED' });
    }
    return { ...payload, role: s.role as JwtUser['role'] };
  }
}
