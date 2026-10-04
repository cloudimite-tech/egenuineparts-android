import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NoGuestGuard } from '../common/guards/no-guest.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  CreateReviewDto,
  ProductQueryDto,
  UpdateProductDto,
} from './dto/product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  // Public: guests can browse the full catalog without signing in.
  @Get()
  list(@Query() query: ProductQueryDto) {
    return this.products.list(query);
  }

  // Declared before ':id' so "mine" isn't treated as a product id.
  @Get('mine')
  @UseGuards(JwtAuthGuard, NoGuestGuard)
  mine(@CurrentUser() user: JwtUser) {
    return this.products.mine(user.sub);
  }

  @Get('highlights')
  highlights(@Query() query: ProductQueryDto) {
    return this.products.highlights(query);
  }

  @Get('reviewed')
  @UseGuards(JwtAuthGuard, NoGuestGuard)
  reviewed(@CurrentUser() user: JwtUser) {
    return this.products.myReviewedProductIds(user.sub);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.products.get(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, NoGuestGuard)
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateProductDto) {
    return this.products.create(user.sub, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, NoGuestGuard)
  update(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(user.sub, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, NoGuestGuard)
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.products.remove(user.sub, id);
  }

  @Post(':id/reviews')
  @UseGuards(JwtAuthGuard, NoGuestGuard)
  review(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: CreateReviewDto) {
    return this.products.addReview(user.sub, id, dto);
  }
}
