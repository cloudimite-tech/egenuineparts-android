import { IsInt, IsString, Min } from 'class-validator';

export class AddCartItemDto {
  @IsString() productId: string;
  @IsInt() @Min(1) quantity: number;
}

export class UpdateCartItemDto {
  @IsInt() @Min(0) quantity: number;
}
