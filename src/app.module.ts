import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatModule } from './chat/chat.module';
import { Message } from './chat/entities/message.entity';
import { User } from './users/entities/user.entity';
import { UserRelationship } from './users/entities/user-relationship.entity';
import { UserBan } from './users/entities/user-ban.entity';
import { UsersModule } from './users/users.module';
import { validateEnvironment } from './config/environment.validation';
import { AuthModule } from './auth/auth.module';
import { Whitelist } from './users/entities/whitelist.entity';
import { Power } from './users/entities/power.entity';
import { UserPower } from './users/entities/user-power.entity';
import { PowerInitModule } from './power-init.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [Message, User, UserRelationship, UserBan, Whitelist, Power, UserPower],
        synchronize: configService.get<boolean>('DB_SYNCHRONIZE', false),
        logging: configService.get<boolean>('DB_LOGGING', false),
        ssl: { 
          rejectUnauthorized: false // Needed for AWS RDS
        },
        extra: {
          max: 20 // Connection pool max size
        } 
      }),
    }),
    ChatModule,
    UsersModule,
    AuthModule,
    PowerInitModule
  ],
})
export class AppModule {}