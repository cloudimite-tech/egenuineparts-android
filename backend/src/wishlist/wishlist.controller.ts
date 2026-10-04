import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NoGuestGuard } from '../common/guards/no-guest.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { WishlistService } from './wishlist.service';

@Controller('wishlist')
@UseGuards(JwtAuthGuard, NoGuestGuard)
export class WishlistController {
  constructor(private readonly wishlist: WishlistService) {}

  @Get()
  list(@CurrentUser() user: JwtUser) {
    return this.wishlist.list(user.sub);
  }

  @Get('ids')
  ids(@CurrentUser() user: JwtUser) {
    return this.wishlist.ids(user.sub);
  }

  @Post(':productId')
  add(@CurrentUser() user: JwtUser, @Param('productId') productId: string) {
    return this.wishlist.add(user.sub, productId);
  }

  @Delete(':productId')
  remove(@CurrentUser() user: JwtUser, @Param('productId') productId: string) {
    return this.wishlist.remove(user.sub, productId);
  }
}
