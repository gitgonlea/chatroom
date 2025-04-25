// src/users/power.service.ts
import { Injectable, ConflictException, NotFoundException, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Power } from './entities/power.entity';
import { UserPower } from './entities/user-power.entity';
import { CreatePowerDto, AssignPowerDto, RemovePowerDto } from './dto/power.dto';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class PowerService {
  private readonly logger = new Logger(PowerService.name);

  constructor(
    @InjectRepository(Power)
    private powersRepository: Repository<Power>,
    @InjectRepository(UserPower)
    private userPowersRepository: Repository<UserPower>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async createPower(createPowerDto: CreatePowerDto): Promise<Power> {
    // Check if power with same name already exists
    const existingPower = await this.powersRepository.findOne({
      where: { name: createPowerDto.name }
    });

    if (existingPower) {
      throw new ConflictException(`Power with name ${createPowerDto.name} already exists`);
    }

    const power = this.powersRepository.create(createPowerDto);
    return this.powersRepository.save(power);
  }

  async assignPower(adminId: string, assignPowerDto: AssignPowerDto): Promise<UserPower> {
    // Check if admin has permissions
    const admin = await this.usersRepository.findOne({ where: { id: adminId } });
    if (!admin || (admin.role !== UserRole.OWNER && admin.role !== UserRole.MOD)) {
      throw new ForbiddenException('Only owners and moderators can assign powers');
    }

    // Check if power exists
    const power = await this.powersRepository.findOne({
      where: { id: assignPowerDto.powerId }
    });

    if (!power) {
      throw new NotFoundException('Power not found');
    }

    // Check if user exists
    const user = await this.usersRepository.findOne({
      where: { id: assignPowerDto.userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has this power
    const existingUserPower = await this.userPowersRepository.findOne({
      where: {
        userId: assignPowerDto.userId,
        powerId: assignPowerDto.powerId,
        isActive: true
      }
    });

    if (existingUserPower) {
      throw new ConflictException('User already has this power');
    }

    const userPower = this.userPowersRepository.create({
      userId: assignPowerDto.userId,
      powerId: assignPowerDto.powerId,
      expiresAt: assignPowerDto.expiresAt,
      isActive: true
    });

    return this.userPowersRepository.save(userPower);
  }

  async removePower(adminId: string, removePowerDto: RemovePowerDto): Promise<void> {
    // Check if admin has permissions
    const admin = await this.usersRepository.findOne({ where: { id: adminId } });
    if (!admin || (admin.role !== UserRole.OWNER && admin.role !== UserRole.MOD)) {
      throw new ForbiddenException('Only owners and moderators can remove powers');
    }

    const userPower = await this.userPowersRepository.findOne({
      where: {
        userId: removePowerDto.userId,
        powerId: removePowerDto.powerId,
        isActive: true
      }
    });

    if (!userPower) {
      throw new NotFoundException('User does not have this power');
    }

    userPower.isActive = false;
    await this.userPowersRepository.save(userPower);
  }

  async getUserPowers(userId: string): Promise<UserPower[]> {
    try {
      const userPowers = await this.userPowersRepository.find({
        where: {
          userId,
          isActive: true
        },
        relations: ['power']
      });
      
      // Filter out any entries where power relation is null
      return userPowers.filter(up => up && up.power);
    } catch (error) {
      this.logger.error(`Error fetching user powers: ${error.message}`, error.stack);
      // Return empty array instead of throwing to prevent application crashes
      return [];
    }
  }

  async hasPower(userId: string, powerName: string): Promise<boolean> {
    try {
      if (!userId || !powerName) {
        return false;
      }
      
      const power = await this.powersRepository.findOne({
        where: { name: powerName }
      });
  
      if (!power) {
        return false;
      }
  
      const userPower = await this.userPowersRepository.findOne({
        where: {
          userId,
          powerId: power.id,
          isActive: true
        }
      });
  
      if (!userPower) {
        return false;
      }
  
      // Check if power has expired
      if (userPower.expiresAt && new Date() > userPower.expiresAt) {
        userPower.isActive = false;
        await this.userPowersRepository.save(userPower);
        return false;
      }
  
      return true;
    } catch (error) {
      this.logger.error(`Error checking if user has power: ${error.message}`, error.stack);
      return false; // Fail safely by returning false
    }
  }

  async getAllPowers(): Promise<Power[]> {
    return this.powersRepository.find({
      where: { isActive: true }
    });
  }

  async getPowerById(powerId: string): Promise<Power> {
    const power = await this.powersRepository.findOne({
      where: { id: powerId }
    });

    if (!power) {
      throw new NotFoundException('Power not found');
    }

    return power;
  }

  // This function will be called when a new user is created
  async assignDefaultPower(userId: string): Promise<void> {
    try {
      // First, ensure the 'everypower' exists
      let everypower = await this.powersRepository.findOne({
        where: { name: 'everypower' }
      });
  
      if (!everypower) {
        everypower = await this.createPower({
          name: 'everypower',
          description: 'Default power that allows users to customize their avatars'
        });
      }
  
      // Check if user already has this power
      const existingUserPower = await this.userPowersRepository.findOne({
        where: {
          userId: userId,
          powerId: everypower.id,
          isActive: true
        }
      });
  
      if (!existingUserPower) {
        // Assign the power to the new user
        const userPower = this.userPowersRepository.create({
          userId,
          powerId: everypower.id,
          isActive: true
        });
  
        await this.userPowersRepository.save(userPower);
        this.logger.log(`Assigned everypower to user ${userId}`);
      }
    } catch (error) {
      this.logger.error(`Error assigning default power to user ${userId}:`, error);
      // Don't throw the error to prevent registration failure
    }
  }
}