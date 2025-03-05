import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';

import { ChatModule } from './chat/chat.module';
import { ChatsModule } from './chats/chats.module';

@Module({
  imports: [UserModule, AuthModule, ChatModule, ChatsModule],
  controllers: [],
})
export class AppModule {}
