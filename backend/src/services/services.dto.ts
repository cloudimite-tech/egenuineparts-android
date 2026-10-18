import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength,
} from 'class-validator';

export class ServiceDto {
  @IsString() typeId: string;
  @IsString() @MinLength(3) @MaxLength(150) title: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string | null;
  @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) priceFrom?: number | null;
  @IsOptional() @IsNumber() @Min(0) @Max(100_000_000) priceTo?: number | null;
  @IsOptional() @IsInt() @Min(5) @Max(60 * 24 * 14) durationMinutes?: number | null;
  @IsOptional() @IsArray() @ArrayMaxSize(6) @IsString({ each: true }) images?: string[];
}

export class ServiceQueryDto {
  @IsOptional() @IsString() @MaxLength(120) type?: string; // service type slug
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsString() @MaxLength(60) district?: string;
  @IsOptional() @IsString() @MaxLength(255) store?: string; // store slug
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

export class ServiceTypeRequestDto {
  @IsString() @MinLength(3) @MaxLength(100) name: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class AppointmentRequestDto {
  @IsDateString() scheduledAt: string;
  @IsOptional() @IsString() @MaxLength(120) vehicle?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class AppointmentReplyDto {
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class AppointmentListQuery {
  @IsOptional() @IsIn(['buyer', 'seller']) as?: 'buyer' | 'seller';
}

// ---- admin ----
export class AdminServiceTypeDto {
  @IsString() @MinLength(2) @MaxLength(100) name: string;
  @IsOptional() @IsString() @MaxLength(50) icon?: string;
  @IsOptional() @IsString() @MaxLength(255) description?: string;
}

export class AdminServiceTypeUpdateDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(50) icon?: string;
  @IsOptional() @IsString() @MaxLength(255) description?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(1000) sortOrder?: number;
}

export class AdminRequestApproveDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(50) icon?: string;
  @IsOptional() @IsString() @MaxLength(255) description?: string;
  @IsOptional() @IsString() existingTypeId?: string; // map the request onto a type that already exists
}

export class AdminRequestDeclineDto {
  @IsString() @MinLength(3) @MaxLength(500) note: string;
}

export class RequestListQuery {
  @IsOptional() @IsIn(['PENDING', 'APPROVED', 'DECLINED']) status?: 'PENDING' | 'APPROVED' | 'DECLINED';
}
