import { IsString, MaxLength, MinLength } from 'class-validator';

export class StartConversationDto {
  @IsString() productId: string;
}

export class SendMessageDto {
  @IsString() @MinLength(1) @MaxLength(2000) body: string;
}
