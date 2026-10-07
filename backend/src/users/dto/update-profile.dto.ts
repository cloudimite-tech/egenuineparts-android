import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { SRI_LANKA_DISTRICTS } from '../../common/seller-access';

export class UpdateProfileDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(255) fullName?: string;
  @IsOptional() @IsString() @Matches(/^\+?\d{9,15}$/, { message: 'Enter a valid mobile number.' }) phone?: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(255) addressLine1?: string;
  @IsOptional() @IsString() @MaxLength(255) addressLine2?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) city?: string;
  @IsOptional() @IsIn(SRI_LANKA_DISTRICTS, { message: 'Choose a valid district.' }) district?: string;
}
