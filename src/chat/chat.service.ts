import { Injectable } from '@nestjs/common';
import { SendMessageDto } from './dto/send-message.dto';
import { PrismaService } from 'src/databases/prisma/prisma.service';
import { Nullable } from 'src/databases/prisma/prisma.interfaces';
import { Room } from '@prisma/client';

import {
  ChatActionJoinRoom,
  ChatActionLeaveRoom,
  ChatActionMessage,
  ChatActionType,
  IChat,
  SocketWithUser,
} from './chat.interfaces';
import { CreateRoomDto } from './dto/create-room.dto';
import { ConnectRoomDto } from './dto/connect-room.dto';
import ResponseModule from 'src/response.module';

import { UserWithRooms } from 'src/databases/prisma/prisma.interfaces';

@Injectable()
export class ChatService {
  private responseModule: ResponseModule;

  constructor(private readonly prisma: PrismaService) {
    this.responseModule = new ResponseModule();
  }

  async handleConnection(client: SocketWithUser) {
    const header: SocketWithUser['handshake']['headers'] =
      client.handshake.headers;
    if (!header.authorization) return;

    const userId: string = JSON.parse(
      atob(header.authorization.split(' ')[1].split('.')[1]),
    ).id;

    const user: Nullable<UserWithRooms> = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { rooms: true },
    });
    if (user === null || user.rooms.length < 1) return;

    user.rooms.forEach((room: Room) => {
      client.join(room.id);
    });
  }

  async sendMessage(client: SocketWithUser, message: SendMessageDto) {
    this.responseModule.start();

    const user: Nullable<UserWithRooms> = await this.prisma.user.findUnique({
      where: { id: client.user.id },
      include: { rooms: true },
    });

    if (!this.UserInRoom(user, message.roomId))
      return client.emit(
        'error',
        this.responseModule.error('You are not in this room'),
      );

    const payload: ChatActionMessage = this.CreatePayload(
      ChatActionType.MESSAGE,
      message.roomId,
      client,
      {
        text: message.text,
      },
    );

    client
      .to(message.roomId)
      .emit('message', this.responseModule.success(payload));
  }

  async createRoom(dto: CreateRoomDto, client: SocketWithUser) {
    if (!dto.roomName) return;
    const room = await this.prisma.room.create({
      data: { name: dto.roomName },
    });
    client.emit('createdRoom', room.id);
  }

  async connectToRoom(dto: ConnectRoomDto, client: SocketWithUser) {
    if (!dto.roomId) return;
    this.responseModule.start();

    const user: Nullable<UserWithRooms> = await this.prisma.user.findFirst({
      where: { id: client.user.id },
      include: { rooms: true },
    });
    if (user === null)
      return client.emit('error', this.responseModule.error('User not found'));

    if (this.UserInRoom(user, dto.roomId))
      return client.emit(
        'error',
        this.responseModule.error('User already in room'),
      );

    await this.prisma.user.update({
      where: { id: client.user.id },
      data: { rooms: { connect: { id: dto.roomId } } },
    });

    const payload: ChatActionJoinRoom = this.CreatePayload(
      ChatActionType.JOIN_ROOM,
      dto.roomId,
      client,
    );

    client.join(dto.roomId);
    client
      .to(dto.roomId)
      .emit('joinedRoom', this.responseModule.success(payload));
  }

  async disconnectFromRoom(dto: ConnectRoomDto, client: SocketWithUser) {
    if (!dto.roomId) return;
    this.responseModule.start();

    const user: Nullable<UserWithRooms> = await this.prisma.user.findFirst({
      where: { id: client.user.id },
      include: { rooms: true },
    });

    if (!this.UserInRoom(user, dto.roomId))
      return client.emit(
        'error',
        this.responseModule.error('User not in room'),
      );

    await this.prisma.user.update({
      where: { id: client.user.id },
      data: { rooms: { disconnect: { id: dto.roomId } } },
    });

    const payload: ChatActionLeaveRoom = this.CreatePayload(
      ChatActionType.LEAVE_ROOM,
      dto.roomId,
      client,
    );

    client
      .to(dto.roomId)
      .emit('leftRoom', this.responseModule.success(payload));
    client.leave(dto.roomId);
  }

  public UserInRoom(user: Nullable<UserWithRooms>, roomId: string): boolean {
    if (user === null) return false;
    return user.rooms.some((room: Room) => room.id === roomId);
  }

  private CreatePayload<T, V>(
    type: T,
    roomId: string,
    client: SocketWithUser,
    content?: V,
  ): IChat<T, V> {
    return {
      author: {
        id: client.user.id,
        username: client.user.username,
        role: client.user.role,
      },
      action: {
        type,
        content,
      },
      room: {
        id: roomId,
      },
    };
  }
}
