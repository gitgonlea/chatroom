// src/chat/chat.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, ForbiddenException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { UsersService } from '../users/users.service';
import { PowerService } from '../users/power.service';
import { RelationshipType } from '../users/entities/user-relationship.entity';
import { UserRole } from '../users/entities/user.entity';
import { BanUserDto } from '../users/dto/ban-user.dto';
import { UpdateRoleDto } from '../users/dto/update-role.dto';
import { MoreThan } from 'typeorm';
import { WhitelistGuard } from './guards/whitelist.guard';
import { UseGuards } from '@nestjs/common';

interface User {
  id: string;
  userId?: string;
  username: string;
  authenticated?: boolean;
  role?: UserRole;
  isBanned?: boolean; // Add this property
  avatar?: string;
  showStarPawn?: boolean;
  powers?: string[];
  pawn?: string; // Add this line
}

interface MessageDto {
  id: string;
  text: string;
  username: string;
  timestamp: string;
  inGeneralChat?: boolean;
}

interface PrivateMessageDto extends MessageDto {
  to: string;
  isPrivate?: boolean;
  inGeneralChat?: boolean;
}

@UseGuards(WhitelistGuard)
@WebSocketGateway({
  cors: {
    origin: '*', // In production, restrict this to your frontend domain
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private users: Map<string, User> = new Map();
  private lastMessageTimestamp: Map<string, number> = new Map();
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly powerService: PowerService,
  ) {}
  async handleConnection(client: Socket) {
    try {
      const username = client.handshake.query.username as string;
      const userId = client.handshake.query.userId as string;
      const token = client.handshake.auth?.token;
  
      console.log('Socket connection attempt:', { 
        clientId: client.id,
        username, 
        userId, 
        hasToken: !!token 
      });
      
      // Verify the token if provided
      let authenticated = false;
      if (token) {
        try {
          const payload = this.jwtService.verify(token);
          if (payload.sub === userId) {
            authenticated = true;
          }
        } catch (e) {
          this.logger.warn(`Invalid token provided: ${e.message}`);
        }
      }
      
      // If userId is provided, get the user from the database
      if (userId && authenticated) {
        const user = await this.usersService.findById(userId);
        if (user) {
          // Check if the user is banned, but DON'T disconnect
          const isBanned = await this.usersService.isUserBanned(userId);
          const userPowers = await this.powerService.getUserPowers(userId);
          const powerNames = userPowers
            .filter(up => up && up.power && up.power.name) // Filter out null or invalid powers
            .map(up => up.power.name);
          
          this.users.set(client.id, {
            id: client.id,
            userId: user.id,
            username: user.username,
            authenticated: true,
            role: user.role,
            isBanned: isBanned,
            avatar: user.avatar || undefined,
            showStarPawn: user.showStarPawn,
            powers: powerNames, // Now this is safe
            pawn: user.pawn || undefined
          });
          
          this.logger.log(`Authenticated user connected: ${client.id} (${user.username}, role: ${user.role}, banned: ${isBanned})`);
          
          // Send role to client
          client.emit('roleUpdated', { role: user.role });
          
          // If banned, notify the client (but don't disconnect)
          if (isBanned) {
            client.emit('userRestricted', { 
              type: 'ban',
              message: 'You are currently banned from sending messages' 
            });
          }
          
          // Check if the user is whitelisted
          const isWhitelisted = await this.usersService.isWhitelisted(user.email);
          console.log(`User ${user.username} whitelist status:`, isWhitelisted);
          if (!isWhitelisted && user.role !== UserRole.MOD && user.role !== UserRole.OWNER) {
            client.emit('notWhitelisted', { message: 'Your account is not whitelisted. Please contact an administrator.' });
            client.disconnect();
            return;
          }
          
          // Get user's friend list and send it
          const friends = await this.usersService.getFriends(userId);
          client.emit('friends', friends);
          
          // Get user's ignored list
          const ignoredUsers = await this.usersService.getIgnoredUsers(userId);
          client.emit('ignoredUsers', ignoredUsers);
        } else {
          // User ID not found, disconnect
          client.disconnect();
          return;
        }
      } else if (userId) {
        // User ID provided but not authenticated, disconnect
        client.disconnect();
        return;
      } else {
        // Guest users are no longer allowed with whitelist
        client.emit('notWhitelisted', { message: 'Guest access is not allowed. Please register with a whitelisted email.' });
        client.disconnect();
        return;
      }
      
      // Add debug to see current users in the map
      console.log(`Users map after adding new user. Map now has ${this.users.size} users`);
      console.log('Current users:', Array.from(this.users.entries())
        .map(([id, u]) => `${id}: ${u.username}`).join(', '));
      
      // Broadcast users AFTER the new user has been added to the map
      this.broadcastUsers();
      
      // Send historical messages
      /*const recentMessages = await this.chatService.getGeneralMessages();
      for (const message of recentMessages.reverse()) {
        client.emit('message', {
          id: message.id,
          text: message.text,
          username: message.username,
          timestamp: message.timestamp,
        });
      }*/
      
    } catch (error) {
      this.logger.error(`Error handling connection: ${error.message}`, error.stack);
      client.disconnect();
    }
  }
  
/*
  async handleConnection(client: Socket) {
    try {
      const username = client.handshake.query.username as string;
      const userId = client.handshake.query.userId as string;
      const token = client.handshake.auth?.token;
      
      // Verify the token if provided
      let authenticated = false;
      if (token) {
        try {
          const payload = this.jwtService.verify(token);
          if (payload.sub === userId) {
            authenticated = true;
          }
        } catch (e) {
          this.logger.warn(`Invalid token provided: ${e.message}`);
        }
      }
      
      // If userId is provided, get the user from the database
      if (userId && authenticated) {
        const user = await this.usersService.findById(userId);
        if (user) {
          // Check if the user is banned
          const isBanned = await this.usersService.isUserBanned(userId);
          if (isBanned) {
            client.emit('banned');
            client.disconnect();
            return;
          }
          
          this.users.set(client.id, {
            id: client.id,
            userId: user.id,
            username: user.username,
            authenticated: true,
            role: user.role, // Store the user's role
          });
          
          this.logger.log(`Authenticated user connected: ${client.id} (${user.username}, role: ${user.role})`);
          
          // Send role to client
          client.emit('roleUpdated', { role: user.role });
          
          // Get user's friend list and send it
          const friends = await this.usersService.getFriends(userId);
          client.emit('friends', friends);
          
          // Get user's ignored list
          const ignoredUsers = await this.usersService.getIgnoredUsers(userId);
          client.emit('ignoredUsers', ignoredUsers);
        } else {
          // User ID not found, disconnect
          client.disconnect();
          return;
        }
      } else if (userId) {
        // User ID provided but not authenticated, disconnect
        client.disconnect();
        return;
      } else {
        // Guest user
        this.users.set(client.id, {
          id: client.id,
          username: username || `Guest_${client.id.substr(0, 5)}`,
          authenticated: false,
          role: UserRole.GUEST, // Guests have GUEST role by default
        });
        
        // Send role to client
        client.emit('roleUpdated', { role: UserRole.GUEST });
        
        this.logger.log(`Guest user connected: ${client.id} (${username})`);
      }
      
      // Broadcast updated users list
      this.broadcastUsers();
      
      // Send recent general messages to the client
      const recentMessages = await this.chatService.getGeneralMessages();
      for (const message of recentMessages.reverse()) {
        client.emit('message', {
          id: message.id,
          text: message.text,
          username: message.username,
          timestamp: message.timestamp,
        });
      }
    } catch (error) {
      this.logger.error(`Error handling connection: ${error.message}`, error.stack);
      client.disconnect();
    }
  }*/

  handleDisconnect(client: Socket) {
    try {
      // Get user before removing
      const user = this.users.get(client.id);
      
      // Remove user from the list
      this.users.delete(client.id);
      this.lastMessageTimestamp.delete(client.id);
      
      if (user) {
        this.logger.log(`Client disconnected: ${client.id} (${user.username})`);
      } else {
        this.logger.log(`Client disconnected: ${client.id}`);
      }
      
      // Broadcast updated users list
      this.broadcastUsers();
    } catch (error) {
      this.logger.error(`Error handling disconnection: ${error.message}`, error.stack);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MessageDto,
  ) {
    try {
      const user = this.users.get(client.id);
      if (!user) {
        this.logger.warn(`Message from unknown user: ${client.id}`);
        return;
      }
      
      // Check if the user is banned
      if (user.isBanned) {
        client.emit('error', { message: 'You are currently banned from sending messages' });
        return;
      }
      
      // Get full user with role information
      const fullUser = user.userId ? await this.usersService.findById(user.userId) : null;
      const userRole = fullUser ? fullUser.role : UserRole.GUEST;
      
      // Anti-flood check - different cooldowns based on role
      const now = Date.now();
      const lastMessageTime = this.lastMessageTimestamp.get(client.id) || 0;
      const timeSinceLastMessage = now - lastMessageTime;
      
      // Set cooldowns based on role (in milliseconds)
      const cooldowns = {
        [UserRole.GUEST]: 3000,  // 3 seconds for guests
        [UserRole.MEMBER]: 1000, // 1 second for members
        [UserRole.MOD]: 500,     // 0.5 seconds for mods
        [UserRole.OWNER]: 0      // No cooldown for owner
      };
      
      const userCooldown = cooldowns[userRole];
      
      if (timeSinceLastMessage < userCooldown) {
        client.emit('error', { 
          message: `Please wait ${Math.ceil((userCooldown - timeSinceLastMessage) / 1000)} seconds before sending another message` 
        });
        return;
      }
      
      // Update last message timestamp
      this.lastMessageTimestamp.set(client.id, now);
      
      // Link check for general chat
      if (payload.inGeneralChat) {
        // Simple link detection regex
        const linkRegex = /(https?:\/\/[^\s]+)/g;
        const containsLinks = linkRegex.test(payload.text);
        
        if (containsLinks && userRole === UserRole.GUEST) {
          client.emit('error', { message: 'Guests cannot send links in the general chat' });
          return;
        }
      }
      
      // Save message to database
      
      /*await this.chatService.saveMessage({
        id: payload.id,
        text: payload.text,
        username: user.username,
        fromUserId: client.id,
        isPrivate: false,
      });*/
      
      // Get list of users who have ignored this sender
      let ignoringUsers: string[] = [];
      if (user.userId) {
        // Get all connected users with their DB user IDs
        const connectedUsers = Array.from(this.users.values())
          .filter(u => u.userId && u.userId !== user.userId);
        
        // For each connected user, check if they've ignored this sender
        for (const connectedUser of connectedUsers) {
          if (connectedUser.userId) {
            const isIgnored = await this.usersService.isUserIgnored(
              connectedUser.userId,
              user.userId
            );
            if (isIgnored) {
              ignoringUsers.push(connectedUser.id);
            }
          }
        }
      }
      
      // Broadcast message to all clients except those who ignored the sender
      this.server.sockets.sockets.forEach(socket => {
        if (!ignoringUsers.includes(socket.id)) {
          socket.emit('message', {
            ...payload,
            username: user.username,
            from: client.id,
            role: userRole, // Add role to message
          });
        }
      });
      
      this.logger.debug(`General message from ${user.username}: ${payload.text.substring(0, 30)}...`);
    } catch (error) {
      this.logger.error(`Error handling message: ${error.message}`, error.stack);
    }
  }

  @SubscribeMessage('generalPrivateMessage')
  async handleGeneralPrivateMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: PrivateMessageDto,
  ) {
    try {
      const user = this.users.get(client.id);
      if (!user) {
        this.logger.warn(`Private message from unknown user: ${client.id}`);
        return;
      }
      
      // Check if the user is banned
      if (user.userId) {
        const isBanned = await this.usersService.isUserBanned(user.userId);
        if (isBanned) {
          client.emit('error', { message: 'You are currently banned from sending messages' });
          return;
        }
      }
      
      // Get full user with role information
      const fullUser = user.userId ? await this.usersService.findById(user.userId) : null;
      const userRole = fullUser ? fullUser.role : UserRole.GUEST;
      
      // Anti-flood check - same as regular messages
      const now = Date.now();
      const lastMessageTime = this.lastMessageTimestamp.get(client.id) || 0;
      const timeSinceLastMessage = now - lastMessageTime;
      
      const cooldowns = {
        [UserRole.GUEST]: 3000,
        [UserRole.MEMBER]: 1000,
        [UserRole.MOD]: 500,
        [UserRole.OWNER]: 0
      };
      
      const userCooldown = cooldowns[userRole];
      
      if (timeSinceLastMessage < userCooldown) {
        client.emit('error', { 
          message: `Please wait ${Math.ceil((userCooldown - timeSinceLastMessage) / 1000)} seconds before sending another message` 
        });
        return;
      }
      
      // Update last message timestamp
      this.lastMessageTimestamp.set(client.id, now);
      
      const recipientId = payload.to;
      
      // Check if recipient exists
      if (!this.users.has(recipientId)) {
        this.logger.warn(`Private message to unknown recipient: ${recipientId}`);
        return;
      }
      
      const recipient = this.users.get(recipientId);
      
      // Save message to database
      /*await this.chatService.saveMessage({
        id: payload.id,
        text: payload.text,
        username: user.username,
        fromUserId: client.id,
        toUserId: recipientId,
        isPrivate: true,
        inGeneralChat: true,
      });*/
      
      // Send to recipient's general chat
      this.server.to(recipientId).emit('message', {
        ...payload,
        from: client.id,
        to: recipientId,
        username: user.username,
        isPrivate: true,
        privateMessage: true,
        inGeneralChat: true,
        role: userRole, // Add role to message
      });
      
      // Send confirmation back to sender's general chat
      client.emit('message', {
        ...payload,
        from: client.id,
        to: recipientId,
        username: user.username,
        isPrivate: true,
        privateMessage: true,
        inGeneralChat: true,
        role: userRole, // Add role to message
      });
      
      this.logger.debug(`General private message from ${user.username} to ${recipient?.username}: ${payload.text.substring(0, 30)}...`);
    } catch (error) {
      this.logger.error(`Error handling general private message: ${error.message}`, error.stack);
    }
  }
  
  @SubscribeMessage('sendPrivateMessage')
  async handlePrivateMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: PrivateMessageDto,
  ) {
    try {
      const user = this.users.get(client.id);
      if (!user) {
        this.logger.warn(`Private message from unknown user: ${client.id}`);
        return;
      }
      
      // Check if the user is banned
      if (user.userId) {
        const isBanned = await this.usersService.isUserBanned(user.userId);
        if (isBanned) {
          client.emit('error', { message: 'You are currently banned from sending messages' });
          return;
        }
      }
      
      // Get full user with role information
      const fullUser = user.userId ? await this.usersService.findById(user.userId) : null;
      const userRole = fullUser ? fullUser.role : UserRole.GUEST;
      
      // Anti-flood check - same as regular messages
      const now = Date.now();
      const lastMessageTime = this.lastMessageTimestamp.get(client.id) || 0;
      const timeSinceLastMessage = now - lastMessageTime;
      
      const cooldowns = {
        [UserRole.GUEST]: 3000,
        [UserRole.MEMBER]: 1000,
        [UserRole.MOD]: 500,
        [UserRole.OWNER]: 0
      };
      
      const userCooldown = cooldowns[userRole];
      
      if (timeSinceLastMessage < userCooldown) {
        client.emit('error', { 
          message: `Please wait ${Math.ceil((userCooldown - timeSinceLastMessage) / 1000)} seconds before sending another message` 
        });
        return;
      }
      
      // Update last message timestamp
      this.lastMessageTimestamp.set(client.id, now);
      
      const recipientId = payload.to;
      
      // Check if recipient exists
      if (!this.users.has(recipientId)) {
        this.logger.warn(`Private message to unknown recipient: ${recipientId}`);
        return;
      }
      
      const recipient = this.users.get(recipientId);
      
      // Link check for private messages - guests can't send links in private messages either
      if (userRole === UserRole.GUEST) {
        const linkRegex = /(https?:\/\/[^\s]+)/g;
        const containsLinks = linkRegex.test(payload.text);
        
        if (containsLinks) {
          client.emit('error', { message: 'Guests cannot send links in messages' });
          return;
        }
      }
      
      // Save message to database
      /*await this.chatService.saveMessage({
        id: payload.id,
        text: payload.text,
        username: user.username,
        fromUserId: client.id,
        toUserId: recipientId,
        isPrivate: true,
      });*/
      
      // Send message to recipient
      this.server.to(recipientId).emit('privateMessage', {
        ...payload,
        from: client.id,
        to: recipientId,
        username: user.username,
        isPrivate: true,
        role: userRole, // Add role to message
      });
      
      // Send confirmation back to sender
      client.emit('privateMessage', {
        ...payload,
        from: client.id,
        to: recipientId,
        username: user.username,
        isPrivate: true,
        role: userRole, // Add role to message
      });
      
      this.logger.debug(`Private message from ${user.username} to ${recipient?.username}: ${payload.text.substring(0, 30)}...`);
    } catch (error) {
      this.logger.error(`Error handling private message: ${error.message}`, error.stack);
    }
  }
  
  @SubscribeMessage('kickUser')
  async handleKickUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() { userId }: { userId: string },
  ) {
    try {
      const moderator = this.users.get(client.id);
      if (!moderator || !moderator.userId || !moderator.authenticated) {
        this.logger.warn(`Unauthorized kick request from: ${client.id}`);
        return;
      }
      
      // Check moderator permissions
      const moderatorUser = await this.usersService.findById(moderator.userId);
      if (!moderatorUser || (moderatorUser.role !== UserRole.MOD && moderatorUser.role !== UserRole.OWNER)) {
        this.logger.warn(`Non-moderator tried to kick user: ${client.id}`);
        return;
      }
      
      // Get the user to kick
      const userToKick = Array.from(this.users.values()).find(u => u.id === userId);
      if (!userToKick) {
        return;
      }
      
      // If the user to kick is a mod or owner, only owner can kick them
      if (userToKick.userId) {
        const targetUser = await this.usersService.findById(userToKick.userId);
        if (targetUser && 
            (targetUser.role === UserRole.MOD || targetUser.role === UserRole.OWNER) && 
            moderatorUser.role !== UserRole.OWNER) {
          this.logger.warn(`Mod attempted to kick another mod or owner: ${client.id}`);
          return;
        }
      }
      
      // Notify user they've been kicked
      this.server.to(userId).emit('kicked');
      
      // Disconnect the user
      const userSocket = this.server.sockets.sockets.get(userId);
      if (userSocket) {
        userSocket.disconnect(true);
      }
      
      this.logger.log(`User ${userToKick.username} was kicked by ${moderator.username}`);
    } catch (error) {
      this.logger.error(`Error handling kick user: ${error.message}`, error.stack);
    }
  }
  @SubscribeMessage('banUser')
  async handleBanUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: string, hours?: number, isPermanent?: boolean, reason: string },
  ) {
    try {
      // Find the target user's database ID from their socket ID
      const targetUser = this.users.get(payload.userId);
      if (!targetUser || !targetUser.userId) {
        client.emit('error', { message: 'User not found or not authenticated' });
        return;
      }
  
      const moderator = this.users.get(client.id);
      if (!moderator || !moderator.userId || !moderator.authenticated) {
        this.logger.warn(`Unauthorized ban request from: ${client.id}`);
        client.emit('error', { message: 'Unauthorized: You do not have permission to ban users' });
        return;
      }
      
      // Create ban using the database IDs
      const banResult = await this.usersService.banUser(
        moderator.userId, 
        {
          userId: targetUser.userId,
          reason: payload.reason,
          hours: payload.hours,
          isPermanent: payload.isPermanent
        }
      );
      
      if (banResult) {
        // Update the user's banned status in our map
        targetUser.isBanned = true;
        
        // Notify user they've been banned (but don't disconnect)
        this.server.to(payload.userId).emit('userRestricted', { 
          type: 'ban',
          message: `You have been banned by a moderator. Reason: ${payload.reason}` 
        });
        
        this.logger.log(`User ${targetUser.username} was banned by ${moderator.username}`);
        
        // Broadcast updated users list to update UI for all users
        this.broadcastUsers();
        
        // Send confirmation to moderator
        client.emit('banSuccess', { message: `User ${targetUser.username} has been banned` });
      } else {
        client.emit('error', { message: 'Failed to ban user' });
      }
    } catch (error) {
      console.error('Error banning user:', error);
      client.emit('error', { message: `Error banning user: ${error.message}` });
      this.logger.error(`Error handling ban user: ${error.message}`, error.stack);
    }
  }
  @SubscribeMessage('updateUserRole')
  @SubscribeMessage('updateUserRole')

  
