import { IsNotEmpty, IsOptional, IsNumber, Min, Max, IsBoolean } from 'class-validator';

export class BanUserDto {
  @IsNotEmpty()
  userId: string;

  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(6)
  hours?: number;

  @IsOptional()
  @IsBoolean()
  isPermanent?: boolean;
}