import { Controller, Get } from '@nestjs/common';
import { rateInfo } from '../products/pricing';
import { DELIVERY_FEE_PER_SELLER } from '../orders/orders.service';

// Public app settings the mobile app reads at startup.
@Controller('config')
export class AppConfigController {
  @Get()
  get() {
    return {
      currencies: ['LKR', 'USD'],
      settlementCurrency: 'LKR',
      usdToLkr: rateInfo().rate,
      rateSource: rateInfo().source,
      rateUpdatedAt: rateInfo().updatedAt,
      deliveryFeePerSeller: DELIVERY_FEE_PER_SELLER,
    };
  }
}