@SubscribeMessage('updateUserRole')
async handleUpdateUserRole(
  @ConnectedSocket() client: Socket,
  @MessageBody() payload: { userId: string, role: UserRole },
) {
  try {
    // Find the target user's database ID from their socket ID
    const targetUser = this.users.get(payload.userId);
    if (!targetUser || !targetUser.userId) {
      client.emit('error', { message: 'User not found or not authenticated' });
      return;
    }

    const moderator = this.users.get(client.id);
    if (!moderator || !moderator.userId || !moderator.authenticated) {
      this.logger.warn(`Unauthorized role update request from: ${client.id}`);
      client.emit('error', { message: 'Unauthorized: You do not have permission to update roles' });
      return;
    }
    
    // Update role using the database IDs, not socket IDs
    const updateResult = await this.usersService.updateUserRole(
      moderator.userId,
      {
        userId: targetUser.userId, // Use database ID instead of socket ID
        role: payload.role
      }
    );
    
    if (updateResult) {
      // Notify the user their role was updated
      this.server.to(payload.userId).emit('roleUpdated', { role: payload.role });
      
      // Update the user's role in the users map
      targetUser.role = payload.role;
      
      // Broadcast updated users list
      this.broadcastUsers();
      
      this.logger.log(`User role updated: ${targetUser.userId} is now ${payload.role} (by ${moderator.username})`);
      
      // Send confirmation to moderator
      client.emit('roleUpdateSuccess', { message: `User role has been updated to ${payload.role}` });
    } else {
      client.emit('error', { message: 'Failed to update user role' });
    }
  } catch (error) {
    console.error('Error updating role:', error);
    client.emit('error', { message: `Error updating role: ${error.message}` });
    this.logger.error(`Error handling update user role: ${error.message}`, error.stack);
  }

  }/*

  private broadcastUsers() {
    const usersList = Array.from(this.users.values()).map(user => ({
      id: user.id,
      username: user.username,
      role: user.role || UserRole.GUEST,
    }));
    this.server.emit('users', usersList);
  }*/

