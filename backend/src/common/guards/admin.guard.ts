import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

// Admin-panel endpoints. Requires a session issued by the web admin login
// (password + authenticator code), not a mobile-app token. The JWT strategy
// has already checked the account is active and refreshed its role from the
// database, so a demoted or banned admin loses access straight away.
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (req.user?.aud !== 'admin' || req.user?.role !== 'ADMIN') throw new ForbiddenException('Admins only.');
    return true;
  }
}
