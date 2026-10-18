import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { CategoriesModule } from './categories/categories.module';
import { StoresModule } from './stores/stores.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { ChatModule } from './chat/chat.module';
import { UploadsModule } from './uploads/uploads.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { SellerModule } from './seller/seller.module';
import { AssistantModule } from './assistant/assistant.module';
import { AppConfigModule } from './config-api/config.module';
import { SellerApplicationModule } from './seller-application/seller-application.module';
import { AdminModule } from './admin/admin.module';
import { ShareModule } from './share/share.module';
import { GeoModule } from './geo/geo.module';
import { MailModule } from './mail/mail.module';
import { ReportsModule } from './reports/reports.module';
import { WebModule } from './web/web.module';
import { ServicesModule } from './services/services.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    VehiclesModule,
    CategoriesModule,
    StoresModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    ChatModule,
    UploadsModule,
    WishlistModule,
    SellerModule,
    AssistantModule,
    AppConfigModule,
    SellerApplicationModule,
    AdminModule,
    ShareModule,
    GeoModule,
    MailModule,
    ReportsModule,
    WebModule,
    ServicesModule,
  ],
})
export class AppModule {}
