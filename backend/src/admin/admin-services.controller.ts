import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { ServicesService } from '../services/services.service';
import { SERVICE_ICONS } from '../services/service-types';
import {
  AdminRequestApproveDto, AdminRequestDeclineDto, AdminServiceTypeDto, AdminServiceTypeUpdateDto, RequestListQuery,
} from '../services/services.dto';

// Service types + sellers' "please add my service" requests.
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminServicesController {
  constructor(private readonly svc: ServicesService) {}

  @Get('service-types')
  async types() {
    return { types: await this.svc.adminTypes(), icons: SERVICE_ICONS };
  }

  @Post('service-types')
  create(@CurrentUser() user: JwtUser, @Body() dto: AdminServiceTypeDto) {
    return this.svc.adminCreateType(user.sub, dto);
  }

  @Patch('service-types/:id')
  update(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: AdminServiceTypeUpdateDto) {
    return this.svc.adminUpdateType(user.sub, id, dto);
  }

  @Get('service-requests')
  requests(@Query() q: RequestListQuery) {
    return this.svc.adminRequests(q.status ?? 'PENDING');
  }

  @Post('service-requests/:id/approve')
  approve(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: AdminRequestApproveDto) {
    return this.svc.adminApprove(user.sub, id, dto);
  }

  @Post('service-requests/:id/decline')
  decline(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: AdminRequestDeclineDto) {
    return this.svc.adminDecline(user.sub, id, dto.note);
  }
}
