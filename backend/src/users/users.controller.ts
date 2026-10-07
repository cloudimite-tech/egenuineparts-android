import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NoGuestGuard } from '../common/guards/no-guest.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, NoGuestGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: JwtUser) {
    return this.users.me(user.sub);
  }

  @Patch('me')
  update(@CurrentUser() user: JwtUser, @Body() dto: UpdateProfileDto) {
    return this.users.update(user.sub, dto);
  }
}
