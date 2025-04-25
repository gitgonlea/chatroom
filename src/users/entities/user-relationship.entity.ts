// src/users/entities/user-relationship.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum RelationshipType {
  FRIEND = 'friend',
  IGNORED = 'ignored'
}

@Entity()
export class UserRelationship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, user => user.relationships)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  relatedUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'related_user_id' })
  relatedUser: User;

  @Column({
    type: 'enum',
    enum: RelationshipType
  })
  type: RelationshipType;

  @CreateDateColumn()
  createdAt: Date;
}