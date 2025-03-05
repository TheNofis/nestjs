import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestUser } from '../user.interfaces';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // Возвращаем только user
  },
);
