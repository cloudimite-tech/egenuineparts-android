import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AccountSecurityService } from './account-security.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [UsersController],
  imports: [AuthModule],
  providers: [UsersService, AccountSecurityService],
})
export class UsersModule {}
