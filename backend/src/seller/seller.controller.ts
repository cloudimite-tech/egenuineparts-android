import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NoGuestGuard } from '../common/guards/no-guest.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { SellerService } from './seller.service';
import { UpdateFulfillmentDto } from '../orders/dto/order.dto';

@Controller('seller')
@UseGuards(JwtAuthGuard, NoGuestGuard)
export class SellerController {
  constructor(private readonly seller: SellerService) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: JwtUser) {
    return this.seller.dashboard(user.sub);
  }

  @Get('orders')
  orders(@CurrentUser() user: JwtUser) {
    return this.seller.orders(user.sub);
  }

  @Patch('orders/:orderId/status')
  updateStatus(
    @CurrentUser() user: JwtUser,
    @Param('orderId') orderId: string,
    @Body() dto: UpdateFulfillmentDto,
  ) {
    return this.seller.updateStatus(user.sub, orderId, dto.status);
  }
}
