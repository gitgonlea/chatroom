import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const logger = new Logger('Bootstrap');

  // Serve static files from the public directory
  app.useStaticAssets(join(__dirname, '..', 'public'));

  app.enableCors({
    origin: ['http://localhost:3000'], // Your frontend URL
    methods: ['GET', 'POST'],
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  await app.listen(port);
  logger.log(`Server running on http://localhost:${port}`);
}
bootstrap();