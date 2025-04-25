import { IsNotEmpty, IsString, MaxLength, MinLength, Matches } from 'class-validator';

export class CreateRoomDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_-]+$/, { 
    message: 'Room name can only contain letters, numbers, underscores and dashes' 
  })
  name: string;

  @IsString()
  @MaxLength(200)
  description?: string;
}