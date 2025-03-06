import { FastifyRequest } from 'fastify';

export interface RequestUser {
  id: string;
  role: string;
  iat: number;
  exp: number;
}

export interface RequestWithUser extends FastifyRequest {
  user: {
    id: string;
    role: string;
    iat: number;
    exp: number;
  };
}
