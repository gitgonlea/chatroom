import { 
    Controller, 
    Get, 
    Post, 
    Patch, 
    Delete, 
    Body, 
    Param, 
    UseGuards, 
    Request,
    HttpCode,
    HttpStatus,
    ForbiddenException,
    NotFoundException
  } from '@nestjs/common';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards';
  import { UsersService } from './users.service';
  import { AddToWhitelistDto, UpdateWhitelistDto } from './dto/whitelist.dto';
  import { UserRole } from '../users/entities/user.entity';

  @Controller('whitelist')
  @UseGuards(JwtAuthGuard)
  export class WhitelistController {
    constructor(private readonly usersService: UsersService) {}
  
    @Get()
    async getWhitelist(@Request() req) {
      return this.usersService.getWhitelist(req.user.userId);
    }
  
    @Post()
    async addToWhitelist(
      @Request() req,
      @Body() addToWhitelistDto: AddToWhitelistDto,
    ) {
      return this.usersService.addToWhitelist(req.user.userId, addToWhitelistDto);
    }
  
    @Patch(':id')
    async updateWhitelist(
      @Request() req,
      @Param('id') whitelistId: string,
      @Body() updateWhitelistDto: UpdateWhitelistDto,
    ) {
      return this.usersService.updateWhitelist(
        req.user.userId,
        whitelistId,
        updateWhitelistDto,
      );
    }
  
    @Delete(':id')
    async removeFromWhitelist(
      @Request() req,
      @Param('id') whitelistId: string,
    ) { 
      try {
        console.log(`Removing whitelist entry ${whitelistId} by user ${req.user.userId}`);
        const result = await this.usersService.removeFromWhitelist(req.user.userId, whitelistId);
        console.log('Result:', result);
        return result || { success: true, message: 'Entry removed' };
      } catch (error) {
        console.error('Error removing whitelist entry:', error);
        throw error;
      }
    }
    @Post('check')
    @HttpCode(HttpStatus.OK)
    async checkWhitelist(@Body() { email }: { email: string }) {
      const isWhitelisted = await this.usersService.isWhitelisted(email);
      return { isWhitelisted };
    }

// Endpoint to whitelist a user by ID - useful for the admin panel
@UseGuards(JwtAuthGuard)
@Post('user/:id')
async whitelistUser(
  @Request() req,
  @Param('id') userId: string
) {
  // First check if the admin user has permission
  const adminUser = await this.usersService.findById(req.user.userId);
  if (!adminUser || (adminUser.role !== UserRole.MOD && adminUser.role !== UserRole.OWNER)) {
    throw new ForbiddenException('You do not have permission to manage the whitelist');
  }
  
  // Find the user to whitelist
  const userToWhitelist = await this.usersService.findById(userId);
  if (!userToWhitelist) {
    throw new NotFoundException('User not found');
  }
  
  // Don't need to whitelist admins
  if (userToWhitelist.role === UserRole.MOD || userToWhitelist.role === UserRole.OWNER) {
    return { message: 'Admins and moderators have access by default' };
  }
  
  // Add their email to the whitelist
  return this.usersService.addToWhitelist(
    req.user.userId, 
    { email: userToWhitelist.email }
  );
}

// Endpoint to remove a user from whitelist by ID
@UseGuards(JwtAuthGuard)
@Delete('user/:id')
async unwhitelistUser(
  @Request() req,
  @Param('id') userId: string
) {
  // First check if the admin user has permission
  const adminUser = await this.usersService.findById(req.user.userId);
  if (!adminUser || (adminUser.role !== UserRole.MOD && adminUser.role !== UserRole.OWNER)) {
    throw new ForbiddenException('You do not have permission to manage the whitelist');
  }
  
  // Find the user to remove from whitelist
  const userToUnwhitelist = await this.usersService.findById(userId);
  if (!userToUnwhitelist) {
    throw new NotFoundException('User not found');
  }
  
  // Don't need to unwhitelist admins
  if (userToUnwhitelist.role === UserRole.MOD || userToUnwhitelist.role === UserRole.OWNER) {
    return { message: 'Admins and moderators have access by default' };
  }
  
  // Find whitelist entry for this user's email
  const whitelist = await this.usersService.findWhitelistByEmail(userToUnwhitelist.email);
  if (!whitelist) {
    throw new NotFoundException('User is not in the whitelist');
  }
  
  // Remove from whitelist
  await this.usersService.removeFromWhitelist(req.user.userId, whitelist.id);
  return { message: 'User removed from whitelist' };
}
  }