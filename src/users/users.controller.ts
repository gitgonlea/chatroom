// src/users/users.controller.ts
import { Controller, Post, Get, Delete, Body, Param, UseGuards, Request, HttpCode, HttpStatus, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user-dto';
import { CreateRelationshipDto } from './dto/relationship.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards';
import { RelationshipType } from './entities/user-relationship.entity';
import { UserRole } from '../users/entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req) {
    return this.usersService.findById(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('friends')
  async getFriends(@Request() req) {
    return this.usersService.getFriends(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('ignored')
  async getIgnoredUsers(@Request() req) {
    return this.usersService.getIgnoredUsers(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('relationships')
  async createRelationship(
    @Request() req,
    @Body() createRelationshipDto: CreateRelationshipDto,
  ) {
    return this.usersService.createRelationship(
      req.user.userId,
      createRelationshipDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('relationships/:relatedUserId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRelationship(
    @Request() req,
    @Param('relatedUserId') relatedUserId: string,
  ) {
    return this.usersService.removeRelationship(
      req.user.userId,
      relatedUserId,
    );
  }

  // Helper shortcuts for common operations
  @UseGuards(JwtAuthGuard)
  @Post('friends/:userId')
  async addFriend(
    @Request() req,
    @Param('userId') relatedUserId: string,
  ) {
    return this.usersService.createRelationship(
      req.user.userId,
      { relatedUserId, type: RelationshipType.FRIEND },
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('ignore/:userId')
  async ignoreUser(
    @Request() req,
    @Param('userId') relatedUserId: string,
  ) {
    return this.usersService.createRelationship(
      req.user.userId,
      { relatedUserId, type: RelationshipType.IGNORED },
    );
  }

  // New endpoints for the role system
  @UseGuards(JwtAuthGuard)
  @Post('ban')
  async banUser(
    @Request() req,
    @Body() banUserDto: BanUserDto,
  ) {
    return this.usersService.banUser(req.user.userId, banUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('role')
  async updateUserRole(
    @Request() req,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.usersService.updateUserRole(req.user.userId, updateRoleDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllUsers(@Request() req) {
    // Check if user is admin or mod
    const user = await this.usersService.findById(req.user.userId);
    if (!user || (user.role !== UserRole.MOD && user.role !== UserRole.OWNER)) {
      throw new ForbiddenException('You do not have permission to view all users');
    }
    
    return this.usersService.getAllUsers();
  }
  @UseGuards(JwtAuthGuard)
@Post('update-username')
async updateUsername(@Request() req, @Body() body: { newUsername: string }) {
  const userId = req.user.userId;
  const { newUsername } = body;
  
  return this.usersService.updateUsername(userId, newUsername);
}

@UseGuards(JwtAuthGuard)
@Post('update-star-pawn')
async updateStarPawn(@Request() req, @Body() body: { showStarPawn: boolean }) {
  const userId = req.user.userId;
  const { showStarPawn } = body;
  
  return this.usersService.updateStarPawn(userId, showStarPawn);
}

@UseGuards(JwtAuthGuard)
@Post('update-avatar')
async updateAvatar(@Request() req, @Body() body: { avatarId: string }) {
  const userId = req.user.userId;
  const { avatarId } = body;
  
  return this.usersService.updateAvatar(userId, avatarId);
}
@UseGuards(JwtAuthGuard)
@Post('update-pawn')
async updatePawn(@Request() req, @Body() body: { pawnType: string }) {
  const userId = req.user.userId;
  const { pawnType } = body;
  
  return this.usersService.updatePawn(userId, pawnType);
}
}