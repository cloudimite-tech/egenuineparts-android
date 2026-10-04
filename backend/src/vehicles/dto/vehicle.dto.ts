import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateVehicleDto {
  @IsString() make: string;
  @IsString() model: string;
  @IsInt() @Min(1980) @Max(2100) year: number;
  @IsOptional() @IsString() engine?: string;
  @IsOptional() @IsString() chassisCode?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}
