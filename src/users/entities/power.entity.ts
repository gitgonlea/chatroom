// src/users/entities/power.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { UserPower } from './user-power.entity';

@Entity('powers')
export class Power {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => UserPower, userPower => userPower.power)
  userPowers: UserPower[];
}