import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaService } from 'src/databases/prisma/prisma.service';
import { PasswordService } from 'src/auth/password.service';
import { RedisService } from 'src/databases/redis/redis.service';

import { AuthModule } from 'src/auth/auth.module';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [AuthModule],
  controllers: [UserController],
  providers: [
    { provide: APP_GUARD, useClass: RolesGuard },
    UserService,
    PasswordService,
    PrismaService,
    RedisService,
  ],
})
export class UserModule {}
