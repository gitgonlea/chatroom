import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class UserBan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  bannedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'banned_by_id' })
  bannedBy: User;

  @Column()
  reason: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  expiresAt: Date;

  @Column({ default: false })
  isPermanent: boolean;

  @Column({ default: false })
  isRevoked: boolean;
}