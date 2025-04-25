import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity()
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  text: string;

  @Column()
  username: string;

  @Column({ nullable: true })
  @Index()
  fromUserId: string;

  @Column({ nullable: true })
  @Index()
  toUserId: string;

  @Column({ default: false })
  @Index()
  isPrivate: boolean;

  @CreateDateColumn()
  @Index()
  timestamp: Date;

  @Column({ default: false })
  inGeneralChat: boolean; // Add this new field
}