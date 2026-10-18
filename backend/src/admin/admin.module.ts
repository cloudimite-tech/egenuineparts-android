import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAccountController } from './admin-account.controller';
import { AdminService } from './admin.service';
import { AdminServicesController } from './admin-services.controller';
import { ServicesModule } from '../services/services.module';

@Module({
  imports: [AuthModule, ServicesModule],
  controllers: [AdminAuthController, AdminAccountController, AdminController, AdminServicesController],
  providers: [AdminService],
})
export class AdminModule {}
