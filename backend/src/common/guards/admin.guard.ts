import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { users } from '../../db/schema';

// Admin-only endpoints. Checks the token's role AND the database, so a
// demoted admin loses access immediately even with an old token.
// Must run after JwtAuthGuard so req.user is populated.
@Injectable()
export class AdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    if (req.user?.role !== 'ADMIN') throw new ForbiddenException('Admins only.');
    const u = await db.query.users.findFirst({ where: eq(users.id, req.user.sub), columns: { role: true } });
    if (u?.role !== 'ADMIN') throw new ForbiddenException('Admins only.');
    return true;
  }
}