/*private broadcastUsers() {
      // Make sure we're sending ALL users from the map
      console.log(`Broadcasting ${this.users.size} users`);
      console.log('Users in map:', Array.from(this.users.entries()));
      
      const usersList = Array.from(this.users.values()).map(user => ({
        id: user.id,
        username: user.username,
        role: user.role || UserRole.GUEST,
      }));
      
      console.log('Broadcasting users list:', usersList);
      this.server.emit('users', usersList);
    }*/

      private broadcastUsers() {
        const usersList = Array.from(this.users.values()).map(user => ({
          id: user.id,
          username: user.username,
          role: user.role || UserRole.GUEST,
          isBanned: user.isBanned || false,
          avatar: user.avatar,// Include avatar in the broadcast
          showStarPawn: user.showStarPawn || false,
          pawn: user.pawn
        }));
        this.server.emit('users', usersList);
      }

  @SubscribeMessage('unignoreUser')
async handleUnignoreUser(
  @ConnectedSocket() client: Socket,
  @MessageBody() { userId }: { userId: string },
) {
  try {
    const user = this.users.get(client.id);
    if (!user || !user.userId || !user.authenticated) {
      this.logger.warn(`Unauthorized unignore request from: ${client.id}`);
      return;
    }
    
    // Remove ignore relationship
    await this.usersService.removeRelationship(user.userId, userId);
    
    // Get updated ignored list
    const ignoredUsers = await this.usersService.getIgnoredUsers(user.userId);
    
    // Send updated ignored list to client
    client.emit('ignoredUsers', ignoredUsers);
    
    this.logger.debug(`User ${user.username} unignored ${userId}`);
  } catch (error) {
    this.logger.error(`Error handling unignore user: ${error.message}`, error.stack);
  }
  
}
@SubscribeMessage('updateUsername')
async handleUpdateUsername(
  @ConnectedSocket() client: Socket,
  @MessageBody() payload: { newUsername: string },
) {
  try {
    const user = this.users.get(client.id);
    if (!user) {
      this.logger.warn(`Username update from unknown user: ${client.id}`);
      return;
    }
    
    // Update username in the users map
    user.username = payload.newUsername;
    
    // Broadcast updated users list
    this.broadcastUsers();
    
    this.logger.log(`User ${client.id} changed username to ${payload.newUsername}`);
  } catch (error) {
    this.logger.error(`Error handling username update: ${error.message}`, error.stack);
  }
}

