import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NoGuestGuard } from '../common/guards/no-guest.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { deleteAccount } from './account-deletion';
import { AccountSecurityService } from './account-security.service';

class PasswordDto {
  @IsString() password: string;
}
class ChangePasswordDto {
  @IsString() currentPassword: string;
  @IsString() @MinLength(8, { message: 'Use at least 8 characters.' }) newPassword: string;
}
class ChangeEmailDto {
  @IsEmail() newEmail: string;
  @IsString() password: string;
}
class CodeDto {
  @IsString() @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code.' }) code: string;
}

@Controller('users')
@UseGuards(JwtAuthGuard, NoGuestGuard)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly security: AccountSecurityService,
  ) {}

  @Get('me')
  me(@CurrentUser() user: JwtUser) {
    return this.users.me(user.sub);
  }

  @Patch('me')
  update(@CurrentUser() user: JwtUser, @Body() dto: UpdateProfileDto) {
    return this.users.update(user.sub, dto);
  }

  // Google Play: in-app account deletion. Asks for the password again.
  @Post('me/delete')
  @HttpCode(200)
  remove(@CurrentUser() user: JwtUser, @Body() dto: PasswordDto) {
    return deleteAccount(user.sub, dto.password);
  }

  @Post('me/password')
  @HttpCode(200)
  changePassword(@CurrentUser() user: JwtUser, @Body() dto: ChangePasswordDto) {
    return this.security.changePassword(user.sub, dto.currentPassword, dto.newPassword);
  }

  @Post('me/email')
  @HttpCode(200)
  changeEmail(@CurrentUser() user: JwtUser, @Body() dto: ChangeEmailDto) {
    return this.security.requestEmailChange(user.sub, dto.newEmail, dto.password);
  }

  @Post('me/email/confirm')
  @HttpCode(200)
  confirmEmail(@CurrentUser() user: JwtUser, @Body() dto: CodeDto) {
    return this.security.confirmEmailChange(user.sub, dto.code);
  }

  @Post('me/accept-terms')
  @HttpCode(200)
  acceptTerms(@CurrentUser() user: JwtUser) {
    return this.users.acceptTerms(user.sub);
  }

  @Get('me/blocks')
  blocks(@CurrentUser() user: JwtUser) {
    return this.users.blocks(user.sub);
  }

  @Delete('me/blocks/:userId')
  unblock(@CurrentUser() user: JwtUser, @Param('userId') blockedId: string) {
    return this.users.unblock(user.sub, blockedId);
  }
}
