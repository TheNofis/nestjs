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
import { RedisService } from 'src/databases/redis/redis.service';

import { Socket } from 'socket.io';

@Injectable()
export class ChatService {
  private responseModule: ResponseModule;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {
    this.responseModule = new ResponseModule();
  }

  async handleConnection(client: Socket) {
    const header: SocketWithUser['handshake']['headers'] =
      client.handshake.headers;
    if (!header.authorization) return;

    const userId: string = JSON.parse(
      atob(header.authorization.split(' ')[1].split('.')[1]),
    ).id;

    const user: Nullable<UserWithRooms> = await this.redisService.getCachedData(
      `user-rooms:${userId}`,
      async () =>
        await this.prisma.user.findFirst({
          where: { id: userId },
          include: { rooms: true },
        }),
    );
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
      user as UserWithRooms,
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
    const room: Room = await this.prisma.room.create({
      data: { name: dto.roomName },
    });
    client.emit('createdRoom', room.id);
  }

  async connectToRoom(dto: ConnectRoomDto, client: SocketWithUser) {
    if (!dto.roomId) return;
    this.responseModule.start();

    const user: Nullable<UserWithRooms> = await this.redisService.getCachedData(
      `user-rooms:${client.user.id}`,
      async () =>
        await this.prisma.user.findFirst({
          where: { id: client.user.id },
          include: { rooms: true },
        }),
    );

    if (user === null)
      return client.emit('error', this.responseModule.error('User not found'));

    if (this.UserInRoom(user, dto.roomId))
      return client.emit(
        'error',
        this.responseModule.error('User already in room'),
      );

    const updatedUser: UserWithRooms = await this.prisma.user.update({
      where: { id: client.user.id },
      data: { rooms: { connect: { id: dto.roomId } } },
      include: { rooms: true },
    });

    await this.redisService.set(
      `user-rooms:${client.user.id}`,
      JSON.stringify(updatedUser),
    );

    const payload: ChatActionJoinRoom = this.CreatePayload(
      ChatActionType.JOIN_ROOM,
      dto.roomId,
      updatedUser,
    );

    client.join(dto.roomId);
    client
      .to(dto.roomId)
      .emit('joinedRoom', this.responseModule.success(payload));
  }

  async disconnectFromRoom(dto: ConnectRoomDto, client: SocketWithUser) {
    if (!dto.roomId) return;
    this.responseModule.start();

    const user: Nullable<UserWithRooms> = await this.redisService.getCachedData(
      `user-rooms:${client.user.id}`,
      async () =>
        await this.prisma.user.findFirst({
          where: { id: client.user.id },
          include: { rooms: true },
        }),
    );

    if (!this.UserInRoom(user, dto.roomId))
      return client.emit(
        'error',
        this.responseModule.error('User not in room'),
      );

    const updatedUser: UserWithRooms = await this.prisma.user.update({
      where: { id: client.user.id },
      data: { rooms: { disconnect: { id: dto.roomId } } },
      include: { rooms: true },
    });
    await this.redisService.set(
      `user-rooms:${client.user.id}`,
      JSON.stringify(updatedUser),
    );

    const payload: ChatActionLeaveRoom = this.CreatePayload(
      ChatActionType.LEAVE_ROOM,
      dto.roomId,
      updatedUser,
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
    user: UserWithRooms,
    content?: V,
  ): IChat<T, V> {
    return {
      author: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
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
