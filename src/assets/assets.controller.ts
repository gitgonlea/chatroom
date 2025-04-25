// In a controller file, e.g., assets.controller.ts
import { Controller, Get } from '@nestjs/common';
import { join } from 'path';
import * as fs from 'fs';

@Controller('assets')
export class AssetsController {
  @Get('pawns')
  getPawns() {
    const pawnsDir = join(__dirname, '..', '..', 'public', 'pawns');
    try {
      const files = fs.readdirSync(pawnsDir);
      const pawns = files.map(file => {
        const name = file.replace('.png', '');
        return {
          name,
          url: `/pawns/${file}`
        };
      });
      
      return pawns;
    } catch (error) {
      console.error('Error reading pawns directory:', error);
      return [];
    }
  }
}