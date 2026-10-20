import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NoGuestGuard } from '../common/guards/no-guest.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import {
  AdminCategoryApproveDto, AdminCategoryDeclineDto, CategoryRequestDto, CategoryRequestListQuery, CategoryRequestsService,
} from './category-requests.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService, private readonly requests: CategoryRequestsService) {}

  @Get()
  list() {
    return this.categories.listTree();
  }

  // Sellers: "my part's category isn't listed".
  @Post('requests')
  @UseGuards(JwtAuthGuard, NoGuestGuard)
  request(@CurrentUser() user: JwtUser, @Body() dto: CategoryRequestDto) {
    return this.requests.request(user.sub, dto);
  }

  @Get('requests/mine')
  @UseGuards(JwtAuthGuard, NoGuestGuard)
  mine(@CurrentUser() user: JwtUser) {
    return this.requests.mine(user.sub);
  }
}

// Admin panel: review sellers' category requests.
@Controller('admin/category-requests')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminCategoryRequestsController {
  constructor(private readonly requests: CategoryRequestsService) {}

  @Get()
  list(@Query() q: CategoryRequestListQuery) {
    return this.requests.adminList(q.status ?? 'PENDING');
  }

  @Post(':id/approve')
  approve(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: AdminCategoryApproveDto) {
    return this.requests.adminApprove(user.sub, id, dto);
  }

  @Post(':id/decline')
  decline(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: AdminCategoryDeclineDto) {
    return this.requests.adminDecline(user.sub, id, dto.note);
  }
}
