import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { SRI_LANKA_DISTRICTS } from '../../common/seller-access';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  fullName: string;

  @IsEmail()
  email: string;

  // Required: used for delivery (buyers) and business contact (sellers).
  @IsString()
  @Matches(/^\+?\d{9,15}$/, { message: 'Enter a valid mobile number.' })
  phone: string;

  @IsString()
  @MinLength(8)
  password: string;

  // Admins are never self-registered — see `npm run admin:create`.
  @IsOptional()
  @IsIn(['BUYER', 'SELLER'])
  role?: 'BUYER' | 'SELLER';

  @IsString() @MinLength(3) @MaxLength(255) addressLine1: string;
  @IsOptional() @IsString() @MaxLength(255) addressLine2?: string;
  @IsString() @MinLength(2) @MaxLength(100) city: string;
  @IsIn(SRI_LANKA_DISTRICTS, { message: 'Choose a valid district.' }) district: string;
}
