// src/users/dto/relationship.dto.ts
import { IsNotEmpty, IsEnum } from 'class-validator';
import { RelationshipType } from '../entities/user-relationship.entity';

export class CreateRelationshipDto {
  @IsNotEmpty()
  relatedUserId: string;

  @IsEnum(RelationshipType)
  type: RelationshipType;
}