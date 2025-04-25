import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/users.service';
import { Socket } from 'socket.io';

@Injectable()
export class WhitelistGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = client.handshake.auth?.token;
    
    console.log('WhitelistGuard: checking access, token exists:', !!token);
    
    // If no token, deny connection
    if (!token) {
      console.log('WhitelistGuard: no token, access denied');
      return false; // Change this to false to deny unauthenticated users
    }
    
    try {
      // Verify the token
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;
      console.log('WhitelistGuard: token verified, userId:', userId);
      
      // Get the user
      const user = await this.usersService.findById(userId);
      if (!user) {
        console.log('WhitelistGuard: user not found, access denied');
        return false; // Change this to false to deny non-existent users
      }
      
      console.log('WhitelistGuard: user found, role:', user.role);
      if (payload.role === 'owner' || payload.role === 'mod') {
        console.log('User is admin/mod based on token payload');
        return true;
      }
      // If user is admin or moderator, always allow
      if (user.role === 'owner' || user.role === 'mod') {
        console.log('WhitelistGuard: user is admin or mod, access granted');
        return true;
      }
      
      // Check if user's email is whitelisted
      const isWhitelisted = await this.usersService.isWhitelisted(user.email);
      console.log('WhitelistGuard: whitelist check result:', isWhitelisted);
      
      // CHANGE THIS LINE - return the actual whitelist check result instead of always true
      return isWhitelisted; // This enforces the whitelist check
    } catch (e) {
      console.error('WhitelistGuard error:', e);
      return false; // Change this to false to deny access on errors
    }
  }
}