import { IsEmail, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class AddToWhitelistDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsOptional()
  userId?: string;
}

export class UpdateWhitelistDto {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}