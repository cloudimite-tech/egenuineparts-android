import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { AppointmentsController, ServicesController, ServiceTypesController } from './services.controller';
import { ServicesService } from './services.service';

@Module({
  imports: [ChatModule],
  controllers: [ServiceTypesController, ServicesController, AppointmentsController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
