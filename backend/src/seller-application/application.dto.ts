import { IsIn, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { SRI_LANKA_DISTRICTS } from '../common/seller-access';

export class SellerApplicationDto {
  // Shown to buyers
  @IsString() @MinLength(2) @MaxLength(120) storeName: string;
  @IsOptional() @IsString() @MaxLength(1000) bio?: string;
  @IsOptional() @IsString() @MaxLength(255) returnsPolicy?: string;

  // Owner identity — Sri Lankan NIC: old (123456789V) or new (200012345678)
  @IsString() @Matches(/^(\d{9}[VvXx]|\d{12})$/, { message: 'Enter a valid NIC number (e.g. 912345678V or 199112345678).' })
  nicNumber: string;
  @IsString() nicFrontDocumentId: string;
  @IsString() nicBackDocumentId: string;

  // Business registration
  @IsString() @MinLength(2) @MaxLength(255) businessName: string;
  @IsString() @MinLength(3) @MaxLength(64) brNumber: string;
  @IsString() documentId: string; // BR certificate

  // Business address + map pin
  @IsString() @MinLength(3) @MaxLength(255) addressLine1: string;
  @IsOptional() @IsString() @MaxLength(255) addressLine2?: string;
  @IsString() @MinLength(2) @MaxLength(100) city: string;
  @IsIn(SRI_LANKA_DISTRICTS, { message: 'Choose a valid district.' }) district: string;
  @IsString() @Matches(/^\+?\d{9,15}$/, { message: 'Enter a valid business phone number.' }) contactPhone: string;
  @Type(() => Number) @IsNumber() @IsLatitude() latitude: number;
  @Type(() => Number) @IsNumber() @IsLongitude() longitude: number;

  // Selfie of the owner at the shop / warehouse
  @IsString() selfieDocumentId: string;
}

export class UploadDocumentDto {
  @IsOptional() @IsIn(['BR', 'NIC_FRONT', 'NIC_BACK', 'SELFIE']) kind?: 'BR' | 'NIC_FRONT' | 'NIC_BACK' | 'SELFIE';
  @IsOptional() @Type(() => Number) @IsNumber() @IsLatitude() lat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @IsLongitude() lng?: number;
}

// Rough bounding box of Sri Lanka (incl. islands) for sanity-checking pins.
export const inSriLanka = (lat: number, lng: number) => lat >= 5.7 && lat <= 10.1 && lng >= 79.4 && lng <= 82.1;
