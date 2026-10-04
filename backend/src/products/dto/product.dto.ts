import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class FitmentDto {
  @IsString() make: string;
  @IsString() model: string;
  @IsInt() yearFrom: number;
  @IsInt() yearTo: number;
}

export class CreateProductDto {
  @IsString() @MinLength(1) brand: string;
  @IsString() @MinLength(3) title: string;
  @IsOptional() @IsString() partNumber?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(['LKR', 'USD']) currency?: 'LKR' | 'USD';
  @IsNumber() @Min(0.01) price: number;
  @IsOptional() @IsNumber() compareAtPrice?: number | null;
  @IsOptional() @IsInt() @Min(0) stock?: number;
  @IsOptional() @IsIn(['NEW', 'USED', 'REFURBISHED']) condition?: 'NEW' | 'USED' | 'REFURBISHED';
  @IsOptional() @IsInt() warrantyMonths?: number | null;
  @IsOptional() @IsString() categoryId?: string | null;
  // Timed sale. Both set = on sale until saleEndsAt; null/omitted = no sale.
  @IsOptional() @IsNumber() salePrice?: number | null;
  @IsOptional() @IsDateString() saleEndsAt?: string | null;
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FitmentDto)
  fitments?: FitmentDto[];
}

export class UpdateProductDto extends CreateProductDto {}

export class ProductQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() categoryId?: string;
  // Comma-separated list, e.g. "Brembo,TRW"
  @IsOptional() @IsString() brands?: string;
  @IsOptional() @Type(() => Number) @IsNumber() minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxPrice?: number;
  @IsOptional() @IsString() make?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @Type(() => Number) @IsInt() year?: number;
  @IsOptional() @IsIn(['best_match', 'price_asc', 'price_desc', 'newest', 'rating']) sort?: string;
  @IsOptional() @IsString() storeId?: string;
  @IsOptional() @IsIn(['true', 'false']) onSale?: string;
}

export class CreateReviewDto {
  @IsInt() @Min(1) @Max(5) rating: number;
  @IsOptional() @IsString() @MaxLength(1000) comment?: string;
}
