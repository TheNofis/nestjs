import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { Roles } from 'src/chat/decorators/jwt.decorators';
import { UseGuards } from '@nestjs/common';
import { RolesGuard } from './guards/roles.guard';

import { Server } from 'socket.io';

@WebSocketGateway()
@UseGuards(RolesGuard)
export class ChatGateway {
  constructor(private readonly chatService: ChatService) {}

  @WebSocketServer()
  server: Server;

  @SubscribeMessage('sendMessage')
  @Roles('user', 'admin')
  sendMessage(@MessageBody() message: SendMessageDto) {
    return this.chatService.sendMessage(message, this.server);
  }

  @SubscribeMessage('connectToRoom')
  @Roles('user', 'admin')
  connectToRoom(@MessageBody() roomId: string, socket: any) {
    return this.chatService.connectToRoom(roomId, socket);
  }
}
