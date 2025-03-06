import { Socket } from 'socket.io';

export type SocketWithUser = Socket & { user: any };

export enum ChatActionType {
  MESSAGE = 'message',
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
}

export interface IChat<T = ChatActionType, V = object> {
  author: {
    id: string;
    username: string;
    role: string;
  };
  action: {
    type: T;
    content?: V;
  };
  room: {
    id: string;
  };
}

export interface IChatMessage {
  text: string;
}
export type ChatActionMessage = IChat<ChatActionType.MESSAGE, IChatMessage>;
export type ChatActionJoinRoom = IChat<ChatActionType.JOIN_ROOM, object>;
export type ChatActionLeaveRoom = IChat<ChatActionType.LEAVE_ROOM, object>;
