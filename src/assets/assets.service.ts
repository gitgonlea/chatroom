import { Injectable } from '@nestjs/common';
import { join } from 'path';
import * as fs from 'fs';

@Injectable()
export class AssetsService {
  getPawns() {
    const pawnsDir = join(__dirname, '..', '..', 'public', 'pawns');
    try {
      const files = fs.readdirSync(pawnsDir);
      const pawns = files
        .filter(file => file.endsWith('.png'))
        .map(file => {
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
