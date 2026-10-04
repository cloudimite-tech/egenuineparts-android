import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NoGuestGuard } from '../common/guards/no-guest.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/vehicle.dto';

@Controller('vehicles')
@UseGuards(JwtAuthGuard, NoGuestGuard)
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Get()
  list(@CurrentUser() user: JwtUser) {
    return this.vehicles.list(user.sub);
  }

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateVehicleDto) {
    return this.vehicles.create(user.sub, dto);
  }

  @Patch(':id/default')
  setDefault(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.vehicles.setDefault(user.sub, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.vehicles.remove(user.sub, id);
  }
}
