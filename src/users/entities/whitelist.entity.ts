// src/users/entities/whitelist.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class Whitelist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true })
  addedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'added_by_id' })
  addedBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: true })
  isActive: boolean;
}