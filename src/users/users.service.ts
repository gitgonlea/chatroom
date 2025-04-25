// src/users/users.service.ts
import { Injectable, ConflictException, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { UserRelationship, RelationshipType } from './entities/user-relationship.entity';
import { UserBan } from './entities/user-ban.entity';
import { CreateUserDto } from './dto/create-user-dto';
import { CreateRelationshipDto } from './dto/relationship.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Whitelist } from './entities/whitelist.entity';
import { AddToWhitelistDto, UpdateWhitelistDto } from './dto/whitelist.dto';
import { PowerService } from './power.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserRelationship)
    private relationshipsRepository: Repository<UserRelationship>,
    @InjectRepository(UserBan)
    private banRepository: Repository<UserBan>,
    @InjectRepository(Whitelist)
    private whitelistRepository: Repository<Whitelist>,
    private powerService: PowerService,
  ) {}
/*
  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    // Check if user exists
    const existingUser = await this.usersRepository.findOne({
      where: [
        { username: createUserDto.username },
        { email: createUserDto.email },
      ],
    });

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    // Hash the password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    // Create the user
    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
      role: UserRole.MEMBER, // Set new users as MEMBERS by default
    });

    await this.usersRepository.save(user);

    // Remove password before returning
    const { password, ...result } = user;
    return result;
  }*/

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async getAllUsers(): Promise<User[]> {
    return this.usersRepository.find({
      select: ['id', 'username', 'email', 'role', 'createdAt', 'isActive'] // Exclude password
    });
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    // If trying to update username or email, check for uniqueness
    if (updateData.username && updateData.username !== user.username) {
      const existingUser = await this.findByUsername(updateData.username);
      if (existingUser) {
        throw new ConflictException('Username already exists');
      }
    }
    
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await this.findByEmail(updateData.email);
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }
    
    // If updating password, hash it
    if (updateData.password) {
      const salt = await bcrypt.genSalt();
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }
    
    // Update user
    Object.assign(user, updateData);
    
    return this.usersRepository.save(user);
  }

  async createRelationship(userId: string, relationshipDto: CreateRelationshipDto): Promise<UserRelationship> {
    // Check if users exist
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const relatedUser = await this.findById(relationshipDto.relatedUserId);
    if (!relatedUser) {
      throw new NotFoundException('Related user not found');
    }

    // Check if relationship already exists
    const existingRelationship = await this.relationshipsRepository.findOne({
      where: {
        userId,
        relatedUserId: relationshipDto.relatedUserId,
      },
    });

    if (existingRelationship) {
      // Update the type if it exists
      existingRelationship.type = relationshipDto.type;
      return this.relationshipsRepository.save(existingRelationship);
    }

    // Create new relationship
    const relationship = this.relationshipsRepository.create({
      userId,
      relatedUserId: relationshipDto.relatedUserId,
      type: relationshipDto.type,
    });

    return this.relationshipsRepository.save(relationship);
  }

  async removeRelationship(userId: string, relatedUserId: string): Promise<void> {
    const result = await this.relationshipsRepository.delete({
      userId,
      relatedUserId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Relationship not found');
    }
  }

  async getUserRelationships(userId: string, type?: RelationshipType): Promise<UserRelationship[]> {
    const query = this.relationshipsRepository
      .createQueryBuilder('relationship')
      .leftJoinAndSelect('relationship.relatedUser', 'relatedUser')
      .where('relationship.userId = :userId', { userId });

    if (type) {
      query.andWhere('relationship.type = :type', { type });
    }

    return query.getMany();
  }

  async getFriends(userId: string): Promise<User[]> {
    const relationships = await this.getUserRelationships(userId, RelationshipType.FRIEND);
    
    // Make sure relatedUser is loaded
    const friends = relationships
      .filter(rel => rel.relatedUser) // Filter out any relationships without a loaded user
      .map(rel => {
        // Remove sensitive data
        const { password, ...userData } = rel.relatedUser;
        return userData as User;
      });
    
    return friends;
  }

  async getIgnoredUsers(userId: string): Promise<User[]> {
    const relationships = await this.getUserRelationships(userId, RelationshipType.IGNORED);
    
    // Make sure relatedUser is loaded and remove sensitive data
    const ignoredUsers = relationships
      .filter(rel => rel.relatedUser)
      .map(rel => {
        const { password, ...userData } = rel.relatedUser;
        return userData as User;
      });
    
    return ignoredUsers;
  }

  async isUserIgnored(userId: string, otherUserId: string): Promise<boolean> {
    const relationship = await this.relationshipsRepository.findOne({
      where: {
        userId,
        relatedUserId: otherUserId,
        type: RelationshipType.IGNORED,
      },
    });

    return !!relationship;
  }

  async isFriend(userId: string, otherUserId: string): Promise<boolean> {
    const relationship = await this.relationshipsRepository.findOne({
      where: {
        userId,
        relatedUserId: otherUserId,
        type: RelationshipType.FRIEND,
      },
    });

    return !!relationship;
  }

  async deleteUser(id: string): Promise<void> {
    const result = await this.usersRepository.delete(id);
    
    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
  }

  // New methods for the role system
  async isUserBanned(userId: string): Promise<boolean> {
    const activeBan = await this.banRepository.findOne({
      where: [
        { userId, isPermanent: true, isRevoked: false },
        { userId, isPermanent: false, isRevoked: false, expiresAt: MoreThan(new Date()) }
      ]
    });
    
    return !!activeBan;
  }

  async banUser(bannedById: string, banDto: BanUserDto): Promise<UserBan> {
    // Check if the banner has permission to ban the user
    const banner = await this.findById(bannedById);
    const userToBan = await this.findById(banDto.userId);
    
    if (!banner || !userToBan) {
      throw new NotFoundException('User not found');
    }
    
    // Check if the banner has sufficient permissions
    if (banner.role !== UserRole.MOD && banner.role !== UserRole.OWNER) {
      throw new ForbiddenException('You do not have permission to ban users');
    }
    
    // Mods cannot ban owners or other mods
    if (banner.role === UserRole.MOD && 
       (userToBan.role === UserRole.OWNER || userToBan.role === UserRole.MOD)) {
      throw new ForbiddenException('You cannot ban moderators or owners');
    }
    
    // Only owner can permanently ban
    if (banDto.isPermanent && banner.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only the owner can permanently ban users');
    }
    
    // Create the ban
    const ban = this.banRepository.create({
      userId: banDto.userId,
      bannedById: bannedById,
      reason: banDto.reason,
      isPermanent: banDto.isPermanent || false,
    });
    
    // Set expiration time if not permanent
    if (!ban.isPermanent && banDto.hours) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + banDto.hours);
      ban.expiresAt = expiresAt;
    }
    
    return this.banRepository.save(ban);
  }

  async updateUserRole(updaterId: string, updateRoleDto: UpdateRoleDto): Promise<User> {
    const updater = await this.findById(updaterId);
    const userToUpdate = await this.findById(updateRoleDto.userId);
    
    if (!updater || !userToUpdate) {
      throw new NotFoundException('User not found');
    }
    
    // Only owner can update roles
    if (updater.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only the owner can update user roles');
    }
    
    // Update the role
    userToUpdate.role = updateRoleDto.role;
    
    return this.usersRepository.save(userToUpdate);
  }

  async addToWhitelist(adminId: string, whitelistDto: AddToWhitelistDto): Promise<Whitelist> {
    // Check if the admin has sufficient permissions
    const admin = await this.findById(adminId);
    if (!admin || (admin.role !== UserRole.MOD && admin.role !== UserRole.OWNER)) {
      throw new ForbiddenException('You do not have permission to manage the whitelist');
    }
    
    // Check if email already exists in whitelist
    const existingEntry = await this.whitelistRepository.findOne({
      where: { email: whitelistDto.email }
    });
    
    if (existingEntry) {
      // If deactivated, we can reactivate it
      if (!existingEntry.isActive) {
        existingEntry.isActive = true;
        return this.whitelistRepository.save(existingEntry);
      }
      throw new ConflictException('Email already exists in whitelist');
    }
    
    // Create new whitelist entry
    const whitelist = this.whitelistRepository.create({
      email: whitelistDto.email,
      userId: whitelistDto.userId,
      addedById: adminId,
      isActive: true
    });
    
    return this.whitelistRepository.save(whitelist);
  }
  /*
  async removeFromWhitelist(adminId: string, whitelistId: string): Promise<void> {
    // Check if the admin has sufficient permissions
    const admin = await this.findById(adminId);
    if (!admin || (admin.role !== UserRole.MOD && admin.role !== UserRole.OWNER)) {
      throw new ForbiddenException('You do not have permission to manage the whitelist');
    }
    
    const result = await this.whitelistRepository.update(
      whitelistId,
      { isActive: false }
    );
    
    if (result.affected === 0) {
      throw new NotFoundException('Whitelist entry not found');
    }
  }*/
    async removeFromWhitelist(userId: string, whitelistId: string): Promise<any> {
      // Check permissions
      const user = await this.findById(userId);
      if (!user || (user.role !== UserRole.MOD && user.role !== UserRole.OWNER)) {
        throw new ForbiddenException('You do not have permission to manage the whitelist');
      }
      
      console.log(`Finding whitelist entry with ID: ${whitelistId}`);
      // Check if whitelist entry exists
      const whitelist = await this.whitelistRepository.findOne({ where: { id: whitelistId } });
      if (!whitelist) {
        throw new NotFoundException('Whitelist entry not found');
      }
      
      console.log(`Deleting whitelist entry: ${whitelist.email}`);
      // Delete the entry
      const result = await this.whitelistRepository.delete(whitelistId);
      console.log('Delete result:', result);
      
      if (result.affected === 0) {
        throw new NotFoundException('Whitelist entry not found or could not be deleted');
      }
      
      return { success: true, message: 'Whitelist entry removed' };
    }
  
  async updateWhitelist(adminId: string, whitelistId: string, updateDto: UpdateWhitelistDto): Promise<Whitelist> {
    // Check if the admin has sufficient permissions
    const admin = await this.findById(adminId);
    if (!admin || (admin.role !== UserRole.MOD && admin.role !== UserRole.OWNER)) {
      throw new ForbiddenException('You do not have permission to manage the whitelist');
    }
    
    const whitelist = await this.whitelistRepository.findOne({ where: { id: whitelistId } });
    if (!whitelist) {
      throw new NotFoundException('Whitelist entry not found');
    }
    
    // Update whitelist
    Object.assign(whitelist, updateDto);
    
    return this.whitelistRepository.save(whitelist);
  }
  
  async getWhitelist(adminId: string): Promise<Whitelist[]> {
    // Check if the admin has sufficient permissions
    const admin = await this.findById(adminId);
    if (!admin || (admin.role !== UserRole.MOD && admin.role !== UserRole.OWNER)) {
      throw new ForbiddenException('You do not have permission to view the whitelist');
    }
    
    return this.whitelistRepository.find({
      relations: ['user', 'addedBy']
    });
  }
  
  async isWhitelisted(email: string): Promise<boolean> {
    const whitelist = await this.whitelistRepository.findOne({
      where: {
        email,
        isActive: true
      }
    });
    
    return !!whitelist;
  }
  
  // Override the create method to check whitelist
  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    
    // Check if user exists
    const existingUser = await this.usersRepository.findOne({
      where: [
        { username: createUserDto.username },
        { email: createUserDto.email },
      ],
    });
  
    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }
    
    if (!createUserDto.avatar) {
      createUserDto.avatar = Math.floor(Math.random() * 500 + 1).toString();
    }
    /*// Check if email is whitelisted
    const isWhitelisted = await this.isWhitelisted(createUserDto.email);
    if (!isWhitelisted) {
      throw new ForbiddenException('Your email is not in the whitelist. Please contact an administrator.');
    }*/
  
    // Hash the password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);
  
    // Create the user
    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
      role: UserRole.GUEST, // Set new users as MEMBERS by default
    });
  
    const savedUser = await this.usersRepository.save(user);

    await this.powerService.assignDefaultPower(savedUser.id);
    
    // Update whitelist with user ID if applicable
    const whitelist = await this.whitelistRepository.findOne({
      where: { email: createUserDto.email }
    });
    
    if (whitelist) {
      whitelist.userId = savedUser.id;
      await this.whitelistRepository.save(whitelist);
    }
  
    // Remove password before returning
    const { password, ...result } = savedUser;
    return result;
  }

  async findWhitelistByEmail(email: string): Promise<Whitelist | null> {
    return this.whitelistRepository.findOne({ where: { email } });
  }
  // In users.service.ts
  async updateUsername(userId: string, newUsername: string): Promise<User> {
    // Check if username is already taken
    const existingUser = await this.usersRepository.findOne({
      where: { username: newUsername }
    });
    
    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('Username already exists');
    }
    
    // Use update method instead of save for partial updates
    await this.usersRepository.update(
      { id: userId },
      { username: newUsername }
    );
    
    // Get the updated user
    const updatedUser = await this.usersRepository.findOne({
      where: { id: userId }
    });
    
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
    
    // Remove password before returning
    const { password, ...result } = updatedUser;
    return result as User;
  }

  async updatePawn(userId: string, pawnType: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    // If pawnType is special "everypower" type, verify user has the power
    if (pawnType.startsWith('everypower/')) {
      const hasEverypower = await this.powerService.hasPower(userId, 'everypower');
      if (!hasEverypower) {
        throw new ForbiddenException('You do not have the everypower to use special pawns');
      }
    }
    
    // Update the user's pawn
    user.pawn = pawnType;
    
    // Save to database
    return this.usersRepository.save(user);
  }

  async updateStarPawn(userId: string, showStarPawn: boolean): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    // Update the user's showStarPawn setting
    user.showStarPawn = showStarPawn;
    
    // Save to database
    return this.usersRepository.save(user);
  }

  async updateAvatar(userId: string, avatarId: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    // Update the user's avatar
    user.avatar = avatarId;
    
    // Save to database
    return this.usersRepository.save(user);
  }
}