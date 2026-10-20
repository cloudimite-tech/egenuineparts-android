import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtUser {
  sub: string;
  role: 'BUYER' | 'SELLER' | 'ADMIN' | 'GUEST';
  email?: string;
  tv?: number; // token version - bumped to sign the user out everywhere
  aud?: string; // 'admin' for admin-panel sessions
  sid?: string; // admin-panel device session id
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);
