import { IsNotEmpty, IsEnum } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class UpdateRoleDto {
  @IsNotEmpty()
  userId: string;

  @IsEnum(UserRole)
  role: UserRole;
}