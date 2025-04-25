import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
  ) {}

  async saveMessage(message: Partial<Message>): Promise<Message> {
    try {
      const newMessage = this.messagesRepository.create(message);
      return await this.messagesRepository.save(newMessage);
    } catch (error) {
      this.logger.error(`Error saving message: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getGeneralMessages(limit = 50): Promise<Message[]> {
    try {
      return await this.messagesRepository.find({
        where: { isPrivate: false },
        order: { timestamp: 'DESC' },
        take: limit,
      });
    } catch (error) {
      this.logger.error(`Error getting general messages: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getPrivateMessages(user1Id: string, user2Id: string, limit = 50): Promise<Message[]> {
    try {
      return await this.messagesRepository.find({
        where: [
          { fromUserId: user1Id, toUserId: user2Id, isPrivate: true },
          { fromUserId: user2Id, toUserId: user1Id, isPrivate: true },
        ],
        order: { timestamp: 'DESC' }, 
        take: limit,
      });
    } catch (error) {
      this.logger.error(`Error getting private messages: ${error.message}`, error.stack);
      throw error;
    }
  }
}