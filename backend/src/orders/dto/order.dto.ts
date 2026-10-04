import { IsArray, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateOrderDto {
  @IsString() @MinLength(3) addressLine1: string;
  @IsOptional() @IsString() addressLine2?: string;
  @IsString() @MinLength(2) city: string;
  @IsOptional() @IsString() district?: string;
  // Shared with the seller(s) of this order only, for delivery — never in chat.
  @IsString() @MinLength(9) contactPhone: string;
  @IsOptional() @IsIn(['COD']) paymentMethod?: 'COD';
  // "Buy now" checks out just these cart lines; omitted = whole cart.
  @IsOptional() @IsArray() @IsString({ each: true }) cartItemIds?: string[];
}

export class UpdateFulfillmentDto {
  @IsIn(['PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
  status: 'PENDING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
}
