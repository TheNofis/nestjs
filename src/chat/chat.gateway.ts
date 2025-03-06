import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { Roles } from 'src/auth/decorators/websocket-jwt.decorators';
import { UseGuards } from '@nestjs/common';
import { WebSocketRolesGuard } from 'src/auth/guards/websocket-roles.guard';

import { Server } from 'socket.io';

import { SocketWithUser } from './chat.interfaces';
import { CreateRoomDto } from './dto/create-room.dto';
import { ConnectRoomDto } from './dto/connect-room.dto';

@WebSocketGateway()
@UseGuards(WebSocketRolesGuard)
export class ChatGateway implements OnGatewayConnection {
  constructor(private readonly chatService: ChatService) {}

  @WebSocketServer()
  server: Server;

  @Roles('user', 'admin')
  handleConnection(client: SocketWithUser) {
    return this.chatService.handleConnection(client);
  }

  @Roles('user', 'admin')
  @SubscribeMessage('sendMessage')
  sendMessage(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() message: SendMessageDto,
  ) {
    return this.chatService.sendMessage(client, message);
  }

  @Roles('user', 'admin')
  @SubscribeMessage('createRoom')
  createRoom(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() dto: CreateRoomDto,
  ) {
    return this.chatService.createRoom(dto, client);
  }

  @Roles('user', 'admin')
  @SubscribeMessage('connectToRoom')
  connectToRoom(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() dto: ConnectRoomDto,
  ) {
    return this.chatService.connectToRoom(dto, client);
  }

  @Roles('user', 'admin')
  @SubscribeMessage('disconnectFromRoom')
  disconnectFromRoom(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() dto: ConnectRoomDto,
  ) {
    return this.chatService.disconnectFromRoom(dto, client);
  }
}
