import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Allows both real accounts and guest tokens through; use NoGuestGuard
// on top of this for endpoints that require a signed-in account.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
