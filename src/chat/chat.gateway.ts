import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { Roles } from 'src/auth/decorators/websocket-jwt.decorators';
import { UseGuards } from '@nestjs/common';
import { WebSocketRolesGuard } from 'src/auth/guards/websocket-roles.guard';

import { Server } from 'socket.io';

@Roles('user', 'admin')
@WebSocketGateway()
@UseGuards(WebSocketRolesGuard)
export class ChatGateway {
  constructor(private readonly chatService: ChatService) {}

  @WebSocketServer()
  server: Server;

  @SubscribeMessage('sendMessage')
  sendMessage(@MessageBody() message: SendMessageDto) {
    return this.chatService.sendMessage(message, this.server);
  }

  @SubscribeMessage('connectToRoom')
  connectToRoom(@MessageBody() roomId: string, socket: any) {
    return this.chatService.connectToRoom(roomId, socket);
  }
}
