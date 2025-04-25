// src/users/power.controller.ts
import { 
    Controller, 
    Get, 
    Post, 
    Delete, 
    Body, 
    Param, 
    UseGuards, 
    Request,
    HttpCode,
    HttpStatus 
  } from '@nestjs/common';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards';
  import { PowerService } from './power.service';
  import { CreatePowerDto, AssignPowerDto, RemovePowerDto } from './dto/power.dto';
  
  @Controller('powers')
  @UseGuards(JwtAuthGuard)
  export class PowerController {
    constructor(private readonly powerService: PowerService) {}
  
    @Post()
    async createPower(
      @Body() createPowerDto: CreatePowerDto,
    ) {
      return this.powerService.createPower(createPowerDto);
    }
  
    @Post('assign')
    async assignPower(
      @Request() req,
      @Body() assignPowerDto: AssignPowerDto,
    ) {
      return this.powerService.assignPower(req.user.userId, assignPowerDto);
    }
  
    @Delete('remove')
    @HttpCode(HttpStatus.NO_CONTENT)
    async removePower(
      @Request() req,
      @Body() removePowerDto: RemovePowerDto,
    ) {
      await this.powerService.removePower(req.user.userId, removePowerDto);
    }
  
    @Get('user/:userId')
    async getUserPowers(@Param('userId') userId: string) {
      const userPowers = await this.powerService.getUserPowers(userId);
      return userPowers.map(up => ({
        ...up,
        power: up.power ? {
          id: up.power.id,
          name: up.power.name,
          description: up.power.description
        } : null
      }));
    }
  
    @Get()
    async getAllPowers() {
      return this.powerService.getAllPowers();
    }
  
    @Get(':powerId')
    async getPowerById(@Param('powerId') powerId: string) {
      return this.powerService.getPowerById(powerId);
    }
  
    @Get('check/:powerName')
    async checkUserPower(
      @Request() req,
      @Param('powerName') powerName: string,
    ) {
      const hasPower = await this.powerService.hasPower(req.user.userId, powerName);
      return { hasPower };
    }
    
  }