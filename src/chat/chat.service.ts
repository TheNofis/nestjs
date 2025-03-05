import { Injectable } from '@nestjs/common';
import { SendMessageDto } from './dto/send-message.dto';
import { Server } from 'socket.io';

@Injectable()
export class ChatService {
  sendMessage(message: SendMessageDto, server: Server) {
    server.emit('message', message);
    return 'This action adds a new chat';
  }
  connectToRoom(roomId: string, socket: any) {
    socket.emit('joinRoom', roomId);
  }
}
