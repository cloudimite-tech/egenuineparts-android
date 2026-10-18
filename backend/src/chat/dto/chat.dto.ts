import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class StartConversationDto {
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsString() serviceId?: string;
}

export class SendMessageDto {
  @IsString() @MinLength(1) @MaxLength(2000) body: string;
}
