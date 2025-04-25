// src/auth/auth.controller.ts
import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guards';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard) 
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Request() req, @Body() loginDto: LoginDto) {
    // The user has already been validated by the LocalAuthGuard
    return this.authService.login(req.user);
  }
}