import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  private sign(user: { id: string; role: string; email: string }) {
    return this.jwt.sign({ sub: user.id, role: user.role, email: user.email });
  }

  async register(dto: RegisterDto) {
    const existing = await db.query.users.findFirst({ where: eq(users.email, dto.email) });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: dto.role ?? 'BUYER',
      })
      .returning();

    return {
      accessToken: this.sign(user),
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role },
    };
  }

  async login(dto: LoginDto) {
    const user = await db.query.users.findFirst({ where: eq(users.email, dto.email) });
    if (!user) throw new UnauthorizedException('Invalid email or password.');
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid email or password.');

    return {
      accessToken: this.sign(user),
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role },
    };
  }

  guest() {
    const guestId = `guest_${Math.random().toString(36).slice(2, 12)}`;
    const accessToken = this.jwt.sign(
      { sub: guestId, role: 'GUEST' },
      { expiresIn: '7d' },
    );
    return { accessToken, user: { id: guestId, role: 'GUEST' } };
  }
}
