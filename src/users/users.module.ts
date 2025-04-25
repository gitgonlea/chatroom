import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { WhitelistController } from './whitelist.controller';
import { User } from './entities/user.entity';
import { UserRelationship } from './entities/user-relationship.entity';
import { UserBan } from './entities/user-ban.entity';
import { Whitelist } from './entities/whitelist.entity';
import { Power } from './entities/power.entity';
import { UserPower } from './entities/user-power.entity';
import { PowerController } from './power.controller';
import { PowerService } from './power.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserRelationship, UserBan, Whitelist,Power,
      UserPower,]),
  ],
  controllers: [UsersController, WhitelistController, PowerController],
  providers: [UsersService, PowerService],
  exports: [UsersService, PowerService],
})
export class UsersModule {}