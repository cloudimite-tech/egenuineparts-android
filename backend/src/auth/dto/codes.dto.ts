import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class EmailDto {
  @IsEmail() email: string;
}

export class VerifyEmailDto {
  @IsEmail() email: string;
  @IsString() @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code.' }) code: string;
}

export class ResetPasswordDto {
  @IsEmail() email: string;
  @IsString() @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code.' }) code: string;
  @IsString() @MinLength(8, { message: 'Use at least 8 characters.' }) password: string;
}
