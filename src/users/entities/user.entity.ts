// src/users/entities/user.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRelationship } from './user-relationship.entity';
import { UserPower } from './user-power.entity';  // Make sure this import is here

export enum UserRole {
  GUEST = 'guest',
  MEMBER = 'member',
  MOD = 'mod',
  OWNER = 'owner'
}

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.GUEST
  })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  avatar: string;

  @Column({ default: false })
  showStarPawn: boolean;

  @Column({ nullable: true })
  pawn: string;

  @OneToMany(() => UserRelationship, relationship => relationship.user)
  relationships: UserRelationship[];

  @OneToMany(() => UserPower, userPower => userPower.user)
  powers: UserPower[];
}