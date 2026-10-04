import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NoGuestGuard } from '../common/guards/no-guest.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { StoresService } from './stores.service';
import { CreateStoreDto, UpdateStoreDto } from './dto/store.dto';

@Controller('stores')
export class StoresController {
  constructor(private readonly stores: StoresService) {}

  @Post()
  @UseGuards(JwtAuthGuard, NoGuestGuard)
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateStoreDto) {
    return this.stores.create(user.sub, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, NoGuestGuard)
  me(@CurrentUser() user: JwtUser) {
    return this.stores.myStore(user.sub);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, NoGuestGuard)
  update(@CurrentUser() user: JwtUser, @Body() dto: UpdateStoreDto) {
    return this.stores.update(user.sub, dto);
  }

  // Public: browsable by guests, no auth required.
  @Get(':idOrSlug')
  getPublic(@Param('idOrSlug') idOrSlug: string) {
    return this.stores.getPublic(idOrSlug);
  }
}
