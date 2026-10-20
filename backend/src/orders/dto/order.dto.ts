import { IsArray, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateOrderDto {
  @IsString() @MinLength(3) addressLine1: string;
  @IsOptional() @IsString() addressLine2?: string;
  @IsString() @MinLength(2) city: string;
  @IsOptional() @IsString() district?: string;
  // Optional so older app versions can still check out.
  @IsOptional() @IsString() @Matches(/^\d{5}$/, { message: 'Enter your 5-digit postal code.' }) postalCode?: string;
  // Shared with the seller(s) of this order only, for delivery - never in chat.
  @IsString() @MinLength(9) contactPhone: string;
  @IsOptional() @IsIn(['COD']) paymentMethod?: 'COD';
  // "Buy now" checks out just these cart lines; omitted = whole cart.
  @IsOptional() @IsArray() @IsString({ each: true }) cartItemIds?: string[];
}

export class UpdateFulfillmentDto {
  @IsIn(['PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
  status: 'PENDING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
}
