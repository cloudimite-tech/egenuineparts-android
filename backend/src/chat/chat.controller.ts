import { BadRequestException, Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NoGuestGuard } from '../common/guards/no-guest.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { SendMessageDto, StartConversationDto } from './dto/chat.dto';

// Chatting requires a real account (NoGuestGuard) - a guest tapping
// "Chat with seller" is sent to sign in first, same as cart/checkout.
@Controller('chat')
@UseGuards(JwtAuthGuard, NoGuestGuard)
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly gateway: ChatGateway,
  ) {}

  @Get('conversations')
  list(@CurrentUser() user: JwtUser) {
    return this.chat.listForUser(user.sub);
  }

  @Get('unread')
  unread(@CurrentUser() user: JwtUser) {
    return this.chat.unreadTotal(user.sub);
  }

  @Post('conversations')
  start(@CurrentUser() user: JwtUser, @Body() dto: StartConversationDto) {
    if (dto.serviceId) return this.chat.startOrGetServiceConversation(user.sub, dto.serviceId);
    if (!dto.productId) throw new BadRequestException('Choose a product or service to chat about.');
    return this.chat.startOrGetConversation(user.sub, dto.productId);
  }

  @Get('conversations/:id')
  get(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.chat.get(user.sub, id);
  }

  @Get('conversations/:id/messages')
  messages(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.chat.listMessages(user.sub, id);
  }

  @Post('conversations/:id/read')
  read(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.chat.markRead(user.sub, id);
  }

  @Post('conversations/:id/block')
  block(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.chat.setBlock(user.sub, id, true);
  }

  @Delete('conversations/:id/block')
  unblock(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.chat.setBlock(user.sub, id, false);
  }

  // REST fallback - same service method as the websocket path, so the
  // contact-info filter applies identically.
  @Post('conversations/:id/messages')
  async send(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: SendMessageDto) {
    const result = await this.chat.postMessage(user.sub, id, dto.body);
    if (!result.blocked) this.gateway.broadcast(id, result.message, result.recipients);
    return result.blocked ? result : { blocked: false, message: result.message };
  }
}
