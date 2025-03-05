import { Request } from 'express';

export interface RequestUser {
  id: string;
  role: string;
  iat: number;
  exp: number;
}

export interface RequestWithUser extends Request {
  user: {
    id: string;
    role: string;
    iat: number;
    exp: number;
  };
}
