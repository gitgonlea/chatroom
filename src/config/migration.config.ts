import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Message } from '../chat/entities/message.entity';
import { User } from '../users/entities/user.entity';
import { UserRelationship } from '../users/entities/user-relationship.entity';
import { UserBan } from '../users/entities/user-ban.entity';
import { Whitelist } from '../users/entities/whitelist.entity';
import { Power } from '../users/entities/power.entity';
import { UserPower } from '../users/entities/user-power.entity';

dotenv.config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [Message, User, UserRelationship, UserBan, Whitelist, Power, UserPower],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  ssl: {
    rejectUnauthorized: false
  },
});