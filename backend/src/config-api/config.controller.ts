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
      // Vercel functions can't hold WebSocket connections, so the app uses
      // REST + light polling for chat there instead of retrying a socket forever.
      // CHAT_REALTIME=off forces the Vercel behaviour locally (for testing).
      realtime: process.env.CHAT_REALTIME ? process.env.CHAT_REALTIME !== 'off' : !process.env.VERCEL,
    };
  }
}
