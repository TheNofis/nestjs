import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'http-jwt';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
