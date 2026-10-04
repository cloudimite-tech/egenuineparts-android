import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { JwtUser } from '../common/decorators/current-user.decorator';

@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  constructor(
    private readonly chat: ChatService,
    private readonly jwt: JwtService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers.authorization?.replace('Bearer ', '') ?? '');
      const payload = this.jwt.verify<JwtUser>(token);
      if (payload.role === 'GUEST') {
        client.emit('chat_error', { message: 'Sign in to use chat.' });
        client.disconnect();
        return;
      }
      client.data.user = payload;
      // Personal room: inbox/badge updates reach the user on any screen.
      client.join(`user:${payload.sub}`);
    } catch {
      client.emit('chat_error', { message: 'Authentication failed.' });
      client.disconnect();
    }
  }

  broadcast(conversationId: string, message: any, recipients: string[]) {
    this.server.to(`conversation:${conversationId}`).emit('new_message', { conversationId, message });
    for (const userId of recipients) {
      this.server.to(`user:${userId}`).emit('inbox_updated', { conversationId });
    }
  }

  @SubscribeMessage('join_conversation')
  async onJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    const user: JwtUser | undefined = client.data.user;
    if (!user) return;
    try {
      await this.chat.assertParticipant(user.sub, data.conversationId);
      client.join(`conversation:${data.conversationId}`);
    } catch (err: any) {
      client.emit('chat_error', { message: err.message ?? 'Could not join conversation.' });
    }
  }

  @SubscribeMessage('leave_conversation')
  onLeave(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    client.leave(`conversation:${data.conversationId}`);
  }

  @SubscribeMessage('send_message')
  async onSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; body: string; clientId?: string },
  ) {
    const user: JwtUser | undefined = client.data.user;
    if (!user) return;
    try {
      const result = await this.chat.postMessage(user.sub, data.conversationId, data.body);
      if (result.blocked) {
        // Only the sender is told — the other party never sees the attempt.
        client.emit('message_blocked', {
          conversationId: data.conversationId,
          clientId: data.clientId,
          reason: result.reason,
        });
        return;
      }
      this.broadcast(data.conversationId, { ...result.message, clientId: data.clientId }, result.recipients);
    } catch (err: any) {
      client.emit('chat_error', { message: err.message ?? 'Message failed.' });
    }
  }
}
