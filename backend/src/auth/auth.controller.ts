import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  // Lets the app get a scoped, browse-only token for guests without a
  // sign-up step. Guest tokens are rejected by NoGuestGuard on cart/order/chat.
  @Post('guest')
  guest() {
    return this.auth.guest();
  }
}
