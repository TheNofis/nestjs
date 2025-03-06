import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';

import { ChatModule } from './chat/chat.module';

@Module({
  imports: [UserModule, AuthModule, ChatModule],
  controllers: [],
})
export class AppModule {}
