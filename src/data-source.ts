// src/data-source.ts
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from './users/entities/user.entity';
import { UserRelationship } from './users/entities/user-relationship.entity';
import { UserBan } from './users/entities/user-ban.entity';
import { Whitelist } from './users/entities/whitelist.entity';
import { Message } from './chat/entities/message.entity';
import { Power } from './users/entities/power.entity';
import { UserPower } from './users/entities/user-power.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [User, UserRelationship, UserBan, Whitelist, Message, Power, UserPower],
  migrations: ['src/migrations/*.ts'],  // This will find all migration files
  synchronize: false,
  ssl: {
    rejectUnauthorized: false
  },
  logging: true,  // Enable logging to see what's happening
});