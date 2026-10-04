import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NoGuestGuard } from '../common/guards/no-guest.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { CartService } from './cart.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';

// Guests can never reach these routes: NoGuestGuard sends them to sign-in.
@Controller('cart')
@UseGuards(JwtAuthGuard, NoGuestGuard)
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  list(@CurrentUser() user: JwtUser) {
    return this.cart.list(user.sub);
  }

  @Post('items')
  add(@CurrentUser() user: JwtUser, @Body() dto: AddCartItemDto) {
    return this.cart.add(user.sub, dto);
  }

  @Patch('items/:id')
  update(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: UpdateCartItemDto) {
    return this.cart.updateQuantity(user.sub, id, dto.quantity);
  }

  @Delete('items/:id')
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.cart.remove(user.sub, id);
  }
}
