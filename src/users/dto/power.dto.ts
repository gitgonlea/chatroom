// src/users/dto/power.dto.ts
import { IsNotEmpty, IsString, IsOptional, IsUUID, IsDate } from 'class-validator';

export class CreatePowerDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class AssignPowerDto {
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @IsNotEmpty()
  @IsUUID()
  powerId: string;

  @IsOptional()
  @IsDate()
  expiresAt?: Date;
}

export class RemovePowerDto {
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @IsNotEmpty()
  @IsUUID()
  powerId: string;
}