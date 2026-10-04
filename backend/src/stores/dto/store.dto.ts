import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateStoreDto {
  @IsString() @MinLength(2) name: string;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() shipsFrom?: string;
  @IsOptional() @IsString() returnsPolicy?: string;
}

export class UpdateStoreDto extends CreateStoreDto {}
