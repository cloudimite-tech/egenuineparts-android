import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NoGuestGuard } from '../common/guards/no-guest.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { ServicesService } from './services.service';
import { AppointmentListQuery, AppointmentReplyDto, AppointmentRequestDto, ServiceDto, ServiceQueryDto, ServiceTypeRequestDto } from './services.dto';

@Controller('service-types')
export class ServiceTypesController {
  constructor(private readonly svc: ServicesService) {}

  // Public: the list shown under "Services" and in the seller's picker.
  @Get()
  list() {
    return this.svc.types();
  }

  @Get('requests/mine')
  @UseGuards(JwtAuthGuard, NoGuestGuard)
  myRequests(@CurrentUser() user: JwtUser) {
    return this.svc.myRequests(user.sub);
  }

  @Post('requests')
  @UseGuards(JwtAuthGuard, NoGuestGuard)
  request(@CurrentUser() user: JwtUser, @Body() dto: ServiceTypeRequestDto) {
    return this.svc.requestType(user.sub, dto);
  }
}

@Controller('services')
export class ServicesController {
  constructor(private readonly svc: ServicesService) {}

  @Get()
  list(@Query() q: ServiceQueryDto) {
    return this.svc.list(q);
  }

  // Declared before ':id'.
  @Get('mine')
  @UseGuards(JwtAuthGuard, NoGuestGuard)
  mine(@CurrentUser() user: JwtUser) {
    return this.svc.mine(user.sub);
  }

  @Get('mine/summary')
  @UseGuards(JwtAuthGuard, NoGuestGuard)
  summary(@CurrentUser() user: JwtUser) {
    return this.svc.sellerSummary(user.sub);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, NoGuestGuard)
  create(@CurrentUser() user: JwtUser, @Body() dto: ServiceDto) {
    return this.svc.create(user.sub, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, NoGuestGuard)
  update(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: ServiceDto) {
    return this.svc.update(user.sub, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, NoGuestGuard)
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.svc.remove(user.sub, id);
  }

  // Opens (or reuses) the chat about this service.
  @Post(':id/chat')
  @UseGuards(JwtAuthGuard, NoGuestGuard)
  async chat(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    const { conversationId } = await this.svc.conversationFor(user.sub, id);
    return { conversationId };
  }

  @Post(':id/appointments')
  @UseGuards(JwtAuthGuard, NoGuestGuard)
  book(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: AppointmentRequestDto) {
    return this.svc.requestAppointment(user.sub, id, dto);
  }
}

@Controller('appointments')
@UseGuards(JwtAuthGuard, NoGuestGuard)
export class AppointmentsController {
  constructor(private readonly svc: ServicesService) {}

  @Get()
  list(@CurrentUser() user: JwtUser, @Query() q: AppointmentListQuery) {
    return this.svc.listAppointments(user.sub, q.as ?? 'buyer');
  }

  @Get(':id')
  get(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.svc.getAppointment(user.sub, id);
  }

  @Post(':id/accept')
  accept(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: AppointmentReplyDto) {
    return this.svc.respond(user.sub, id, 'accept', dto.note);
  }

  @Post(':id/decline')
  decline(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: AppointmentReplyDto) {
    return this.svc.respond(user.sub, id, 'decline', dto.note);
  }

  @Post(':id/complete')
  complete(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: AppointmentReplyDto) {
    return this.svc.respond(user.sub, id, 'complete', dto.note);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: AppointmentReplyDto) {
    return this.svc.respond(user.sub, id, 'cancel', dto.note);
  }
}
