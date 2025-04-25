// src/power-init.module.ts
import { Module, OnModuleInit } from '@nestjs/common';
import { PowerService } from './users/power.service';
import { UsersModule } from './users/users.module';

@Module({
  imports: [UsersModule],
})
export class PowerInitModule implements OnModuleInit {
  constructor(private readonly powerService: PowerService) {}

  async onModuleInit() {
    try {
      // Ensure the everypower exists
      const powers = await this.powerService.getAllPowers();
      const hasEverypower = powers.some(power => power.name === 'everypower');

      if (!hasEverypower) {
        await this.powerService.createPower({
          name: 'everypower',
          description: 'Default power that allows users to customize their avatars'
        });
        console.log('Created default everypower');
      }
    } catch (error) {
      console.error('Error initializing powers:', error);
    }
  }
}