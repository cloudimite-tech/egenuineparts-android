import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

// Blocks guest tokens from buying, adding to cart, or chatting.
// Must run after JwtAuthGuard so req.user is populated.
@Injectable()
export class NoGuestGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.user || req.user.role === 'GUEST') {
      throw new ForbiddenException('Please sign in to continue.');
    }
    return true;
  }
}
