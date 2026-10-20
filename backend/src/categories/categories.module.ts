import { Module } from '@nestjs/common';
import { AdminCategoryRequestsController, CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoryRequestsService } from './category-requests.service';

@Module({
  controllers: [CategoriesController, AdminCategoryRequestsController],
  providers: [CategoriesService, CategoryRequestsService],
  exports: [CategoriesService, CategoryRequestsService],
})
export class CategoriesModule {}
