import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';

@Module({ imports: [ProductsModule], controllers: [AssistantController], providers: [AssistantService] })
export class AssistantModule {}
