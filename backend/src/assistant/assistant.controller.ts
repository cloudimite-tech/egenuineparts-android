import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { AssistantService } from './assistant.service';

class VehicleDto {
  @IsString() make: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsInt() year?: number;
}

class AssistantMessageDto {
  @IsString() @MaxLength(500) message: string;
  @IsOptional() @ValidateNested() @Type(() => VehicleDto) vehicle?: VehicleDto;
}

// Guests can use the assistant too (every app session has at least a guest token).
@Controller('assistant')
@UseGuards(JwtAuthGuard)
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Post()
  message(@CurrentUser() user: JwtUser, @Body() dto: AssistantMessageDto) {
    const v = dto.vehicle ? { ...dto.vehicle, make: dto.vehicle.make.toLowerCase(), model: dto.vehicle.model?.toLowerCase() } : undefined;
    return this.assistant.handle(user, dto.message, v);
  }
}
