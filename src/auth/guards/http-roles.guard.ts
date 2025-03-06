import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/http-jwt.decorators';

interface IUser {
  id: string;
  role: string;
  iat: number;
  exp: number;
}
interface IExtendedRequest extends Request {
  user: IUser;
  headers: Request['headers'] & { authorization?: string };
}

@Injectable()
export class HttpRolesGuard implements CanActivate {
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

    const request: IExtendedRequest = context.switchToHttp().getRequest();
    const token: string | undefined =
      request.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new ForbiddenException('Token not provided');
    }

    try {
      const user: IUser = this.jwtService.verify(token);
      request.user = user;

      if (!requiredRoles.includes(user.role)) {
        throw new ForbiddenException('Forbidden');
      }
      return true;
    } catch (error) {
      throw new ForbiddenException('Invalid token or insufficient role');
    }
  }
}
