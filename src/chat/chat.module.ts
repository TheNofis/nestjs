import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaService } from 'src/databases/prisma/prisma.service';

@Module({
  imports: [AuthModule],
  providers: [PrismaService, ChatGateway, ChatService],
})
export class ChatModule {}
