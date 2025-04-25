// src/users/dto/create-user.dto.ts
import { IsEmail, IsNotEmpty, MinLength, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  username: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsOptional()
  avatar?: string;
}