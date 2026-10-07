import { Module } from '@nestjs/common';
import { SellerApplicationController } from './seller-application.controller';
import { SellerApplicationService } from './seller-application.service';

@Module({
  controllers: [SellerApplicationController],
  providers: [SellerApplicationService],
})
export class SellerApplicationModule {}
