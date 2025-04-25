// src/users/entities/user-power.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Power } from './power.entity';

@Entity('user_powers')
export class UserPower {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  powerId: string;

  @ManyToOne(() => Power)
  @JoinColumn({ name: 'power_id' })
  power: Power;

  @CreateDateColumn()
  assignedAt: Date;

  @Column({ nullable: true })
  expiresAt: Date;

  @Column({ default: true })
  isActive: boolean;
}