@SubscribeMessage('updateAvatar')
async handleUpdateAvatar(
  @ConnectedSocket() client: Socket,
  @MessageBody() payload: { avatarId: string },
) {
  try {
    const user = this.users.get(client.id);
    if (!user) {
      this.logger.warn(`Avatar update from unknown user: ${client.id}`);
      return;
    }
    
    // Add avatar property to the user object
    user.avatar = payload.avatarId;
    
    // Save to database if user is authenticated
    if (user.userId && user.authenticated) {
      try {
        await this.usersService.updateAvatar(user.userId, payload.avatarId);
        this.logger.log(`Saved avatar to database for user ${user.username}`);
      } catch (dbError) {
        this.logger.error(`Failed to save avatar to database: ${dbError.message}`);
      }
    }
    
    // Broadcast updated users list
    this.broadcastUsers();
    
    this.logger.log(`User ${client.id} changed avatar to ${payload.avatarId}`);
  } catch (error) {
    this.logger.error(`Error handling avatar update: ${error.message}`, error.stack);
  }
}

@SubscribeMessage('updateStarPawn')
async handleUpdateStarPawn(
  @ConnectedSocket() client: Socket,
  @MessageBody() payload: { showStarPawn: boolean },
) {
  try {
    const user = this.users.get(client.id);
    if (!user) {
      this.logger.warn(`Star pawn update from unknown user: ${client.id}`);
      return;
    }
    
    // Update showStarPawn property in the local user object
    user.showStarPawn = payload.showStarPawn;
    
    // Save to database if the user is authenticated
    if (user.userId && user.authenticated) {
      try {
        await this.usersService.updateStarPawn(user.userId, payload.showStarPawn);
        this.logger.log(`Saved star pawn setting to database for user ${user.username}`);
      } catch (dbError) {
        this.logger.error(`Failed to save star pawn setting to database: ${dbError.message}`);
      }
    }
    
    // Broadcast the updated user to all clients
    this.server.emit('userUpdated', {
      id: client.id,
      showStarPawn: payload.showStarPawn
    });
    
    // Also broadcast users to ensure everyone has the updated data
    this.broadcastUsers();
    
    this.logger.log(`User ${client.id} (${user.username}) changed star pawn setting to ${payload.showStarPawn}`);
  } catch (error) {
    this.logger.error(`Error handling star pawn update: ${error.message}`, error.stack);
  }
}
@SubscribeMessage('updatePawn')
async handleUpdatePawn(
  @ConnectedSocket() client: Socket,
  @MessageBody() payload: { pawnType: string },
) {
  try {
    const user = this.users.get(client.id);
    if (!user) {
      this.logger.warn(`Pawn update from unknown user: ${client.id}`);
      return;
    }
    
    this.logger.log(`Updating pawn for user ${user.username} to ${payload.pawnType}`);
    
    // Update pawn in the local user object
    user.pawn = payload.pawnType;
    
    // Save to database if user is authenticated
    if (user.userId && user.authenticated) {
      try {
        const updatedUser = await this.usersService.updatePawn(user.userId, payload.pawnType);
        this.logger.log(`Saved pawn to database for user ${user.username}: ${updatedUser.pawn}`);
        
        // Print the updated user for debugging
        console.log('Updated user in database:', {
          id: updatedUser.id,
          username: updatedUser.username,
          pawn: updatedUser.pawn
        });
      } catch (dbError) {
        this.logger.error(`Failed to save pawn to database: ${dbError.message}`);
        throw dbError; // Re-throw to be caught by outer try/catch
      }
    }
    
    // Broadcast updated users list
    this.broadcastUsers();
    
    // Send a direct update notification to the client
    client.emit('userUpdated', {
      id: client.id,
      pawn: payload.pawnType
    });
    
    this.logger.log(`User ${client.id} (${user.username}) changed pawn to ${payload.pawnType}`);
  } catch (error) {
    this.logger.error(`Error handling pawn update: ${error.message}`, error.stack);
    // Send error back to client
    client.emit('error', { message: `Failed to update pawn: ${error.message}` });
  }
}
@SubscribeMessage('requestUserUpdate')
async handleRequestUserUpdate(@ConnectedSocket() client: Socket) {
  try {
    // Find the user in our users map
    const user = this.users.get(client.id);
    if (!user || !user.userId) {
      console.log('User not found for update request');
      return;
    }
    
    // Fetch the latest user data from the database
    const updatedUserData = await this.usersService.findById(user.userId);
    if (!updatedUserData) {
      console.log('User not found in database');
      return;
    }
    
    // Update the user in the users map
    user.pawn = updatedUserData.pawn;
    user.avatar = updatedUserData.avatar;
    user.showStarPawn = updatedUserData.showStarPawn;
    
    console.log(`Updated user ${user.username} with latest data:`, {
      pawn: user.pawn,
      avatar: user.avatar,
      showStarPawn: user.showStarPawn
    });
    
    // Broadcast updated users list
    this.broadcastUsers();
    
    // Send confirmation to the client
    client.emit('userUpdated', {
      id: client.id,
      pawn: user.pawn,
      avatar: user.avatar,
      showStarPawn: user.showStarPawn,
      powers: user.powers
    });
  } catch (error) {
    console.error('Error handling user update request:', error);
  }
}

}