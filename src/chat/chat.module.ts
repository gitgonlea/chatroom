// src/chat/chat.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { Message } from './entities/message.entity';
import { UsersModule } from '../users/users.module';
import { UserRelationship } from '../users/entities/user-relationship.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, UserRelationship]),
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'your-secret-key'),
        signOptions: { expiresIn: '24h' },
      }),
    }),
  ],
  providers: [ChatGateway, ChatService],
})
export class ChatModule {}