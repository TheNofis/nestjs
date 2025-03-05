import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/jwt.decorators';
import { Socket } from 'socket.io';

interface IUser {
  id: string;
  role: string;
  iat: number;
  exp: number;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles: string[] = this.reflector.get<string[]>(
      ROLES_KEY,
      context.getHandler(),
    );

    if (!requiredRoles) return true;

    const client: Socket = context.switchToWs().getClient();
    const token: string | undefined =
      client.handshake.headers.authorization?.split(' ')[1];

    if (!token) return false;

    try {
      const user: IUser = this.jwtService.verify(token);
      context.switchToWs().getClient().user = user; // Сохраняем пользователя в сокете

      if (!requiredRoles.includes(user.role)) {
        throw new ForbiddenException('Forbidden');
      }
      return true;
    } catch {
      throw new UnauthorizedException('Невалидный токен');
    }
  }
}
