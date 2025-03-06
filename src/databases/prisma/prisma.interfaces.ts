import { Room, User } from '@prisma/client';

export type Nullable<T> = T | null;
export type UserWithRooms = User & { rooms: Room[] };
