import { Module } from '@nestjs/common';
import { WebController } from './web.controller';
import { AdminWebController } from './admin-web.controller';

@Module({ controllers: [WebController, AdminWebController] })
export class WebModule {}
