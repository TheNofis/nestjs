import { Module } from '@nestjs/common';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { JwtModule } from '@nestjs/jwt';

import { PrismaService } from 'src/prisma.service';
import { PasswordService } from 'src/auth/password.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, PrismaService, PasswordService],
  imports: [
    JwtModule.register({
      secret: 'your-secret-key',
      signOptions: {
        expiresIn: '1h', // Время жизни токена
      },
    }),
  ],
  exports: [JwtModule],
})
export class AuthModule {}
