import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { adminSessionLive } from '../../security/admin-sessions';

// Admin-panel endpoints. Requires a session issued by the web admin login
// (password + authenticator code), not a mobile-app token. The JWT strategy
// has already checked the account is active and refreshed its role from the
// database, so a demoted or banned admin loses access straight away.
@Injectable()
export class AdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    if (req.user?.aud !== 'admin' || req.user?.role !== 'ADMIN') throw new ForbiddenException('Admins only.');
    // Each signed-in device has its own session, which can be signed out from Settings.
    if (!req.user.sid || !(await adminSessionLive(req.user.sid, req.user.sub))) {
      throw new UnauthorizedException({ message: 'This device was signed out. Please sign in again.', code: 'SESSION_REVOKED' });
    }
    return true;
  }
}
